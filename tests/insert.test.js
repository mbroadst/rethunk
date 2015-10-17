"use strict";
var TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var test = new TestFixture();
describe('#insert', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });
  afterEach(function() { return test.cleanTables(); });

  describe('errors', function() {
    it('should throw if no argument is given', function() {
      expect(function() {
        return test.table.insert();
      }).to.throw(/takes at least 1 argument, 0 provided/);
    });

    it('should throw given invalid options', function() {
      expect(function() {
        return test.table.insert({}, { invalidKey: true });
      }).to.throw(/Unrecognized option/);
    });
  });

  [
    { name: 'single inserts', value: {}, expected: 1 },
    {
      name: 'batch inserts',
      value: Array.apply(null, new Array(100)).map(function() { return {}; }),
      expected: 100
    }
  ].forEach(function(testCase) {
    it('should work with ' + testCase.name, function() {
      return test.table.insert(testCase.value)
        .then(function(result) {
          expect(result.inserted).to.equal(testCase.expected);
        });
    });
  });

  describe('returnChanges', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should optionally return changes', function() {
      return test.table.insert({}, { returnChanges: true })
        .then(function(result) {
          expect(result.inserted).to.equal(1);
          expect(result.changes[0].new_val).to.exist;
          expect(result.changes[0].old_val).to.be.null;
        });
    });

    it('should optionally not return changes', function() {
      return test.table.insert({}, { returnChanges: false })
        .then(function(result) {
          expect(result.inserted).to.equal(1);
          expect(result.changes).to.be.undefined;
          expect(result.changes).to.be.undefined;
        });
    });
  });

  describe('durability', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should support soft durability', function() {
      return test.table.insert({}, { durability: 'soft' })
        .then(function(result) {
          expect(result.inserted).to.equal(1);
        });
    });

    it('should support hard durability', function() {
      return test.table.insert({}, { durability: 'hard' })
        .then(function(result) {
          expect(result.inserted).to.equal(1);
        });
    });
  });

  describe('conflicts', function() {
    afterEach(function() { return test.cleanTables(); });
    beforeEach(function() {
      return test.table.insert({})
        .then(function(result) {
          expect(result.inserted).to.equal(1);
          test.conflict_test_id = result.generated_keys[0];
        });
    });

    [
      { conflictType: 'update', resultField: 'replaced' },
      { conflictType: 'replace', resultField: 'replaced' },
      { conflictType: 'error', resultField: 'errors' }
    ].forEach(function(testCase) {
      it('should support: ' + testCase.conflictType, function() {
        return test.table
          .insert({ id: test.conflict_test_id, val: 2 }, { conflict: testCase.conflictType })
          .then(function(result) {
            expect(result[testCase.resultField]).to.equal(1);
          });
      });
    });
  });

  describe('dates', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work with dates (1)', function() {
      return test.table.insert({ name: "Michel", age: 27, birthdate: new Date() })
        .then(function(result) {
          expect(result.inserted).to.equal(1);
        });
    });

    it('should work with dates (2)', function() {
      return test.table.insert([
          { name: "Michel", age: 27, birthdate: new Date() },
          { name: "Sophie", age: 23 }
        ])
        .then(function(result) {
          expect(result.inserted).to.equal(2);
        });
    });

    it('should work with dates (3)', function() {
      return test.table.insert({
          field: 'test',
          field2: { nested: 'test' },
          date: new Date()
        })
        .then(function(result) {
          expect(result.inserted).to.equal(1);
        });
    });

    it('should work with dates (4)', function() {
      return test.table.insert({
          field: 'test',
          field2: { nested: 'test' },
          date: r.now()
        })
        .then(function(result) {
          expect(result.inserted).to.equal(1);
        });
    });
  });

});
