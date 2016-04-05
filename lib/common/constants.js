
// TODO: remove fields

var constants = {
  apps: {
    TRIGGER: 'trigger',
    QUERY: 'query',
    PARSER: 'parser',
    SCORING: 'scoring'
  },
  documentStatus: {
    PROCESSING: 1,
    SCORING: 2,
    PROCESSED: 3,
    NOT_ACCESSIBLE: 4
  },
  sources: {
    GENERAL: 100
  },
  queues: {
    action: {
      TRIGGER: 'trigger',
      SCORE: 'score',
      LAST_ITEM_TO_SCORE: 'lastItemToScore',
      GET_DOCUMENT: 'getDocument',
      RESCORE: 'rescore',
      REPROCESS: 'reprocess'
    }
  },
  
  logMessages: {
    query: {
      doneQueuing: 'Testable>> done queuing messages for all documents',
      queueDocFormat: 'Testable>> Queued document %s from source %s'
    },
    parser: {
      doneQueuingFormat: 'Testable>> done queuing messages for document <%s>'
    }
  }
}

module.exports = constants;
