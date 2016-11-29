"use strict";
var Promise = require('bluebird'),
    TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var test = new TestFixture();
describe('Control Structures', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });

  describe('#args', function() {
    it('should work', function() {
      return Promise.all([
        r.args([10, 20, 30]),
        r.expr({foo: 1, bar: 2, buzz: 3}).pluck(r.args(['foo', 'buzz']))
      ])
      .spread(function(r1, r2) {
        expect(r1).to.eql([10, 20, 30]),
        expect(r2).to.eql({foo: 1, buzz: 3});
      });
    });

    it('should throw if an implicit var is passed inside', function() {
      var invalid = function() {
        return r.table('foo').eqJoin(r.args([ r.row, r.table('bar') ]));
      };
      expect(invalid).to.throw('Implicit variable `r.row` cannot be used inside `r.args`.');
    });
  });

  describe('#binary', function() {
  });

  describe('#do', function() {
    it('should work', function() {
      return Promise.all([
        r.expr({ a: 1 }).do( function(doc) { return doc('a'); }),
        r.do(1, 2, function(a, b) { return a; }),
        r.do(1, 2, function(a, b) { return b; })
      ])
      .spread(function(r1, r2, r3) {
        expect(r1).to.equal(1);
        expect(r2).to.equal(1);
        expect(r3).to.equal(2);
      });
    });

    it('should throw if no arguments are given', function() {
      var invalid = function() { return r.expr(1).do(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });
  });

  describe('#branch', function() {
    it('should work', function() {
      return Promise.all([
        r.branch(true, 1, 2), r.branch(false, 1, 2),
        r.expr(false).branch('foo', false, 'bar', 'lol'),
        r.expr(true).branch('foo', false, 'bar', 'lol'),
        r.expr(false).branch('foo', true, 'bar', 'lol')
      ])
      .spread(function(r1, r2, r3, r4, r5) {
        expect(r1).to.equal(1);
        expect(r2).to.equal(2);
        expect(r3).to.equal('lol');
        expect(r4).to.equal('foo');
        expect(r5).to.equal('bar');
      });
    });

    it('should throw if no arguments are given', function() {
      var invalid = function() { return r.branch(); };
      expect(invalid).to.throw(/takes at least 3 arguments, 0 provided/);
    });

    it('should throw if just one argument is given', function() {
      var invalid = function() { return r.branch(true); };
      expect(invalid).to.throw(/takes at least 3 arguments, 1 provided/);
    });

    it('should throw if just two arguments are given', function() {
      var invalid = function() { return r.branch(true, true); };
      expect(invalid).to.throw(/takes at least 3 arguments, 2 provided/);
    });

    it('is defined after a term', function() {
      return Promise.all([
        r.expr(true).branch(2, 3), r.expr(false).branch(2, 3)
      ])
      .spread(function(r1, r2) {
        expect(r1).to.equal(2);
        expect(r2).to.equal(3);
      });
    });
  });

  describe('#forEach', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.expr([ { foo: 'bar' }, { foo: 'foo' }]).forEach(function(doc) {
          return test.table.insert(doc);
        })
        .then(function(result) { expect(result.inserted).to.equal(2); });
    });

    it('should throw if not given a function', function() {
      var invalid = function() {
        return r.expr([ { foo: 'bar' }, { foo: 'foo' } ]).forEach();
      };
      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
    });
  });

  describe('#range', function() {
    it('should work with a single argument', function() {
      return r.range(10)
        .then(function(result) { expect(result).to.eql([0,1,2,3,4,5,6,7,8,9]); });
    });

    it('should work with two arguments', function() {
      return r.range(3, 10)
        .then(function(result) { expect(result).to.eql([3,4,5,6,7,8,9]); });
    });

    it('should throw if given too many arguments', function() {
      var invalid = function() { return r.range(1, 2, 3); };
      expect(invalid).to.throw(/takes at most 2 arguments, 3 provided/);
    });

    it('should throw if no arguments are given', function() {
      var invalid = function() { return r.range(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });
  });

  describe('#error', function() {
  });

  describe('#default', function() {
    it('should work', function() {
      return r.expr({ a: 1 })('b').default('Hello')
        .then(function(result) { expect(result).to.equal('Hello'); });
    });

    it('should throw if no argument is given', function() {
      var invalid = function() { return r.expr({})('').default(); };
      expect(invalid).to.throw(/takes 1 argument, 0 provided after/);
    });
  });

  describe('#expr', function() {
  });

  describe('#js', function() {
    it('should work', function() {
      return r.js('1').then(function(result) { expect(result).to.equal(1); });
    });

    it('is not defined after a term', function() {
      var invalid = function() { return r.expr(1).js('foo'); };
      expect(invalid).to.throw(/is not defined after/);
    });

    it('should throw if no argument is given', function() {
      var invalid = function() { return r.js(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });
  });

  describe('#coerceTo', function() {
    it('should work', function() {
      return r.expr(1).coerceTo('STRING')
        .then(function(result) { expect(result).to.equal('1'); });
    });

    it('should throw if no argument has been given', function() {
      var invalid = function() { return r.expr(1).coerceTo(); };
      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
    });
  });

  describe('#typeOf', function() {
    it('should work after a term', function() {
      return r.expr(1).typeOf()
        .then(function(result) { expect(result).to.equal('NUMBER'); });
    });

    it('should work', function() {
      return r.typeOf(1).then(function(result) { expect(result).to.equal('NUMBER'); });
    });
  });

  describe('#info', function() {
  });

  describe('#json', function() {
    it('should work', function() {
      return Promise.all([
        r.json(JSON.stringify({ a: 1 })),
        r.json('{}')
      ])
      .spread(function(r1, r2) {
        expect(r1).to.eql({ a: 1 });
        expect(r2).to.eql({});
      });
    });

    it('should throw if no arguments are given', function() {
      var invalid = function() { return r.json(); };
      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
    });

    it('is not defined after a term', function() {
      var invalid = function() { return r.expr(1).json('1'); };
      expect(invalid).to.throw(/is not defined after/);
    });
  });

  describe('#toJsonString', function() {
  });

  describe('#toJSON / toJsonString', function() {
    it('should work', function() {
      return Promise.all([
        r.expr({ a: 1 }).toJSON(),
        r.expr({ a: 1 }).toJsonString()
      ])
      .spread(function(r1, r2) {
        expect(r1).to.equal('{"a":1}');
        expect(r2).to.equal('{"a":1}');
      });
    });

    it('should throw if an argument is provided', function() {
      var invalid = function() { return r.expr({ a: 1 }).toJSON('foo'); };
      expect(invalid).to.throw(/takes 0 argument, 1 provided/);

      invalid = function() { return r.expr({ a: 1 }).toJsonString('foo'); };
      expect(invalid).to.throw(/takes 0 argument, 1 provided/);
    });
  });

  describe('#http', function() {
    it('should work', function() {
      return r.http('http://google.com')
        .then(function(result) { expect(result).to.be.a('string'); });
    });

    it('should work with options', function() {
      return r.http('http://google.com', { timeout: 60 })
        .then(function(result) { expect(result).to.be.a('string'); });
    });

    it('should throw with an unrecognized option', function() {
      var invalid = function() { return r.http('http://google.com', { foo: 60 }); };
      expect(invalid).to.throw(/Unrecognized option `foo` in `http`/);
    });
  });

  describe('#uuid', function() {
    it('should work', function() {
      return r.uuid().then(function(result) { expect(result).to.be.a('string'); });
    });

    it('should support an optional string argument (for determinism)', function() {
      return r.uuid('deterministic')
        .then(function(result) { expect(result).to.equal('8757234f-0223-5ee8-b375-c39d595bee18'); });
    });
  });
});
