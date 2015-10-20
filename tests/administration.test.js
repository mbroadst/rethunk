"use strict";
var Promise = require('bluebird'),
    TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var test = new TestFixture();
describe('Administration', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });

  beforeEach(function() {
    var testData =
      Array.apply(null, new Array(100)).map(function(a) { return { field: 0 }; });
    return test.table.insert(testData)
      .then(function(result) {
        expect(result.inserted).to.equal(100);
        test.pks = result.generated_keys;
      });
  });

  describe('#config', function() {
    it('should work', function() {
      return Promise.all([
        test.db.config(), test.table.config()
      ])
      .spread(function(r1, r2) {
        expect(r1.name).to.equal(test._dbName);
        expect(r2.name).to.equal(test._tableName);
      });
    });

    it('should throw if called with an argument', function() {
      var invalid = function() { return test.db.config('hello'); };
      expect(invalid).to.throw(/`config` takes 0 argument, 1 provided after/);
    });
  });

  describe('#rebalance', function() {
    it('should work', function() {
      return test.table.rebalance()
        .then(function(result) { expect(result.rebalanced).to.equal(1); });
    });

    it('should throw if an argument is provided', function() {
      var invalid = function() { return test.table.rebalance(1); };
      expect(invalid).to.throw(/`rebalance` takes 0 argument, 1 provided/);
    });

    describe('#r.balance', function() {
      it('should work', function() {
        return r.rebalance().then(function(result) { expect(result.rebalanced).to.equal(1); });
      });
    });
  });

  describe('#reconfigure', function() {
    it('should work', function() {
      return test.table.reconfigure({ shards: 1, replicas: 1 })
        .then(function(result) { expect(result.reconfigured).to.equal(1); });
    });

    it('should work with dryRun option', function() {
      return test.table.reconfigure({ shards: 1, replicas: 1, dryRun: true })
        .then(function(result) { expect(result.reconfigured).to.equal(0); });
    });

    it('should throw when given invalid options', function() {
      var invalid = function() { return test.table.reconfigure({ foo: 1 }); };
      expect(invalid).to.throw(/Unrecognized option `foo` in `reconfigure`/);

      invalid = function() { return test.table.reconfigure(1); };
      expect(invalid).to.throw(/First argument of `reconfigure` must be an object/);
    });

    describe('#r.reconfigure', function() {
      it('should work', function() {
        return r.reconfigure({ shards: 1, replicas: 1 })
          .then(function(result) { expect(result.reconfigured).to.eql(1); });
      });
    });
  });

  describe('#status', function() {
    it('should work', function() {
      return test.table.status()
        .then(function(result) {
          expect(result.name).to.equal(test._tableName);
          expect(result.status).to.not.be.undefined;
        });
    });

    it('should throw if called with an argument', function() {
      var invalid = function() { return test.table.status('hello'); };
      expect(invalid).to.throw(/`status` takes 0 argument, 1 provided after/);
    });
  });

  describe('#wait', function() {
    it('should work', function() {
      return test.table.wait()
        .then(function(result) { expect(result.ready).to.equal(1); });
    });

    it('should work with options', function() {
      return test.table.wait({ waitFor: 'ready_for_writes' })
        .then(function(result) { expect(result.ready).to.equal(1); });
    });

    it('should throw if called with too many arguments', function() {
      var invalid = function() { return test.table.wait('hello', 'world'); };
      expect(invalid).to.throw(/`wait` takes at most 1 argument, 2 provided/);
    });
  });

  describe('#r.wait', function() {
    it('should work', function() {
      return r.wait().then(function(result) { expect(result).to.have.key('ready'); });
    });
  });

});
