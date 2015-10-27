"use strict";
var Promise = require('bluebird'),
    uuid = require('uuid'),
    chai = require('chai'),
    expect = chai.expect,

    config = require('./config.js'),
    r = require('../lib')(config);

Promise.longStackTraces();
chai.use(require('chai-as-promised'));

function TestFixture() {}
TestFixture.prototype.uuid = function() {
  return (uuid.v4()).replace(/-/g, '');
};

TestFixture.prototype.setup = function() {
  this._dbName = (uuid.v4()).replace(/-/g, '');
  this._tableName = (uuid.v4()).replace(/-/g, '');

  var self = this;
  return r.dbCreate(this._dbName)
    .then(function(result) {
      expect(result.dbs_created).to.equal(1);
      return r.db(self._dbName).tableCreate(self._tableName);
    })
    .then(function(result) {
      expect(result.tables_created).to.equal(1);
      self.db = r.db(self._dbName);
      self.table = self.db.table(self._tableName);
    });
};

TestFixture.prototype.cleanTables = function() {
  return this.table.delete();
};

TestFixture.prototype.teardown = function() {
  return r.dbDrop(this._dbName);
};

TestFixture.r = r;
module.exports = TestFixture;
