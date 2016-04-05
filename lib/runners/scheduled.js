
var async = require('async');

var Queue = require('../common/azure-queue');
var roles = require('../roles');

/*
 * A class to define a web job runner which manages the following elements:
 * 1 - service module to run
 * 2 - queue in: the queue to listen to and receive messages from
 * 3 - queue out: the queue to push new messages to
 * 4 - stop\start service
 */
function Runner(serviceName, config, options) {

  var processMessage = null;
  var queueIn = options.queueIn || null;
  var queueOut = options.queueOut || null;
  var shouldStop = false;
  options = options || {};

  // Initialize service module
  if (!serviceName) throw new Error('Service name was not provided');
  
  // Initialize service module
  var svc = new roles[serviceName](config, options);

  // Check module interface
  if (!svc.queueOutName && !options.queueOut) throw new Error('queueInName was not provided');
  if (typeof svc.run !== 'function') throw new Error('run funtion was not provided');

  return {
    queueIn: queueIn,
    queueOut: queueOut,
    start: start
  };

  /*
   * Initialize queue in\out
   */
  function initQueues (cb) {
    
    async.parallel([
      
      // Initialize in queue
      function (cb) {
     
        if (!options.queueIn) {
          
          if (!svc.queueInName) return cb();
          console.log('initializing queue: ', svc.queueInName);
          queueIn = new Queue(svc.queueInName, config);
        }
        
        queueIn.init(function (err) {
          if (err) return cb(err);
          console.log('queue %s initialized...', svc.queueInName);
          return cb();
        });
      },
      
      // Initialize out queue
      function (cb) {
        
        if (!options.queueOut) {
        
          if (!svc.queueOutName) return cb();
          console.log('initializing queue: ', svc.queueOutName);
          queueOut = new Queue(svc.queueOutName, config);
        }
        
        queueOut.init(function (err) {
          if (err) return cb(err);
          console.log('queue %s initialized...', svc.queueOutName);
          return cb();
        });
      }
    ], 
    
    // set service queues and start querying for messages
    function(err) {
        if (err) {
          console.error('error initializing queues', err);
          return cb(err);
        }

        svc.initializeQueues(queueIn, queueOut);
        return cb();
      }
    );
  }
  
  /*
  * start the worker processing flow
  */
  function start(cb) {

    // Validity Check
    if (!cb || typeof cb !== 'function') return cb(new Error('callback function was not provided'));
  
   return initQueues(function (err) {
     
     if (err) return cb(err);
     
     return svc.run(cb);
   });
  }
}

module.exports = Runner;