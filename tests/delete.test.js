"use strict";
var TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var test = new TestFixture();
describe('#delete', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });
  afterEach(function() { return test.cleanTables(); });

  it('should support delete', function() {
    return test.table.delete()
      .then(function(result) {
        expect(result.deleted).to.equal(0);
        return test.table.delete();
      })
      .then(function(result) {
        expect(result.deleted).to.equal(0);
      });
  });

  describe('errors', function() {
    it('should throw if given invalid options', function() {
      expect(function() {
        test.table.delete({ invalidKey: true });
      }).to.throw(/Unrecognized option/);
    });
  });

  describe('durability', function() {
    afterEach(function() { return test.cleanTables(); });
    beforeEach(function() {
      return test.table.insert({})
        .then(function(result) { expect(result.inserted).to.equal(1); });
    });

    it('should support soft durability', function() {
      return test.table.delete({ durability: 'soft' })
        .then(function(result) {
          expect(result.deleted).to.equal(1);
        });
    });

    it('should support hard durability', function() {
      return test.table.delete({ durability: 'hard' })
        .then(function(result) {
          expect(result.deleted).to.equal(1);
        });
    });
  });

});
