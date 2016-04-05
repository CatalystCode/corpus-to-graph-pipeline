
var path = require('path');
var async = require('async');
var assert = require('assert');
var fs = require('fs');

var config = require('./config');

var azurePipeline = require('..');
var Database = require('./stub-modules/database');
var Queue = require('./stub-modules/queue');
var PipelineLogic = require('./stub-modules/pipeline-logic');

var db = new Database(config.sql);
var pipelineLogic = new PipelineLogic(config, { database: db });
var webJobRunner = azurePipeline.runners.continuous;

// Default checkable date\document id
var DATE_TO_CHECK = '2007-10-10';
var DOCUMENT_ID_TO_MONITOR = '123456';

describe('Unit testing', function () {
  
  this.timeout(1 * 60 * 1000); // 1 minute timeout

  var queueTrigger = new Queue(config.queues.trigger_query, config);
  var queueNewIDs = new Queue(config.queues.new_ids, config);
  var queueScoring = new Queue(config.queues.scoring, config);

  before(function (done) {
        
    async.series([
      
      // Sending a 'trigger' message to the pipeline
      function (cb) {
        
        var message = {
          "requestType": "trigger",
          "data": {
            "from": DATE_TO_CHECK,
            "to": DATE_TO_CHECK
          }
        };
        return queueTrigger.sendMessage(message, function (error) {
          if (error) return cb(error);
          return cb();
        });

      }
    ], done);
  });
  
  it('QueryID Web Job Check', function (done) {
    
    var queryID = new webJobRunner(azurePipeline.constants.apps.QUERY, config, { 
      queueIn: queueTrigger, 
      queueOut: queueNewIDs,
      database: db,
      pipelineLogic: pipelineLogic 
    });
    var exception = null;
    
    // Expecting results in trigger queue
    // If no results are available, kill the 'thread' of the worker
    setTimeout(function () {
      queryID.stop();
      
      if (exception) return;
      
      return queueTrigger.count(function (err, count) {
        if (count) return done(new Error('Trigger queue should be empty, found results inside'));
        
        return queueNewIDs.count(function (err, count) {
          if (!count) return done(new Error('New IDs queue is empty, and expected 1 item'));
          return done(); 
        });
      });
    }, 1000);
    
    // Running web job
    return queryID.start(function (err) {
      if (err) {
        exception = err;
        return done(err);
      }
    });
  });
  
  it('Parser Web Job Check', function (done) {
    
    var paperParser = new webJobRunner(azurePipeline.constants.apps.PARSER, config, { 
      queueIn: queueNewIDs, 
      queueOut: queueScoring,
      database: db,
      pipelineLogic: pipelineLogic
    });
    var exception = null;
    
    // Expecting results in trigger queue
    // If no results are available, kill the 'thread' of the worker
    setTimeout(function () {
      paperParser.stop();
      
      if (exception) return;
      
      return queueNewIDs.count(function (err, count) {
        if (count) return done(new Error('New IDs queue should be empty, found results inside'));
        
        return queueScoring.count(function (err, count) {
          // 2 documents * (2 entities + 1 last item message)
          if (count != 6) return done(new Error('Scoring queue does not have 6 messages'));
          done(); 
        });
      });
    }, 1000);
    
    return paperParser.start(function (err) {
      if (err) {
        exception = err;
        return done(err);
      }
    });
  });
  
  it('Scoring Web Job Check', function (done) {
    
    var scoring = new webJobRunner(azurePipeline.constants.apps.SCORING, config, { 
      queueIn: queueScoring,
      database: db,
      pipelineLogic: pipelineLogic 
    });
    var exception = null;
    
    // Expecting results in trigger queue
    // If no results are available, kill the 'thread' of the worker
    setTimeout(function () {
      scoring.stop();
      
      if (exception) return;
      
      return queueScoring.count(function (err, count) {
        if (count) return done(new Error('Scoring queue should be empty, found results inside'));
        
        var sentences = 0;
        return db.getSentences({
          batchSize: config.sql.batchSize,
          rowHandler: rowHandler
        }, function (err) {
          // 2 documents * (2 sentences)
          if (sentences != 4) return done(new Error('There are less than 4 messages in the database'));
          done(); 
        });
        
        function rowHandler(row, cb) { 
          sentences++;
          return cb();
        }
        
      });
    }, 3000);
    
    return scoring.start(function (err) {
      if (err) {
        exception = err;
        return done(err);
      }
    });
  });
  
  after(function (done) {
    //process.exit();
    done();
  });
})
