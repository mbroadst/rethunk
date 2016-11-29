"use strict";
var Promise = require('bluebird'),
    TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var test = new TestFixture();
describe('Math and Logic', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });

  describe('#add', function() {
    it('should work', function() {
      return Promise.all([
        r.expr(1).add(1), r.expr(1).add(1).add(1), r.expr(1).add(1, 1), r.add(1, 1, 1)
      ])
      .spread(function(r1, r2, r3, r4) {
        expect(r1).to.equal(2);
        expect(r2).to.equal(3);
        expect(r3).to.equal(3);
        expect(r4).to.equal(3);
      });
    });

    it('should throw if no arguments are passed when used after a term', function() {
      var invalid = function() { return r.expr(1).add(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return r.add(); };
      expect(invalid).to.throw(/takes at least 2 arguments, 0 provided/);
    });

    it('should throw if just one argument is passed', function() {
      var invalid = function() { return r.add(1); };
      expect(invalid).to.throw(/takes at least 2 arguments, 1 provided/);
    });
  });

  describe('#sub', function() {
    it('should work', function() {
      return Promise.all([
        r.expr(1).sub(1), r.sub(5, 3, 1)
      ])
      .spread(function(r1, r2) {
        expect(r1).to.equal(0);
        expect(r2).to.equal(1);
      });
    });

    it('should throw if no arguments are passed when used after a term', function() {
      var invalid = function() { return r.expr(1).sub(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return r.sub(); };
      expect(invalid).to.throw(/takes at least 2 arguments, 0 provided/);
    });

    it('should throw if just one argument is passed', function() {
      var invalid = function() { return r.sub(1); };
      expect(invalid).to.throw(/takes at least 2 arguments, 1 provided/);
    });
  });

  describe('#mul', function() {
    it('should work', function() {
      return Promise.all([
        r.expr(2).mul(3), r.mul(2, 3, 4)
      ])
      .spread(function(r1, r2) {
        expect(r1).to.equal(6);
        expect(r2).to.equal(24);
      });
    });

    it('should throw if no arguments are passed when used after a term', function() {
      var invalid = function() { return r.expr(1).mul(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return r.mul(); };
      expect(invalid).to.throw(/takes at least 2 arguments, 0 provided/);
    });

    it('should throw if just one argument is passed', function() {
      var invalid = function() { return r.mul(1); };
      expect(invalid).to.throw(/takes at least 2 arguments, 1 provided/);
    });
  });

  describe('#div', function() {
    it('should work', function() {
      return Promise.all([
        r.expr(24).div(2), r.div(20, 2, 5, 1)
      ])
      .spread(function(r1, r2) {
        expect(r1).to.equal(12);
        expect(r2).to.equal(2);
      });
    });

    it('should throw if no arguments are passed when used after a term', function() {
      var invalid = function() { return r.expr(1).div(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return r.div(); };
      expect(invalid).to.throw(/takes at least 2 arguments, 0 provided/);
    });

    it('should throw if just one argument is passed', function() {
      var invalid = function() { return r.div(1); };
      expect(invalid).to.throw(/takes at least 2 arguments, 1 provided/);
    });
  });

  describe('#mod', function() {
    it('should work', function() {
      return Promise.all([
        r.expr(24).mod(7), r.mod(24, 7)
      ])
      .spread(function(r1, r2) {
        expect(r1).to.equal(3);
        expect(r2).to.equal(3);
      });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return r.expr(1).mod(); };
      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
    });

    it('should throw if more than two arguments are passed', function() {
      var invalid = function() { return r.mod(24, 7, 2); };
      expect(invalid).to.throw(/takes 2 arguments, 3 provided/);
    });
  });

  describe('#and', function() {
    it('should work', function() {
      return Promise.all([
        r.expr(true).and(false), r.expr(true).and(true),
        r.and(true, true, true), r.and(true, true, true, false),
        r.and(r.args([true, true, true]))
      ])
      .spread(function(r1, r2, r3, r4, r5) {
        expect(r1).to.be.false;
        expect(r2).to.be.true;
        expect(r3).to.be.true;
        expect(r4).to.be.false;
        expect(r5).to.be.true;
      });
    });

    it('should work if no arguments are passed', function() {
      return r.and()
        .then(function(result) { expect(result).to.be.true; });
    });
  });

  describe('#or', function() {
    it('should work', function() {
      return Promise.all([
        r.expr(true).or(false), r.expr(false).or(false),
        r.or(true, true, true), r.or(r.args([false, false, true])),
        r.or(false, false, false, false)
      ])
      .spread(function(r1, r2, r3, r4, r5) {
        expect(r1).to.be.true;
        expect(r2).to.be.false;
        expect(r3).to.be.true;
        expect(r4).to.be.true;
        expect(r5).to.be.false;
      });
    });

    it('should work if no arguments are passed', function() {
      return r.or()
        .then(function(result) { expect(result).to.be.false; });
    });
  });

  describe('#eq', function() {
    it('should work', function() {
      return Promise.all([
        r.expr(1).eq(1), r.expr(1).eq(2), r.eq(1, 1, 1, 1), r.eq(1, 1, 2, 1)
      ])
      .spread(function(r1, r2, r3, r4) {
        expect(r1).to.be.true;
        expect(r2).to.be.false;
        expect(r3).to.be.true;
        expect(r4).to.be.false;
      });
    });

    it('should throw if no arguments are passed when used after a term', function() {
      var invalid = function() { return r.expr(1).eq(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return r.eq(); };
      expect(invalid).to.throw(/takes at least 2 arguments, 0 provided/);
    });

    it('should throw if just one argument is passed', function() {
      var invalid = function() { return r.eq(1); };
      expect(invalid).to.throw(/takes at least 2 arguments, 1 provided/);
    });
  });

  describe('#ne', function() {
    it('should work', function() {
      return Promise.all([
        r.expr(1).ne(1), r.expr(1).ne(2), r.ne(1, 1, 1, 1), r.ne(1, 1, 2, 1)
      ])
      .spread(function(r1, r2, r3, r4) {
        expect(r1).to.be.false;
        expect(r2).to.be.true;
        expect(r3).to.be.false;
        expect(r4).to.be.true;
      });
    });

    it('should throw if no arguments are passed when used after a term', function() {
      var invalid = function() { return r.expr(1).ne(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return r.ne(); };
      expect(invalid).to.throw(/takes at least 2 arguments, 0 provided/);
    });

    it('should throw if just one argument is passed', function() {
      var invalid = function() { return r.ne(1); };
      expect(invalid).to.throw(/takes at least 2 arguments, 1 provided/);
    });
  });

  describe('#gt', function() {
    it('should work', function() {
      return Promise.all([
        r.expr(1).gt(2), r.expr(2).gt(2), r.expr(3).gt(2),
        r.gt(10, 9, 7, 2), r.gt(10, 9, 9, 1)
      ])
      .spread(function(r1, r2, r3, r4, r5) {
        expect(r1).to.be.false;
        expect(r2).to.be.false;
        expect(r3).to.be.true;
        expect(r4).to.be.true;
        expect(r5).to.be.false;
      });
    });

    it('should throw if no arguments are passed when used after a term', function() {
      var invalid = function() { return r.expr(1).gt(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return r.gt(); };
      expect(invalid).to.throw(/takes at least 2 arguments, 0 provided/);
    });

    it('should throw if just one argument is passed', function() {
      var invalid = function() { return r.gt(1); };
      expect(invalid).to.throw(/takes at least 2 arguments, 1 provided/);
    });
  });

  describe('#ge', function() {
    it('should work', function() {
      return Promise.all([
        r.expr(1).ge(2), r.expr(2).ge(2), r.expr(3).ge(2),
        r.ge(10, 9, 7, 2), r.ge(10, 9, 9, 1), r.ge(10, 9, 10, 1)
      ])
      .spread(function(r1, r2, r3, r4, r5, r6) {
        expect(r1).to.be.false;
        expect(r2).to.be.true;
        expect(r3).to.be.true;
        expect(r4).to.be.true;
        expect(r5).to.be.true;
        expect(r6).to.be.false;
      });
    });

    it('should throw if no arguments are passed when used after a term', function() {
      var invalid = function() { return r.expr(1).ge(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return r.ge(); };
      expect(invalid).to.throw(/takes at least 2 arguments, 0 provided/);
    });

    it('should throw if just one argument is passed', function() {
      var invalid = function() { return r.ge(1); };
      expect(invalid).to.throw(/takes at least 2 arguments, 1 provided/);
    });
  });

  describe('#lt', function() {
    it('should work', function() {
      return Promise.all([
        r.expr(1).lt(2), r.expr(2).lt(2), r.expr(3).lt(2),
        r.lt(0, 2, 4, 20), r.lt(0, 2, 2, 4), r.lt(0, 2, 1, 20)
      ])
      .spread(function(r1, r2, r3, r4, r5, r6) {
        expect(r1).to.be.true;
        expect(r2).to.be.false;
        expect(r3).to.be.false;
        expect(r4).to.be.true;
        expect(r5).to.be.false;
        expect(r6).to.be.false;
      });
    });

    it('should throw if no arguments are passed when used after a term', function() {
      var invalid = function() { return r.expr(1).lt(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return r.lt(); };
      expect(invalid).to.throw(/takes at least 2 arguments, 0 provided/);
    });

    it('should throw if just one argument is passed', function() {
      var invalid = function() { return r.lt(1); };
      expect(invalid).to.throw(/takes at least 2 arguments, 1 provided/);
    });
  });

  describe('#le', function() {
    it('should work', function() {
      return Promise.all([
        r.expr(1).le(2), r.expr(2).le(2), r.expr(3).le(2),
        r.le(0, 2, 4, 20), r.le(0, 2, 2, 4), r.le(0, 2, 1, 20)
      ])
      .spread(function(r1, r2, r3, r4, r5, r6) {
        expect(r1).to.be.true;
        expect(r2).to.be.true;
        expect(r3).to.be.false;
        expect(r4).to.be.true;
        expect(r5).to.be.true;
        expect(r6).to.be.false;
      });
    });

    it('should throw if no arguments are passed when used after a term', function() {
      var invalid = function() { return r.expr(1).le(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return r.le(); };
      expect(invalid).to.throw(/takes at least 2 arguments, 0 provided/);
    });

    it('should throw if just one argument is passed', function() {
      var invalid = function() { return r.le(1); };
      expect(invalid).to.throw(/takes at least 2 arguments, 1 provided/);
    });
  });

  describe('#not', function() {
    it('should work', function() {
      return Promise.all([
        r.expr(true).not(), r.expr(false).not()
      ])
      .spread(function(r1, r2) {
        expect(r1).to.be.false;
        expect(r2).to.be.true;
      });
    });
  });

  describe('#random', function() {
    it('should work', function() {
      return Promise.all([
        r.random(), r.random(10), r.random(5, 10),
        r.random(5, 10, { float: true }),
        r.random(5, { float: true })
      ])
      .spread(function(r1, r2, r3, r4, r5) {
        expect(r1).to.be.greaterThan(0).and.lessThan(1);
        expect(r2).to.be.at.least(0).and.lessThan(10);
        expect(r3).to.be.at.least(5).and.lessThan(10);
        expect(r4).to.be.above(5).and.lessThan(10);
        expect(r5).to.be.lessThan(5).and.greaterThan(0);
      });
    });
  });

  describe('#round', function() {
    it('should work', function() {
      return Promise.all([
        r.round(1.8), r.expr(1.8).round(), r.round(1.2), r.expr(1.2).round()
      ])
      .spread(function(r1, r2, r3, r4) {
        expect(r1).to.equal(2);
        expect(r2).to.equal(2);
        expect(r3).to.equal(1);
        expect(r4).to.equal(1);
      });
    });
  });

  describe('#ceil', function() {
    it('should work', function() {
      return Promise.all([
        r.ceil(1.2), r.expr(1.2).ceil(), r.ceil(1.8), r.expr(1.8).ceil()
      ])
      .spread(function(r1, r2, r3, r4) {
        expect(r1).to.equal(2);
        expect(r2).to.equal(2);
        expect(r3).to.equal(2);
        expect(r4).to.equal(2);
      });
    });
  });

  describe('#floor', function() {
    it('should work', function() {
      return Promise.all([
        r.floor(1.2), r.expr(1.2).floor(), r.floor(1.8), r.expr(1.8).floor()
      ])
      .spread(function(r1, r2, r3, r4) {
        expect(r1).to.equal(1);
        expect(r2).to.equal(1);
        expect(r3).to.equal(1);
        expect(r4).to.equal(1);
      });
    });
  });
});

