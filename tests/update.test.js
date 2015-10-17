"use strict";
var Promise = require('bluebird'),
    TestFixture = require('./support'),
    expect = require('chai').expect;

var test = new TestFixture();
describe('#update', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });
  afterEach(function() { return test.cleanTables(); });

  describe('errors', function() {
    it('should throw if no argument is given', function() {
      expect(function() {
        return test.table.update();
      }).to.throw(/takes at least 1 argument, 0 provided/);
    });

    it('should throw if given invalid options', function() {
      expect(function() {
        return test.table.update({}, { invalidKey: true });
      }).to.throw(/Unrecognized option/);
    });
  });

  describe('durability', function() {
    afterEach(function() { return test.cleanTables(); });
    beforeEach(function() {
      return test.table.insert({ id: 1 })
        .then(function(result) { expect(result.inserted).to.equal(1); });
    });

    it('should support soft durability`', function() {
      return test.table.get(1)
        .update({ id: 1, foo: 'bar' }, { durability: 'soft' })
        .then(function(result) {
          expect(result.replaced).to.equal(1);
          return test.table.get(1);
        })
        .then(function(doc) {
          expect(doc).to.eql({ id: 1, foo: 'bar' });
        });
    });

    it('should support hard durability`', function() {
      return test.table.get(1)
        .update({ id: 1, foo: 'bar' }, { durability: 'hard' })
        .then(function(result) {
          expect(result.replaced).to.equal(1);
          return test.table.get(1);
        })
        .then(function(doc) {
          expect(doc).to.eql({ id: 1, foo: 'bar' });
        });
    });
  });

  describe('returnChanges', function() {
    afterEach(function() { return test.cleanTables(); });
    beforeEach(function() {
      return test.table.insert({ id: 1 })
        .then(function(result) { expect(result.inserted).to.equal(1); });
    });

    it('should support returnChanges: true', function() {
      return test.table.get(1)
        .update({ id: 1, foo: 'bar' }, { returnChanges: true })
        .then(function(result) {
          expect(result.replaced).to.equal(1);
          expect(result.changes[0].new_val).to.eql({ id: 1, foo: 'bar' });
          expect(result.changes[0].old_val).to.eql({ id: 1 });

          return test.table.get(1);
        })
        .then(function(doc) {
          expect(doc).to.eql({ id: 1, foo: 'bar' });
        });
    });

    it('should support returnChanges: false', function() {
      return test.table.get(1)
        .update({ id: 1, foo: 'bar' }, { returnChanges: false })
        .then(function(result) {
          expect(result.replaced).to.equal(1);
          expect(result.changes).to.be.undefined;

          return test.table.get(1);
        })
        .then(function(doc) {
          expect(doc).to.eql({ id: 1, foo: 'bar' });
        });
    });
  });

  it('should support point replacement', function() {
    return test.table.insert({ id: 1 })
      .then(function(result) {
        expect(result.inserted).to.equal(1);
        return test.table.update({ id: 1, foo: 'bar' });
      })
      .then(function(result) {
        expect(result.replaced).to.equal(1);
        return test.table.get(1);
      })
      .then(function(doc) {
        expect(doc).to.eql({ id: 1, foo: 'bar' });
      });
  });

  it('should support range replacement', function() {
    return test.table.insert([{ id: 1 }, { id: 2 }])
      .then(function(result) {
        expect(result.inserted).to.equal(2);
        return test.table.update({ foo: 'bar' });
      })
      .then(function(result) {
        expect(result.replaced).to.equal(2);
        return Promise.all([ test.table.get(1), test.table.get(2) ]);
      })
      .spread(function(doc1, doc2) {
        expect(doc1).to.eql({ id: 1, foo: 'bar' });
        expect(doc2).to.eql({ id: 2, foo: 'bar' });
      });
  });

});