"use strict";
var TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var test = new TestFixture();
describe('String Manipulation', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });

  describe('#match', function() {
    it('should work', function() {
      return r.expr("hello").match("hello")
        .then(function(result) {
          expect(result).to.eql({ end: 5, groups: [], start: 0, str: 'hello' });
        });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return r.expr("foo").match(); };
      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
    });
  });

  describe('#split', function() {
    it('should work', function() {
      return r.expr("foo  bar bax").split()
        .then(function(result) { expect(result).to.eql(['foo', 'bar', 'bax']); });
    });

    it('should support specifying a separator', function() {
      return r.expr('12,37,,22,').split(',')
        .then(function(result) { expect(result).to.eql(['12', '37', '', '22', '']); });
    });

    it('should support specifying a separator and max occurances', function() {
      return r.expr('foo  bar bax').split(null, 1)
        .then(function(result) { expect(result).to.eql(['foo', 'bar bax']); });
    });
  });

  describe('#upcase', function() {
    it('should work', function() {
      return r.expr("helLo").upcase()
        .then(function(result) { expect(result).to.equal('HELLO'); });
    });
  });

  describe('#downcase', function() {
    it('should work', function() {
      return r.expr("HElLo").downcase()
        .then(function(result) { expect(result).to.equal('hello'); });
    });
  });

});
