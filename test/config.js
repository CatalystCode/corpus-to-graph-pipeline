var config = {
  queues: {
    scoring: 'QUEUE_SCORING',
    new_ids: 'QUEUE_NEW_IDS',
    trigger_query: 'QUEUE_TRIGGER_QUERY'
  },
  services: {
    docServiceUrl: 'http://127.0.0.1',
    scoringConfig: 'SK::http://127.0.0.1',
    supportedEntities: 'entityType1:required;entityType2:required'
  },
  http: {
    timeoutMsec: 60000
  },
  sql: {
    server: 'SERVER',
    userName: 'USER',
    password: 'PASSWORD',
    options: {
      database: 'database',
      encrypt: true,
      connectTimeout: 60000,
      requestTimeout: 60000
    },
    batchSize: 500
  },
  storage: {
    account: 'account',
    key: 'key'
  },
  queue: {
    visibilityTimeoutSecs: 300,
    checkFrequencyMsecs: 5000
  }
};

module.exports = config;
