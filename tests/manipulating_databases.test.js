"use strict";
var TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var test = new TestFixture();
describe('Manipulating Databases', function() {
  describe('#db', function() {
    it('should throw if the name contains invalid characters', function() {
      expect(r.db("-_-"))
        .to.eventually.be.rejectedWith(/Database name `-_-` invalid \(Use A-Za-z0-9_ only\)/);
    });
  });

  describe('#dbCreate', function() {
    it('should create a database', function() {
      var dbName = test.uuid();
      return r.dbCreate(dbName)
        .then(function(result) { expect(result.dbs_created).to.equal(1); })
        .then(function() { return r.dbDrop(dbName); });
    });

    it('should throw if no argument is given', function() {
      var invalid = function() { return r.dbCreate(); };
      expect(invalid).to.throw(/`dbCreate` takes 1 argument, 0 provided/);
    });

    it('is not defined after a term', function() {
      var invalid = function() { return r.expr(1).dbCreate('foo'); };
      expect(invalid).to.throw(/`dbCreate` is not defined after/);
    });
  });

  describe('#dbDrop', function() {
    it('should drop a table', function() {
      var dbName = test.uuid();
      return r.dbCreate(dbName)
        .then(function(result) { expect(result.dbs_created).to.equal(1); })
        .then(function() { return r.dbDrop(dbName); })
        .then(function(result) { expect(result.dbs_dropped).to.equal(1); });
    });

    it('should throw if given too many arguments', function() {
      var invalid = function() { return r.dbDrop('foo', 'bar', 'ette'); };
      expect(invalid).to.throw(/`dbDrop` takes 1 argument, 3 provided/);
    });

    it('should throw if no argument is given', function() {
      var invalid = function() { return r.dbDrop(); };
      expect(invalid).to.throw(/`dbDrop` takes 1 argument, 0 provided/);
    });

    it('is not defined after a term', function() {
      var invalid = function() { return r.expr(1).dbDrop('foo'); };
      expect(invalid).to.throw(/`dbDrop` is not defined after/);
    });
  });

  describe('#dbList', function() {
    it('should return a cursor', function() {
      return r.dbList().then(function(result) { expect(result).to.be.an('array'); });
    });

    it('should show a database we created', function() {
      var dbName = test.uuid();
      return r.dbCreate(dbName)
        .then(function(result) { expect(result.dbs_created).to.equal(1); })
        .then(function() { return r.dbList(); })
        .then(function(dbs) { expect(dbs).to.include(dbName); })
        .then(function() { return r.dbDrop(dbName); })
        .then(function(result) { expect(result.dbs_dropped).to.equal(1); });
    });

    it('is not defined after a term', function() {
      var invalid = function() { return r.expr(1).dbList('foo'); };
      expect(invalid).to.throw(/`dbList` is not defined after/);
    });

    it('should not show a database we dropped', function() {
      var dbName = test.uuid();
      return r.dbCreate(dbName)
        .then(function(result) { expect(result.dbs_created).to.equal(1); })
        .then(function() { return r.dbDrop(dbName); })
        .then(function(result) { expect(result.dbs_dropped).to.equal(1); })
        .then(function() { return r.dbList(); })
        .then(function(dbs) { expect(dbs).to.not.include(dbName); });
    });
  });

});
