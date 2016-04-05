
var moment = require("moment");
var async = require("async");

var constants = require("../common/constants");
var PipelineLogic = require("../proxy/pipeline-logic-interface");

function query(config, options) {
  
  var pipelineLogic = options.pipelineLogic || new PipelineLogic(config);
  var queueIn = null; 
  var queueOut = null;

  // this function is called by the worker after it is initialized
  function initializeQueues(queueInObj, queueOutObj) {
    queueIn = queueInObj;
    queueOut = queueOutObj;
  }

  function processMessage(message, cb) {
    var data = message && message.data || {};

    message.log('requestType', message.requestType);
    switch(message.requestType) {
      case (constants.queues.action.TRIGGER) :
        return trigger();
      case (constants.queues.action.REPROCESS) :
        return reprocess();
      default:
        message.error('message should not appear in this queue, deleting...', message);
        return cb();
    }

    function trigger() {
      return queryNewDocumentIds(data, function (err) {
        if (err) {
          message.error('error while processing trigger message', err);
          return cb(err);
        }
        return cb();
      });
      
      function queryNewDocumentIds(data, cb) {
        // Checking that a message returned from the queue
        // if no message was returned, the queue is empty
        var toDate = data.to ? moment(data.to) : moment();
        var fromDate = data.from ? moment(data.from) : moment().add(-3, 'days'); // TODO: change to 0 days (only today)
        message.info('getting papers from %s to %s', fromDate.format('YYYY-MM-DD'), toDate.format('YYYY-MM-DD'));
        
        // Run query for document in specific date
        return pipelineLogic.getNewUnprocessedDocumentIDs(fromDate.toDate(), toDate.toDate(), function (err, documents) {
          if (err) {
            message.error('There were several errors while retrieving the papers.');
            return cb(err);
          }
          
          if (!documents || !Array.isArray(documents)) {
            message.warning('Returned data is not an array');
            return cb();
          }
          
          message.info('Found %s new documents', documents.length);
          
          // Queue all new document ids
          async.eachLimit(documents, 50, enqueueDocument, function (err) {
            if (err) {
              message.error('failed to queue messages for documents.');
              return cb(err);
            }
            
            // Test Dependency:
            // The following message is used as part of E2E testing
            message.info(constants.logMessages.query.doneQueuing);
            return cb();
          });
          
          return message.info('Completed iterating through retrieved documents, waiting for results to complete...');
        });
      }
    }
    
    function reprocess() {
      message.info('starting documents reprocessing request');
    
      // reprocess all sentences
      var rowCount = 0;
      return db.getDocuments({
          batchSize: config.sql.batchSize,
          rowHandler: rowHandler
        },
        function (err) { 
          if (err) {
            message.error('error while processing reprocessing message', err);
            return cb(err);
          }
          message.info('reprocessing request deleted from queue, %s documents sent for reprocessing', rowCount);
          return cb();
      });
      
      function rowHandler(row) {
        rowCount++;
        var doc = {
          docId: row.Id,
          sourceId: row.SourceId
        };
        return enqueueDocument(doc, function(err){
          if (err) return cb(err);
        });
      }
    }
    
    function enqueueDocument(doc, cb) {
      var msg = {
        requestType: constants.queues.action.GET_DOCUMENT,
        data: {
          docId: doc.docId,
          sourceId: doc.sourceId
        }
      };
      
      return queueOut.sendMessage(msg, function (err) {
        if (err) {
          message.error('There was an error queuing a document.');
          return cb(err);
        }
        
        // Test Dependency:
        // The following message is used as part of E2E testing
        message.log(constants.logMessages.query.queueDocFormat, doc.docId, doc.sourceId)
        return cb();
      });
    }
  }

  return {
    processMessage: processMessage,
    initializeQueues: initializeQueues,
    queueInName: config.queues.trigger_query,
    queueOutName: config.queues.new_ids
  };
}

module.exports = query;