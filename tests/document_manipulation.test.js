"use strict";
var Promise = require('bluebird'),
    TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var test = new TestFixture();
describe('Document Manipulation', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });

  describe('#row', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work with map', function() {
      return r.expr([1,2,3]).map(r.row)
        .then(function(result) { expect(result).to.eql([1, 2, 3]); });
    });

    it('should work as value for an object', function() {
      return test.table.insert({})
        .then(function(result) {
          expect(result.inserted).to.equal(1);
          return test.table.update({ idCopyUpdate: r.row('id') });
        })
        .then(function(result) {
          expect(result.replaced).to.equal(1);
        });
    });

    it('should work with replace', function() {
      return test.table.replace(r.row)
        .then(function(result) { expect(result.replaced).to.equal(0); });
    });

    it('should work as value for object in replace', function() {
      return test.table.insert({})
        .then(function() { return test.table.update({ idCopyUpdate: r.row('id') }); })
        .then(function() {
          return test.table.replace(function(doc) {
            return doc.merge({ idCopyReplace: doc('id') });
          });
        })
        .then(function(result) { expect(result.replaced).to.equal(1); });
    });
  });

  describe('#pluck', function() {
    it('should work', function() {
      return Promise.all([
        r.expr({a: 0, b: 1, c: 2}).pluck('a', 'b'),
        r.expr([{a: 0, b: 1, c: 2}, {a: 0, b: 10, c: 20}]).pluck('a', 'b')
      ])
      .spread(function(r1, r2) {
        expect(r1).to.eql({a: 0, b: 1});
        expect(r2).to.eql([{a: 0, b: 1}, {a: 0, b: 10}]);
      });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.pluck(); };
      expect(invalid).to.throw(/`pluck` takes at least 1 argument, 0 provided/);
    });
  });

  describe('#without', function() {
    it('should work', function() {
      return Promise.all([
        r.expr({a: 0, b: 1, c: 2}).without('c'),
        r.expr([{a: 0, b: 1, c: 2}, {a: 0, b: 10, c: 20}]).without('a', 'c')
      ])
      .spread(function(r1, r2) {
        expect(r1).to.eql({a: 0, b: 1});
        expect(r2).to.eql([{b: 1}, {b: 10}]);
      });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.without(); };
      expect(invalid).to.throw(/`without` takes at least 1 argument, 0 provided/);
    });
  });

  describe('#merge', function() {
    it('`merge` should work', function() {
      return Promise.all([
        r.expr({a: 0}).merge({b: 1}),
        r.expr([{a: 0}, {a: 1}, {a: 2}]).merge({b: 1}),
        r.expr({a: 0, c: {l: 'tt'}}).merge({b: {c: {d: {e: 'fff'}}, k: 'pp'}}),
        r.expr({a: 1}).merge({date: r.now()}),
        r.expr({a: 1}).merge({nested: r.row}, {b: 2})
      ])
      .spread(function(r1, r2, r3, r4, r5) {
        expect(r1).to.eql({a: 0, b: 1});
        expect(r2).to.eql([{a: 0, b: 1}, {a: 1, b: 1}, {a: 2, b: 1}]);
        expect(r3).to.eql({a: 0, b: {c: {d: {e: 'fff'}}, k: 'pp'}, c: {l:'tt'}});
        expect(r4.a).to.eql(1);
        expect(r4.date).to.be.instanceOf(Date);
        expect(r5).to.eql({ a: 1, nested: { a: 1 }, b: 2 });
      });
    });

    it('should take an anonymous function', function() {
      return Promise.all([
        r.expr({a: 0}).merge(function(doc) { return { b: doc('a').add(1) }; }),
        r.expr({a: 0}).merge({ b: r.row('a').add(1) })
      ])
      .spread(function(r1, r2) {
        expect(r1).to.eql({a: 0, b: 1});
        expect(r2).to.eql({a: 0, b: 1});
      });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.merge(); };
      expect(invalid).to.throw(/`merge` takes at least 1 argument, 0 provided/);
    });
  });

  describe('#append', function() {
    it('should work', function() {
      return r.expr([1,2,3]).append(4)
        .then(function(result) { expect(result).to.eql([1,2,3,4]); });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.append(); };
      expect(invalid).to.throw(/`append` takes 1 argument, 0 provided/);
    });
  });

  describe('#prepend', function() {
    it('should work', function() {
      return r.expr([1,2,3]).prepend(4)
        .then(function(result) { expect(result).to.eql([4,1,2,3]); });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.prepend(); };
      expect(invalid).to.throw(/`prepend` takes 1 argument, 0 provided/);
    });
  });

  describe('#difference', function() {
    it('should work', function() {
      return r.expr([1,2,3]).difference(r.expr([2,3,4]))
        .then(function(result) { expect(result).to.eql([1]); });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.difference(); };
      expect(invalid).to.throw(/`difference` takes 1 argument, 0 provided/);
    });
  });

  describe('#setInsert', function() {
    it('should work', function() {
      return Promise.all([
        r.expr([1,2,3]).setInsert(4),
        r.expr([1,2,3]).setInsert(2)
      ])
      .spread(function(r1, r2) {
        expect(r1).to.eql([1,2,3,4]);
        expect(r2).to.eql([1,2,3]);
      });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.setInsert(); };
      expect(invalid).to.throw(/`setInsert` takes 1 argument, 0 provided/);
    });
  });

  describe('#setUnion', function() {
    it('should work', function() {
      return r.expr([1,2,3]).setUnion([2,4])
        .then(function(result) { expect(result).to.eql([1,2,3,4]); });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.setUnion(); };
      expect(invalid).to.throw(/`setUnion` takes 1 argument, 0 provided/);
    });
  });

  describe('#setIntersection', function() {
    it('should work', function() {
      return r.expr([1,2,3]).setIntersection([2,4])
        .then(function(result) { expect(result).to.eql([2]); });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.setIntersection(); };
      expect(invalid).to.throw(/`setIntersection` takes 1 argument, 0 provided/);
    });
  });

  describe('#setDifference', function() {
    it('should work', function() {
      return r.expr([1,2,3]).setDifference([2,4])
        .then(function(result) { expect(result).to.eql([1, 3]); });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.setDifference(); };
      expect(invalid).to.throw(/`setDifference` takes 1 argument, 0 provided/);
    });
  });

  describe('#bracket / ()', function() {
    it('should work', function() {
      return Promise.all([
        r.expr({a:0, b:1})('a'),
        r.expr([{a:0, b:1}, {a:1}])('a')
      ])
      .spread(function(r1, r2) {
        expect(r1).to.equal(0);
        expect(r2).to.eql([0, 1]);
      });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table(); };
      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
    });
  });

  describe('#getField', function() {
    it('should work', function() {
      return r.expr({a:0, b:1}).getField('a')
        .then(function(result) { expect(result).to.equal(0); });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.getField(); };
      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
    });
  });

  describe('#hasFields', function() {
    it('should work', function() {
      return r.expr([{a: 0, b: 1, c: 2}, {a: 0, b: 10, c: 20}, {b:1, c:3}])
        .hasFields('a', 'c')
        .then(function(result) {
          expect(result).to.eql([{a: 0, b: 1, c: 2}, {a: 0, b: 10, c: 20}]);
        });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.hasFields(); };
      expect(invalid).to.throw(/`hasFields` takes at least 1 argument, 0 provided/);
    });
  });

  describe('#insertAt', function() {
    it('should work', function() {
      return Promise.all([
        r.expr([1,2,3,4]).insertAt(0, 2), r.expr([1,2,3,4]).insertAt(3, 2)
      ])
      .spread(function(r1, r2) {
        expect(r1).to.eql([2,1,2,3,4]);
        expect(r2).to.eql([1,2,3,2,4]);
      });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.insertAt(); };
      expect(invalid).to.throw(/`insertAt` takes 2 arguments, 0 provided/);
    });
  });

  describe('#spliceAt', function() {
    it('should work', function() {
      return r.expr([1,2,3,4]).spliceAt(1, [9, 9])
        .then(function(result) { expect(result).to.eql([1,9,9,2,3,4]); });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.spliceAt(); };
      expect(invalid).to.throw(/`spliceAt` takes at least 1 argument, 0 provided/);
    });
  });

  describe('#deleteAt', function() {
    it('should work', function() {
      return Promise.all([
        r.expr([1,2,3,4]).deleteAt(1), r.expr([1,2,3,4]).deleteAt(1, 3)
      ])
      .spread(function(r1, r2) {
        expect(r1).to.eql([1, 3, 4]);
        expect(r2).to.eql([1, 4]);
      });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.deleteAt(); };
      expect(invalid).to.throw(/`deleteAt` takes at least 1 argument, 0 provided/);
    });

    it('should throw if too many arguments passed', function() {
      var invalid = function() { return test.table.deleteAt(1, 1, 1, 1); };
      expect(invalid).to.throw(/`deleteAt` takes at most 2 arguments, 4 provided/);
    });
  });

  describe('#changeAt', function() {
    it('should work', function() {
      return r.expr([1,2,3,4]).changeAt(1, 3)
        .then(function(result) { expect(result).to.eql([1,3,3,4]); });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.changeAt(); };
      expect(invalid).to.throw(/`changeAt` takes at least 1 argument, 0 provided/);
    });
  });

  describe('#keys', function() {
    it('should work', function() {
      return r.expr({a:0, b:1, c:2}).keys().orderBy(r.row)
        .then(function(result) { expect(result).to.eql(['a','b','c']); });
    });

    it('should throw when called on strings', function() {
      expect(r.expr('hello').keys())
        .to.eventually.be.rejectedWith(/Cannot call `keys` on objects of type `STRING`/);
    });
  });

  describe('#literal', function() {
    it('should work', function() {
      return r.expr({a: {b: 1}}).merge({a: r.literal({c: 2})})
        .then(function(result) { expect(result).to.eql({a: {c: 2}}); });
    });

    it('is not defined after a term', function() {
      var invalid = function() { return r.expr(1).literal("foo"); };
      expect(invalid).to.throw(/`literal` is not defined after/);
    });

    it('should work with no arguments', function() {
      return r.expr({foo: 'bar'}).merge({foo: r.literal()})
        .then(function(result) { expect(result).to.eql({}); });
    });
  });

  describe('#object', function() {
    it('should work', function() {
      return r.object('a', 1, r.expr('2'), 'foo')
        .then(function(result) { expect(result).to.eql({"a": 1, "2": "foo"}); });
    });
  });

  describe('#values', function() {
    it('should work', function() {
      return r.expr({ a: 0, b: 1, c: 2 }).values().orderBy(r.row)
        .then(function(result) { expect(result).to.eql([0, 1, 2]); });
    });
  });
});
