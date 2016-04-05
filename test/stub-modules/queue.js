var uuid = require('node-uuid');

var _queues = {};

/*
 * Defining a new azure queue
 * 
 * [string] queueName - name of the queue
 * [object] config                      - configuration for queue
 * [object] config.storage              - configuration for queue storage
 * [string] config.storage.account  - storage account name
 * [string] config.storage.key   - storage account key
 * [object] config.queue                - queue configuration inside stoarge
 * [number] config.queue.visibilityTimeout - message hide timeout in queue
 * 
 */
function Queue(queueName, config) {
  
  if (!_queues[queueName]) _queues[queueName] = [];

  var _queue = _queues[queueName];

  function init(cb) {
    return setTimeout(cb, 100);
  }

  function count(cb) {
    return cb(null, _queue.length);
  }

  function getSingleMessage(cb) {
    
    if (!_queue.length) return cb(null);
    
    var message = {
      messageid: uuid.v4(),
      messagetext: JSON.stringify(_queue.pop())
    };
    return cb(null, message);
  }

  function deleteMessage(message, cb) {
    return cb();
  };

  function sendMessage(message, cb) {
    _queue.unshift(message);
    return cb();
  };

  return {
    init: init,
    getSingleMessage: getSingleMessage,
    deleteMessage: deleteMessage,
    sendMessage: sendMessage,
    count: count,
    config: config
  };
};

module.exports = Queue;