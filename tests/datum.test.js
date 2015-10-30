"use strict";
var Promise = require('bluebird'),
    TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var conditionalDescribe = describe,
    conditionalIt = it;
if (process.version.match(/v0.10./)) {
  console.log('Buffers are not properly supported with v0.10.x at the moment, skipping...');
  conditionalDescribe = describe.skip;
  conditionalIt = it.skip;
}


var test = new TestFixture();
describe('Datum', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });

  it('all raw datum should be defined', function() {
    return Promise.all([
      r.expr(1),
      r.expr(null),
      r.expr(false),
      r.expr(true),
      r.expr('Hello'),
      r.expr([0, 1, 2]),
      r.expr({a: 0, b: 1})
    ])
    .spread(function(r1, r2, r3, r4, r5, r6, r7) {
      expect(r1).to.eql(1);
      expect(r2).to.eql(null);
      expect(r3).to.eql(false);
      expect(r4).to.eql(true);
      expect(r5).to.eql('Hello');
      expect(r6).to.eql([0, 1, 2]);
      expect(r7).to.eql({ a: 0, b: 1 });
    });
  });

  describe('#expr', function() {
    it('is not defined after a term', function() {
      var invalid = function() { return r.expr(1).expr('foo'); };
      expect(invalid).to.throw('`expr` is not defined after:\nr.expr(1)');
    });

    it('should take a nestingLevel value and throw if the nesting level is reached', function() {
      var invalid = function() { return r.expr({a: {b: {c: {d: 1}}}}, 2); };
      expect(invalid).to.throw('Nesting depth limit exceeded.\nYou probably have a circular reference somewhere.');
    });

    it('should throw when setNestingLevel is too small', function() {
      r.setNestingLevel(2);
      var invalid = function() { return r.expr({a: {b: {c: {d: 1}}}}); };
      expect(invalid).to.throw('Nesting depth limit exceeded.\nYou probably have a circular reference somewhere.');

      // reset nesting level
      r.setNestingLevel(r._nestingLevel);
    });

    it('should work when setNestingLevel set back to 100', function() {
      r.setNestingLevel(2);
      r.setNestingLevel(100);
      return r.expr({a: {b: {c: {d: 1}}}})
        .then(function(result) { expect(result).to.eql({a: {b: {c: {d: 1}}}}); });
    });

    it('should throw when arrayLimit is too small', function() {
      var invalid = r.expr([0, 1, 2, 3, 4, 5, 6, 8, 9]).run({arrayLimit: 2});
      expect(invalid).to.eventually.be.rejectedWith(/Array over size limit `2` in/);
    });

    it('should throw when arrayLimit is too small - options in run take precedence', function() {
      r.setArrayLimit(100);
      var invalid = r.expr([0, 1, 2, 3, 4, 5, 6, 8, 9]).run({ arrayLimit: 2 });
      expect(invalid).to.eventually.be.rejectedWith(/Array over size limit `2` in/);

      // reset array limit
      r.setArrayLimit(r._arrayLimit);
    });

    it('should throw when setArrayLimit is too small', function() {
      r.setArrayLimit(1);
      var invalid = r.expr([0, 1, 2, 3, 4, 5, 6, 8, 9]);
      expect(invalid).to.eventually.be.rejectedWith(/Array over size limit `1` in/);
    });

    it('should work when setArrayLimit set back to 100000', function() {
      r.setArrayLimit(1);
      r.setArrayLimit(100000);
      return r.expr([0, 1, 2, 3, 4, 5, 6, 8, 9])
        .then(function(result) { expect(result).to.eql([0, 1, 2, 3, 4, 5, 6, 8, 9]); });
    });

    it('should fail with NaN', function() {
      var invalid = r.expr(NaN);
      expect(invalid).to.eventually.be.rejectedWith(/Cannot convert `NaN` to JSON/);
    });

    it('should not throw with NaN if not run', function() {
      r.expr(NaN);
    });

    it('should fail with Infinity', function() {
      var invalid = r.expr(Infinity);
      expect(invalid).to.eventually.be.rejectedWith(/Cannot convert `Infinity` to JSON/);
    });

    it('should not throw with Infinity if not run', function() {
      r.expr(Infinity);
    });

    it('should work with high unicode character', function() {
      return r.expr('“').then(function(result) { expect(result).to.eql('“'); });
    });

    conditionalIt('should work with Buffers', function() {
      return r.expr(new Buffer([1, 2, 3, 4, 5, 6]))
        .then(function(result) {
          expect(result.toJSON().data).to.eql([1, 2, 3, 4, 5, 6]);
        });
    });

  });

  conditionalDescribe('#binary', function() {
    it('should work - with a buffer', function() {
      return r.binary(new Buffer([1, 2, 3, 4, 5, 6]))
        .then(function(result) {
          expect(result).to.be.an.instanceOf(Buffer);
          expect(result.toJSON().data).to.eql([1, 2, 3, 4, 5, 6]);
        });
    });

    it('should work - with a ReQL term', function() {
      return r.binary(r.expr('foo'))
        .then(function(result) {
          expect(result).to.be.an.instanceOf(Buffer);
          return r.expr(result).coerceTo('STRING');
        })
        .then(function(result) {
          expect(result).to.equal('foo');
        });
    });
  });

});
