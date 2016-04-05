var async = require('async');

var _documents = [];
var _sentences = [];
var _entities = {};
var _relations = [];

/**
 * Create a new database connection for pipeline actions
 * @param {Object} sqlConfig - tedious connection config (http://pekim.github.io/tedious/api-connection.html)
 * @param {string} sqlConfig.server - full server name
 * @param {string} sqlConfig.userName
 * @param {string} sqlConfig.password
 * @param {Object} sqlConfig.options - db options
 * @param {string} sqlConfig.database - database name
 * @param {boolean} sqlConfig.encrypt
 * @param {number} sqlConfig.connectTimeout
 * @param {number} sqlConfig.requestTimeout
 * @param {Object} poolConfig - connection pool settings (https://github.com/pekim/tedious-connection-pool)
 * @param {number} [poolConfig.min=2]
 * @param {number} [poolConfig.max=5]
 * @param {number} [poolConfig.idleTimeout=10000]
 * @param {boolean} [poolConfig.log=false]
 */
function Database(sqlConfig, poolConfig) {
  
  // Parameters validation
  if (!sqlConfig) throw new Error('please provide appropriate configuration for sql connection');
  
  return {
    connect: connect,
    upsertRelations: upsertRelations,
    getUnprocessedDocuments: getUnprocessedDocuments,
    upsertDocument: upsertDocument,
    updateDocumentStatus: updateDocumentStatus,
    getModelVersions: getModelVersions,
    getGraph: getGraph,
    getSentences: getSentences,
    getDocuments: getDocuments
  };
  
  function connect(cb) {
    return cb();
  }

  /**
   * Update\Insert relation to the database:
   * @param {Object} opts - parameters for upsert operation
   * @param {number} opts.sourceId
   * @param {number} opts.docId 
   * @param {number} opts.sentenceIndex - sentence index\id in document
   * @param {string} opts.sentence - the text of the sentence
   * @param {Object} opts.mentions - mentions to be stringified with the sentence 
   * @param {Object[]} opts.entities - entities found in the sentence
   * @param {number} opts.entities[].typeId
   * @param {string} opts.entities[].id
   * @param {string} opts.entities[].name
   * @param {Object[]} opts.relations - relations collection
   * @param {string} opts.relations[].scoringServiceId
   * @param {string} opts.relations[].modelVersion
   * @param {number} opts.relations[].entity1.typeId
   * @param {string} opts.relations[].entity1.id
   * @param {number} opts.relations[].entity2.typeId
   * @param {string} opts.relations[].entity2.id
   * @param {string} opts.relations[].relation
   * @param {number} opts.relations[].score
   * @param {Object} opts.relations[].data - json data to be stringified and saved with the relation
   */
  function upsertRelations(opts, cb) {
    
    // Inserting sentences
    _sentences.push({
        sourceId: opts.sourceId,
        docId: opts.docId,
        sentenceIndex: opts.sentenceIndex,
        sentence: opts.sentence,
        mentions: JSON.stringify(opts.mentions)
    });
    
    // Inserting entities
    var entities = opts.entities || [];
    for (var i = 0; i < entities.length; i++) {
      var entity = entities[i];
      if (!_entities[entity.id]) _entities[entity.id] = entity;
    }
    
    // Insert relations
    var relations = opts.relations || [];
    for (var i=0; i < relations.length; i++) {
      var relation = relations[i];
      _relations.push({
        sourceId: opts.sourceId,
        docId: opts.docId,
        sentenceIndex: opts.sentenceIndex,
        scoringServiceId: relation.scoringServiceId,
        modelVersion: relation.modelVersion,
        entity1TypeId: relation.entity1.typeId,
        entity1Id: relation.entity1.id,
        entity2TypeId: relation.entity2.typeId,
        entity2Id: relation.entity2.id,
        relation: relation.relation,
        score: relation.score
      });
    }
    
    return cb();
  }

  /**
   * Check the following documents (source + id) to see which ones have not yet been processed:
   * @param {Object} req - req object containing the documents to check
   * @param {Object[]} req.docs - documents array to be checked
   * @param {number} req.docs[].sourceId - source id of the document to check
   * @param {string} req.docs[].docId - document id in source of the document to check
   */
  function getUnprocessedDocuments(req, cb) {
    return cb(null, req);
  } 

  function getModelVersions(cb) {
    
    var retModels = {
      models: [
        {
          ScoringServiceId: 'SK', 
          ModelVersion: '1'
        },
        {
          ScoringServiceId: 'TLC', 
          ModelVersion: '0.1.0.1'
        },
      ]
    }; 
    
    return cb(null, retModels);
  } 

  function upsertDocument(opts, cb) {

    _documents.push({
      sourceId: opts.sourceId,
      docId: opts.docId,
      Description: opts.Description,
      statusId: opts.statusId
    });

    return cb();
  }

  // TODO: should this method enable 'insert if not exists'?
  function updateDocumentStatus(opts, cb) {
    
    _documents.forEach(function (document, index, array) {
      if (document.docId == opts.docId && document.sourceId == opts.sourceId) {
        document.statusId = opts.statusId;
      }
    });

    return cb();  
  }

  // TODO: unclear what this method should return
  function getGraph(opts, cb) {

    return cb();
  } 

  function getSentences(opts, cb) {
    return async.eachSeries(_sentences, opts.rowHandler, cb);
  }

  function getDocuments(opts, cb) {
    return cb(null, _documents);
  }
}

module.exports = Database;
