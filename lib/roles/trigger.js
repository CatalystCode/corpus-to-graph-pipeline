

function trigger(config) {
  
  var queueIn = null; 
  var queueOut = null;

  // this function is called by the worker after it is initialized
  function initializeQueues(queueInObj, queueOutObj) {
    queueIn = queueInObj;
    queueOut = queueOutObj;
  }

  function run(cb) {
    
    console.info('triggering a new process through queue', config.queues.trigger_query);
    
    // Triggering a message to query documents added on the last few days (default)
    var message = {
      "requestType": "trigger"
    };
    return queueOut.sendMessage(message, function (err) {
      if (err) {
        console.error('There was an error triggering a pipeline process.', err);
        return cb(err);
      }
      
      console.log('Triggered pipeline process successfully');
      return cb();
    });
  }

  return {
    run: run,
    initializeQueues: initializeQueues,
    queueOutName: config.queues.trigger_query
  };
}

module.exports = trigger;