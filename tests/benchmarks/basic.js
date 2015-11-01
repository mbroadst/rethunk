'use strict';
var Promise = require('bluebird'),
    r = require('../../lib')(),
    assert = require('assert');

function s4() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
function uuid() { return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4(); }

function singleRun(table, data) {
  var recordId;
  return table.insert({ data: data })
    .then(function(result) {
      assert.deepEqual(result.inserted, 1);
      recordId = result.generated_keys[0];
      return table.get(recordId);
    })
    .then(function(record) {
      assert.deepEqual(record.data, data);
      return table.get(recordId).delete();
    })
    .then(function(result) {
      assert.deepEqual(result.deleted, 1);
    });
}

function benchmark(r, table) {
  var promises = [];
  for (var i = 0; i < 10000; i++) {
    promises.push(singleRun(table, uuid()));
  }

  var now = new Date();
  return Promise.all(promises)
    .then(function() {
      var elapsed = (new Date()) - now;
      console.log('elapsed time: ' + elapsed + 'ms');
    });
}

var dbName = uuid(), tableName = uuid();
r.dbCreate(dbName)
  .then(function(result) {
    assert.deepEqual(result.dbs_created, 1);
    return r.db(dbName).tableCreate(tableName);
  })
  .then(function(result) {
    assert.deepEqual(result.tables_created, 1);
    return benchmark(r, r.db(dbName).table(tableName));
  })
  .then(function() { return r.dbDrop(dbName); })
  .then(function() { return process.exit(0); })
  .error(function() { process.exit(1); });
