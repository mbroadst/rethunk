"use strict";
var Promise = require('bluebird'),
    TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var test = new TestFixture();
describe('Writing Data', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });

  describe('#insert', function() {
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

      it('should support a conflict method', function() {
        var savedId;
        return test.table.insert({ count: 7 }).run()
          .then(function(result) {
            savedId = result.generated_keys[0];
            return test.table.insert({ id: savedId, count: 10 }, {
              conflict: function(id, oldDoc, newDoc) {
                return newDoc.merge({ count: newDoc('count').add(oldDoc('count')) });
              }
            }).run();
          })
          .then(function() { return test.table.get(savedId); })
          .then(function(result) { expect(result).to.eql({ id: savedId, count: 17 }); });
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

  describe('#update', function() {
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

describe('#replace', function() {
    afterEach(function() { return test.cleanTables(); });

    describe('errors', function() {
      it('should throw if no argument is given', function() {
        expect(function() {
          return test.table.replace();
        }).to.throw(/takes at least 1 argument, 0 provided/);
      });

      it('should throw if given invalid options', function() {
        expect(function() {
          return test.table.replace({}, { invalidKey: true });
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
          .replace({ id: 1, foo: 'bar' }, { durability: 'soft' })
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
          .replace({ id: 1, foo: 'bar' }, { durability: 'hard' })
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
          .replace({ id: 1, foo: 'bar' }, { returnChanges: true })
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
          .replace({ id: 1, foo: 'bar' }, { returnChanges: false })
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
          return test.table.replace({ id: 1, foo: 'bar' });
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
          return test.table.replace(r.row.merge({ foo: 'bar' }));
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

  describe('#delete', function() {
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

  describe('#sync', function() {
    it('should support sync', function() {
      return test.table.insert([
            { name: 'spider man' }, { name: 'collosus' }, { name: 'hulk' }
          ])
          .then(function(result) {
            expect(result.inserted).to.equal(3);
            return test.table.update({ type: 'hero' }, { durability: 'soft' });
          })
          .then(function(result) {
            expect(result.replaced).to.equal(3);
            return test.table.sync();
          })
          .then(function(result) {
            expect(result.synced).to.equal(1);
          });
    });
  });

});
