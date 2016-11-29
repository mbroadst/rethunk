"use strict";
var Promise = require('bluebird'),
    TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var test = new TestFixture();
describe('Transformations', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });

  describe('#map', function() {
    afterEach(function() { return test.cleanTables(); });

    it('should work on arrays (r.row)', function() {
      return Promise.all([
        r.expr([ 1, 2, 3 ]).map(r.row),
        r.expr([ 1, 2, 3 ]).map(r.row.add(1))
      ])
      .spread(function(r1, r2) {
        expect(r1).to.eql([ 1, 2, 3 ]);
        expect(r2).to.eql([ 2, 3, 4 ]);
      });
    });

    it('should work on arrays (lambda)', function() {
      return Promise.all([
        r.expr([ 1, 2, 3 ]).map(function(doc) { return doc; }),
        r.expr([ 1, 2, 3 ]).map(function(doc) { return doc.add(2); })
      ])
      .spread(function(r1, r2) {
        expect(r1).to.eql([ 1, 2, 3 ]);
        expect(r2).to.eql([ 3, 4, 5 ]);
      });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.map(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });
  });

  describe('#withFields', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work on arrays (single field)', function() {
      return r.expr([{a: 0, b: 1, c: 2}, {a: 4, b: 4, c: 5}, {a:9, b:2, c:0}]).withFields('a')
        .then(function(result) { expect(result).to.eql([{a: 0}, {a: 4}, {a: 9}]); });
    });

    it('should work on arrays (multiple field)', function() {
      return r.expr([{a: 0, b: 1, c: 2}, {a: 4, b: 4, c: 5}, {a:9, b:2, c:0}]).withFields('a', 'c')
        .then(function(result) { expect(result).to.eql([{a: 0, c: 2}, {a: 4, c: 5}, {a:9, c:0}]); });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.withFields(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });
  });

  describe('#concatMap', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work on arrays (lambda)', function() {
      return r.expr([[1, 2], [3], [4]]).concatMap(function(doc) { return doc; })
        .then(function(result) { expect(result).to.eql([1, 2, 3, 4]); });
    });

    it('should work on arrays (r.row)', function() {
      return r.expr([[1, 2], [3], [4]]).concatMap(r.row)
        .then(function(result) { expect(result).to.eql([1, 2, 3, 4]); });
    });

    it('should throw if no argument has been passed', function() {
      var invalid = function() { return test.table.concatMap(); };
      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
    });
  });

  describe('#orderBy', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work on arrays (string)', function() {
      return r.expr([{a:23}, {a:10}, {a:0}, {a:100}]).orderBy('a')
        .then(function(result) { expect(result).to.eql([{a:0}, {a:10}, {a:23}, {a:100}]); });
    });

    it('should work on arrays (r.row)', function() {
      return r.expr([{a:23}, {a:10}, {a:0}, {a:100}]).orderBy(r.row('a'))
        .then(function(result) { expect(result).to.eql([{a:0}, {a:10}, {a:23}, {a:100}]); });
    });

    it('should work on a table (by pk)', function() {
      return test.table.insert([ { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 } ])
        .then(function() {
          return test.table.orderBy({ index: 'id' })
            .then(function(results) {
              expect(results).to.not.be.empty;
              for (var i = 0; i < results.length - 1; ++i)
                expect(results[i].id < results[i + 1].id);
            });
        });
    });

    it('should work on a table (by secondary index)', function() {
      return test.table.indexCreate('val')
        .then(function() {
          return test.table.indexWait('val');
        })
        .then(function() {
          return test.table.insert([
            { id: 1, val: 4 }, { id: 2, val: 3 }, { id: 3, val: 2 }, { id: 4, val: 1 }
          ]);
        })
        .then(function() {
          return test.table.orderBy({ index: 'val' });
        })
        .then(function(results) {
          expect(results).to.not.be.empty;
          for (var i = 0; i < results.length - 1; ++i)
            expect(results[i].val < results[i + 1].val);
        });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.orderBy(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });

    it('should not wrap on r.asc', function() {
      return r.expr([{a:23}, {a:10}, {a:0}, {a:100}]).orderBy(r.asc(r.row('a')))
        .then(function(result) { expect(result).to.eql([{a:0}, {a:10}, {a:23}, {a:100}]); });
    });

    it('should not wrap on r.desc', function() {
      return r.expr([{a:23}, {a:10}, {a:0}, {a:100}]).orderBy(r.desc(r.row('a')))
        .then(function(result) { expect(result).to.eql([{a:100}, {a:23}, {a:10}, {a:0}]); });
    });

    it('r.desc should work', function() {
      return r.expr([{a:23}, {a:10}, {a:0}, {a:100}]).orderBy(r.desc('a'))
        .then(function(result) { expect(result).to.eql([{a:100}, {a:23}, {a:10}, {a:0}]); });
    });

    it('r.asc should work', function() {
      return r.expr([{a:23}, {a:10}, {a:0}, {a:100}]).orderBy(r.asc('a'))
        .then(function(result) { expect(result).to.eql([{a:0}, {a:10}, {a:23}, {a:100}]); });
    });

    it('should throw if desc is used after a term', function() {
      var invalid = function() { return r.expr(1).desc('foo'); };
      expect(invalid).to.throw(/is not defined after/);
      expect(invalid).to.throw(r.Error.ReqlDriverError);
    });

    it('should throw if asc is used after a term', function() {
      var invalid = function() { return r.expr(1).asc('foo'); };
      expect(invalid).to.throw(/is not defined after/);
      expect(invalid).to.throw(r.Error.ReqlDriverError);
    });
  });

  describe('#skip', function() {
    afterEach(function() { return test.cleanTables(); });

    it('should work', function() {
      return r.expr([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]).skip(3)
        .then(function(result) { expect(result).to.eql([ 3, 4, 5, 6, 7, 8, 9 ]); });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.skip(); };
      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
    });
  });

  describe('#limit', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.expr([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]).limit(3)
        .then(function(result) { expect(result).to.eql([ 0, 1, 2 ]); });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.limit(); };
      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
    });
  });

  describe('#slice', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.expr([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(3, 5)
        .then(function(result) { expect(result).to.eql([3, 4]); });
    });

    it('should handle options, and an optional end', function() {
      return Promise.all([
        r.expr([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(3),
        r.expr([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(3, { leftBound: 'open' }),
        r.expr([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(3, 5, { leftBound: 'open' })
      ])
      .spread(function(r1, r2, r3) {
        expect(r1).to.eql([3, 4, 5, 6, 7, 8, 9]);
        expect(r2).to.eql([4, 5, 6, 7, 8, 9]);
        expect(r3).to.eql([4]);
      });
    });

    it('`slice` should work -- with options', function() {
      var sampleData = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
      return Promise.all([
        r.expr(sampleData).slice(5, 10, { rightBound: 'closed' }),
        r.expr(sampleData).slice(5, 10, { rightBound: 'open' }),
        r.expr(sampleData).slice(5, 10, { leftBound: 'open' }),
        r.expr(sampleData).slice(5, 10, { leftBound: 'closed' }),
        r.expr(sampleData).slice(5, 10, { leftBound:'closed', rightBound: 'closed' })
      ])
      .spread(function(r1, r2, r3, r4, r5) {
        expect(r1).to.eql([5, 6, 7, 8, 9, 10]);
        expect(r2).to.eql([5, 6, 7, 8, 9]);
        expect(r3).to.eql([6, 7, 8, 9]);
        expect(r4).to.eql([5, 6, 7, 8, 9]);
        expect(r5).to.eql([5, 6, 7, 8, 9, 10]);
      });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.slice(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });
  });

  describe('#nth', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.expr([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]).nth(3)
        .then(function(result) { expect(result).to.eql(3); });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.nth(); };
      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
    });
  });

  describe('#offsetsOf', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work (r.row)', function() {
      return r.expr([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).offsetsOf(r.row.eq(3))
        .then(function(result) { expect(result).to.eql([ 3 ]); });
    });

    it('should work (lambda)', function() {
      return r.expr([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).offsetsOf(function(doc) { return doc.eq(3); })
        .then(function(result) { expect(result).to.eql([ 3 ]); });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.offsetsOf(); };
      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
    });
  });

  describe('#isEmpty', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return Promise.all([
        r.expr([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]).isEmpty(),
        r.expr([]).isEmpty()
      ])
      .spread(function(r1, r2) {
        expect(r1).to.be.false;
        expect(r2).to.be.true;
      });
    });
  });

  describe('#union', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work (1)', function() {
      return r.expr([ 0, 1, 2 ]).union([ 3, 4, 5 ])
        .then(function(result) { expect(result).to.eql([ 0, 1, 2, 3, 4, 5 ]); });
    });

    it('should work (2)', function() {
      return r.union([ 0, 1, 2 ], [ 3, 4, 5 ], [ 6, 7 ])
        .then(function(result) { expect(result).to.eql([ 0, 1, 2, 3, 4, 5, 6, 7 ]); });
    });

    it('should work (3)', function() {
      return r.union().then(function(result) { expect(result).to.eql([]); });
    });

    it('should work with interleave - 1', function() {
      return r.expr([0, 1, 2]).union([3, 4, 5], { interleave: false }).run()
        .then(function(result) { expect(result).to.eql([0, 1, 2, 3, 4, 5]); });
    });

    it('should work with interleave - 1', function() {
      return r.expr([{ name: 'Michel' }, { name: 'Sophie' }, { name: 'Laurent' }])
        .orderBy('name')
        .union(r.expr([{ name: 'Moo' }, { name: 'Bar' }])
        .orderBy('name'), { interleave: 'name' }).run()
        .then(function(result) {
          expect(result).to.eql([
            { name: 'Bar' }, { name: 'Laurent' }, { name: 'Michel' },
            { name: 'Moo' }, { name: 'Sophie' }
          ]);
        });
    });
  });

  describe('#sample', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.expr([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]).sample(2)
        .then(function(result) {
          expect(result).to.have.length(2);
          expect([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]).to.include.members(result);
        });
    });

    it('should throw if passed -1', function() {
      var query = r.expr([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]).sample(-1);
      expect(query)
        .to.eventually.be.rejectedWith('Number of items to sample must be non-negative, got `-1`');
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.sample(); };
      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
    });
  });

});
