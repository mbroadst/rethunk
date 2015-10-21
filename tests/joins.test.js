"use strict";
var TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var test = new TestFixture();
describe('Joins', function() {
  after(function() { return test.teardown(); });
  before(function() {
    return test.setup()
      .then(function() {
        return test.table.insert([{val:1}, {val: 2}, {val: 3}]);
      })
      .then(function(result) {
        expect(result.inserted).to.equal(3);
        test.pks = result.generated_keys;

        return test.table.indexCreate('val');
      })
      .then(function() { return test.table.indexWait('val'); });
  });

  describe('#innerJoin', function() {
    it('should join two arrays', function() {
      return r.expr([1,2,3]).innerJoin(r.expr([1,2,3]), function(left, right) {
        return left.eq(right);
      })
      .then(function(result) {
        expect(result).to.eql([{left:1, right:1}, {left:2, right: 2}, {left:3, right: 3}]);
      });
    });

    it('should join an array with a table stream', function() {
      return r.expr([1,2,3]).innerJoin(test.table, function(left, right) {
        return left.eq(right('val'));
      })
      .then(function(result) {
        expect(result).to.eql([
          { left: 1,
            right: { id: test.pks[0], val: 1 } },
          { left: 2,
            right: { id: test.pks[1], val: 2 } },
          { left: 3,
            right: { id: test.pks[2], val: 3 } } ]);
      });
    });

    it('should join a stream to a stream', function() {
      return test.table.innerJoin(test.table, function(left, right) {
        return left.eq(right);
      })
      .then(function(result) {
        expect(result).to.have.length(3);
        expect(result[0].left).to.exist;
        expect(result[0].right).to.exist;
        expect(result[1].left).to.exist;
        expect(result[1].right).to.exist;
        expect(result[2].left).to.exist;
        expect(result[2].right).to.exist;
      });
    });

    it('should throw if given no sequence', function() {
      var invalid = function() { return test.table.innerJoin(); };
      expect(invalid).to.throw(/`innerJoin` takes 2 arguments, 0 provided/);
    });

    it('should throw if no predicate given', function() {
      var invalid = function() { return test.table.innerJoin(r.expr([1,2,3])); };
      expect(invalid).to.throw(/`innerJoin` takes 2 arguments, 1 provided/);
    });
  });

  describe('#outerJoin', function() {
    it('should join an array to an array', function() {
      return r.expr([1,2,3]).outerJoin(r.expr([1,2,3]), function(left, right) {
        return left.eq(right);
      })
      .then(function(result) {
        expect(result).to.eql([{left:1, right:1}, {left:2, right: 2}, {left:3, right: 3}]);
      });
    });

    it('should join an array to a stream', function() {
      return r.expr([1,2,3,4]).outerJoin(test.table, function(left, right) {
        return left.eq(right('val'));
      })
      .then(function(result) {
        expect(result).to.have.length(4);
        expect(result[0].left).to.exist;
        expect(result[0].right).to.exist;
        expect(result[1].left).to.exist;
        expect(result[1].right).to.exist;
        expect(result[2].left).to.exist;
        expect(result[2].right).to.exist;
      });
    });

    it('should join an array to a stream (2)', function() {
      return r.expr([1,2,3,4]).outerJoin(test.table, function(left, right) {
        return left.eq(right("val"));
      })
      .then(function(result) {
        expect(result).to.have.length(4);
        expect(result[0].left).to.exist;
        expect(result[0].right).to.exist;
        expect(result[1].left).to.exist;
        expect(result[1].right).to.exist;
        expect(result[2].left).to.exist;
        expect(result[2].right).to.exist;
        expect(result[3].left).to.exist;
        expect(result[3].right).to.be.undefined;
      });
    });

    it('should join a stream to a stream', function() {
      return test.table.outerJoin(test.table, function(left, right) {
        return left.eq(right);
      })
      .then(function(result) {
        expect(result).to.have.length(3);
        expect(result[0].left).to.exist;
        expect(result[0].right).to.exist;
        expect(result[1].left).to.exist;
        expect(result[1].right).to.exist;
        expect(result[2].left).to.exist;
        expect(result[2].right).to.exist;
      });
    });

    it('should throw if no sequence given', function() {
      var invalid = function() { return test.table.outerJoin(); };
      expect(invalid).to.throw(/`outerJoin` takes 2 arguments, 0 provided/);
    });

    it('should throw if no predicate given', function() {
      var invalid = function() { return test.table.outerJoin(r.expr([1,2,3])); };
      expect(invalid).to.throw(/`outerJoin` takes 2 arguments, 1 provided/);
    });

  });

  describe('#eqJoin', function() {
    it('should join an array to a stream by primary key using a function', function() {
      return r.expr(test.pks).eqJoin(function(doc) { return doc; }, test.table)
        .then(function(result) {
          expect(result).to.have.length(3);
          expect(result[0].left).to.exist;
          expect(result[0].right).to.exist;
          expect(result[1].left).to.exist;
          expect(result[1].right).to.exist;
          expect(result[2].left).to.exist;
          expect(result[2].right).to.exist;
        });
    });

    it('should join an array to a stream by primary key using r.row', function() {
      return r.expr(test.pks).eqJoin(r.row, test.table)
        .then(function(result) {
          expect(result).to.have.length(3);
          expect(result[0].left).to.exist;
          expect(result[0].right).to.exist;
          expect(result[1].left).to.exist;
          expect(result[1].right).to.exist;
          expect(result[2].left).to.exist;
          expect(result[2].right).to.exist;
        });
    });

    it('should join an array to a stream using secondary index using r.row', function() {
      return r.expr([1,2,3]).eqJoin(r.row, test.table, { index: 'val' })
        .then(function(result) {
          expect(result).to.have.length(3);
          expect(result[0].left).to.exist;
          expect(result[0].right).to.exist;
          expect(result[1].left).to.exist;
          expect(result[1].right).to.exist;
          expect(result[2].left).to.exist;
          expect(result[2].right).to.exist;
        });
    });

    it('should throw if given no arguments', function() {
      var invalid = function() { return test.table.eqJoin(); };
      expect(invalid).to.throw(/`eqJoin` takes at least 2 arguments, 0 provided/);
    });

    it('should throw if given an invalid key', function() {
      var invalid = function() {
        return r.expr([1,2,3]).eqJoin(r.row, test.table, { invalid: 'val' });
      };
      expect(invalid).to.throw(/Unrecognized option `invalid` in `eqJoin`/);
    });

    it('should throw if not given a sequence', function() {
      var invalid = function() { return test.table.eqJoin('id'); };
      expect(invalid).to.throw(/`eqJoin` takes at least 2 arguments, 1 provided/);
    });

    it('should throw if given too many arguments', function() {
      var invalid = function() { return test.table.eqJoin(1, 1, 1, 1, 1); };
      expect(invalid).to.throw(/`eqJoin` takes at most 3 arguments, 5 provided/);
    });
  });

  describe('#zip', function() {
    it('should work', function() {
      return r.expr(test.pks).eqJoin(function(doc) { return doc; }, test.table).zip()
        .then(function(result) {
          expect(result).to.have.length(3);
          expect(result[0].left).to.be.undefined;
        });
    });
  });

});
