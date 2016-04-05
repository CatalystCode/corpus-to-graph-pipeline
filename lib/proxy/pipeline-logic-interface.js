
function pipelineLogic(config, options) {

  throw new Error('This class is an interface and should not be instanciated directly');
  
  function getNewUnprocessedDocumentIDs(dateFrom, dateTo, cb) { }
  
  /**
   * Get all sentences from document
   */
  function getDocumentSentences(docId, sourceId, cb) { }
  
  function getScoring(message, cb) { }
  
  function getSentenceEntities(sentence, cb) { }
  
  return {
      getNewUnprocessedDocumentIDs: getNewUnprocessedDocumentIDs,
      getDocumentSentences: getDocumentSentences,
      getScoring: getScoring,
      getSentenceEntities: getSentenceEntities
  };
}

module.exports = pipelineLogic;