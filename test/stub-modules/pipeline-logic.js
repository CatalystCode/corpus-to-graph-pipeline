var async = require('async');
var moment = require('moment');

var Database = require('./database');
var constants = require('../../lib/common/constants');

function pipelineLogic(config, options) {
  
  options = options || {};
  var db = options.database ||new Database(config.sql);
  
  function getNewUnprocessedDocumentIDs(dateFrom, dateTo, cb) {
    
    return getNewDocumentIDs(dateFrom, dateTo, function (err, documents) {
      if (err) return cb(err);
      
      return checkDocuments(documents, cb);
    });
  }
  
  function checkDocuments(docIds, cb) {
    
    var reqParams = { docs: docIds };
    db.getUnprocessedDocuments(reqParams, function (err, result) {
        if (err) {
            console.error(err);
            return cb(err);
        }
        
        return cb(null, result.docs);
    });
  }
  
  function getNewDocumentIDs(dateFrom, dateTo, cb) {
    console.info('Querying documents from %s to %s', 
      moment(dateFrom).format('"YYYY-MM-DD"'),
      moment(dateTo).format('"YYYY-MM-DD"'));
      
    var documents = [
      {
        sourceId: 1,
        docId: '85500001'
      },
      {
        sourceId: 2,
        docId: '90800001'
      }
    ];

    return cb(null, documents);
  }
  
  /**
   * Get all sentences from document
   * Sample: in the stub samples folder taken from here: http://104.197.190.17/doc/pmc/2000354
   */
  function getDocumentSentences(docId, sourceId, cb) {
      
    var sentencesArray = {
      "sentences": [
        {
          "sentence": "This is a sentence about entity-1 and entity-2.",
          "mentions": [
            {
              "from": "25", 
              "to": "32", 
              "id": "1234", 
              "type": "entityType1", 
              "value": "entity-1"
            }, 
            {
              "from": "38", 
              "to": "45", 
              "id": "ABCD", 
              "type": "entityType2", 
              "value": "entity-2"
            }
          ]
        }, 
        {
          "sentence": "This sentence contains no mentions.",
          "mentions": []
        }, 
        {
          "sentence": "This sentence also contains entity-1 and entity-2.",
          "mentions": [
            {
              "from": "28", 
              "to": "35", 
              "id": "1234", 
              "type": "entityType1", 
              "value": "entity-1"
            }, 
            {
              "from": "41", 
              "to": "48", 
              "id": "ABCD", 
              "type": "entityType2", 
              "value": "entity-2"
            }
          ]
        }
      ]
    };
      
    return cb(null, sentencesArray);
  }
  
  function getScoring(message, cb) {
  
    var data = message && message.data;
    
    if (!data || !data.sentence || !data.mentions) {
      var err = new Error('received data is not in the correct format');
      console.error('Error scoring data', err);
      return cb(err);
    }
    
    var result = {
      entities: [
        {
          id: "1234",
          name: "entity-1",
          typeId: 1
        },
        {
          id: "ABCD",
          name: "entity-2",
          typeId: 2
        }
      ],
      relations: [
        {
          entity1: {
            id: "1234",
            name: "entity-1",
            typeId: 1
          },
          entity2: {
            id: "ABCD",
            name: "entity-2",
            typeId: 2
          },
          modelVersion: "0.1.0.1",
          relation: 2,
          score: 0.8,
          scoringServiceId: "SERVICE1"
        },
        {
          entity1: {
            id: "1234",
            name: "entity-1",
            typeId: 1
          },
          entity2: {
            id: "ABCD",
            name: "entity-2",
            typeId: 2
          },
          modelVersion: "1",
          relation: 1,
          score: 0.99,
          scoringServiceId: "SERVICE2"
        }
      ]
    };
    return cb(null, result);
  }
  
  function getSentenceEntities(sentence, cb) {
    
    return cb(null, sentence.mentions);
  }
  
  return {
      getNewUnprocessedDocumentIDs: getNewUnprocessedDocumentIDs,
      getDocumentSentences: getDocumentSentences,
      getScoring: getScoring,
      getSentenceEntities: getSentenceEntities
  };
}

module.exports = pipelineLogic;