var async = require('async');

var constants = require('../common/constants');
var Database = require("../common/sql-database");
var PipelineLogic = require("../proxy/pipeline-logic-interface");

function parser(config, options) {

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
    var docId = parseInt(data.docId);
    var sourceId = data.sourceId;
    
    message.info("processing document: source: %s, id: %s", sourceId, docId);
    
    // Add a "Processing" status to document
    return db.upsertDocument({
        sourceId: sourceId,
        docId: docId,
        statusId: constants.documentStatus.PROCESSING    
      }, 
      function (err, result) {
        if (err) {
            message.error('there was an error inserting document row into database.');
            return cb(err);
        }
        
        message.log('searching for sentences...');
        
        return pipelineLogic.getDocumentSentences(docId, sourceId, function (err, sentencesArray) {
          
            if (err) {
              message.error(err);
              return cb(cb);
            }
            
            return filterAndIndexSentences(sentencesArray, function (err, sentences) {
              
              if (err) return cb(err);

              message.info('found %s relevant sentences for scoring', sentences.length);
              
              // Asynchronously queuing all sentences in current document
              return async.each(sentences, sendSentenceToBeProcessed, function (err) {
                if (err) {
                  message.error(err);
                  return cb(err);
                }
                
                // Test Dependency:
                // The following message is used as part of E2E testing
                message.info(constants.logMessages.parser.doneQueuingFormat, docId);

                // send a last item to the queue to mark that
                // the processing of this document is done 
                var msg = {
                  requestType: constants.queues.action.LAST_ITEM_TO_SCORE,
                  data: {
                    sourceId: data.sourceId,
                    docId: docId  
                  }
                };
                
                // Send message to queue
                return queueOut.sendMessage(msg, function (err) {
                  if (err) return cb(err);
                    
                  message.log('queued last item mark');
                
                  // update document status to SCORING
                  return db.updateDocumentStatus({
                      sourceId: sourceId,
                      docId: docId,
                      statusId: constants.documentStatus.SCORING
                    }, cb);  
                });
              });
            });
            
            function sendSentenceToBeProcessed(sentence, cb) {
              var outMessage = {
                requestType: constants.queues.action.SCORE,
                data: {
                  sourceId: data.sourceId,
                  docId: docId,
                  sentenceIndex: sentence.index,
                  sentence: sentence.data.sentence,
                  mentions: sentence.data.mentions
                }
              };
                
              return queueOut.sendMessage(outMessage, function (err) {
                if (err) {
                  message.error('failed to queue message: <%s> of paper <%s>', outMessage, docId);
                  return cb(err);
                }
                
                message.info('queued sentence sourceId: %s, docId: %s, index: %s', data.sourceId, sentence.index, docId);
                return cb();
              });
            }
            
            /**
             * 1) filter out sentences with at least 2 entities,
             * 2) capture sentence index in the array
             */          
            function filterAndIndexSentences(sentencesArray, cb) {
              
              var error = null;
              
              async.filter(sentencesArray.sentences, function (sentence, cb) { 
                  
                pipelineLogic.getSentenceEntities(sentence, function (err, entities) {
                  
                  if (err) {
                    error = err;
                    return cb(false);
                  }
                  
                  var requiredEntities = {};
                  
                  // If configured - filter only supported entites
                  if (config.services.supportedEntities) {
                    var supportedEntities = [];
                    
                    // Checking required entities
                    var supportConfigArr = config.services.supportedEntities.split(';');
                    for (var i = 0; i < supportConfigArr.length; i++) {
                      var entityConfig = supportConfigArr[i].split(':');
                      supportedEntities.push(entityConfig[0]);
                      if (entityConfig.length > 1 && entityConfig[1] == 'required') {
                        requiredEntities[entityConfig[0]] = false;
                      }
                    }
                    
                    entities = entities.filter(function (entity) {
                      requiredEntities[entity.type] = true;
                      return supportedEntities.indexOf(entity.type) != -1 ? entity : null;
                    });
                  }
                  
                  // filter out sentences with at least two entities
                  for (var entityName in requiredEntities) {
                    if (!requiredEntities[entityName]) {
                      message.log('filtering out a sentence with without all required entity types', sentence);
                      return cb(false);
                    }
                  }
                    
                  return cb(true); 
                });
              }, 
              function(results){
                
                if (error) return cb(error); 
                
                var sentences = results.map(function (sentence, index) {
                  return { data: sentence, index: index };
                });
                
                return cb(null, sentences);
              });
            }
        });
    });
  }
  
  return {
    processMessage: processMessage,
    initializeQueues: initializeQueues,
    queueInName: config.queues.new_ids,
    queueOutName: config.queues.scoring
  };
}

module.exports = parser;