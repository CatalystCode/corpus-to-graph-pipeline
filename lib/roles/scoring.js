var async = require('async');

var constants = require('../common/constants');
var Database = require('../common/sql-database');
var PipelineLogic = require('../proxy/pipeline-logic-interface');

function scoring(config, options) {
  
  var pipelineLogic = options.pipelineLogic || new PipelineLogic(config);
  var db = options.database || new Database(config.sql);
  var queueIn = null; 
  var queueOut = null;

  // this function is called by the worker after it is initialized
  function initializeQueues(queueInObj, queueOutObj) {
    queueIn = queueInObj;
    queueOut = queueOutObj;
  }
    
  function processMessage(message, cb) {

    var data = message && message.data;
    if (!data) {
      message.error('message does not contain data field, deleting...', message);
      return cb();
    }
    
    message.log('requestType', message.requestType);
    switch(message.requestType) {
      case (constants.queues.action.SCORE) :
        return score();
      case (constants.queues.action.LAST_ITEM_TO_SCORE) :
        return markLastItem();
      case (constants.queues.action.RESCORE) :
        return rescore();
      default:
        message.error('message should not appear in this queue, deleting...', message);
        return cb();
    }

    // scoring handler
    function score() {
      
      
      return pipelineLogic.getScoring(message, function (err, result) {
        // if we had an error getting the scoring for the message,
        // we'll return and hopefully the message will be scored the next
        // time we try...
        if (err) {
          message.error('error getting scoring for message', err);
          return cb(err);
        }

        if (!result.relations || !result.relations.length) {
          message.error('scorer didn\'t return relations for sentence', data, result);

          // Two options are available in case of no relations:
          // 1) Delete the message from the queue (call callback without error) 
          // 2) Leave message in queue for reprocessing (call callback with error)
          // 
          // Currently: Message will be deleted from queue 
          return cb();
        }

        data.entities = result.entities;
        data.relations = result.relations;
        
        // insert relations into db
        return db.upsertRelations(data, function (err) {
          
          // if we had an error inserting into db, we don't want to delete from the queue,
          // just return and hopefully the next iteration will work.
          // the item will stay in the queue until it will be processed.
          if (err) {
            message.error('error updating relation in db', err)
            return cb(err);
          }
          
          // item was processed and saved in db successfully- delete from queue
          return cb();
        });
      });
    }
    
    // markLastItem handler
    function markLastItem() {
      // update document status to Processed
      return db.updateDocumentStatus({
          sourceId: data.sourceId,
          docId: data.docId,
          statusId: constants.documentStatus.PROCESSED
        },
        function (err) { 
          if (err) return cb(err);
          return cb();
      });
    }
    
    // rescoring handler
    function rescore() {
      message.info('starting rescoring request');
      
      // rescore all sentences
      var rowCount = 0;
      return db.getSentences({
          batchSize: config.sql.batchSize,
          rowHandler: rowHandler
        },
        function (err) { 
          if (err) return cb(err);
          message.info('rescoring request deleted from queue, %s sentences sent for rescoring', rowCount);
          return cb();
      });
      
      function rowHandler(row) {
        rowCount++;
        var scoringMessage = {
            requestType: constants.queues.action.SCORE,
            data: {
              sourceId: row.SourceId,
              docId: row.DocId,
              sentenceIndex: row.SentenceIndex,
              sentence: row.Sentence,
              mentions: JSON.parse(row.MentionsJson)
          }
        };
        return queueIn.sendMessage(scoringMessage, function (err) {
          if (err) {
            message.error('failed to queue rescoring item', scoringMessage);
            return cb(err);
          }
        });
      }
    }
  };

  return {
    processMessage: processMessage,
    initializeQueues: initializeQueues,
    queueInName: config.queues.scoring
  };
}

module.exports = scoring;