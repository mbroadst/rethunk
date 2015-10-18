"use strict";
var Promise = require('bluebird'),
    TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var test = new TestFixture();
describe('Dates and Times', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });

  describe('#now', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should return a date', function() {
      return Promise.all([
        r.now(), r.expr({a: r.now()}), r.expr([r.now()]),
        r.expr([{}, {a: r.now()}]), r.expr({b: [{}, {a: r.now()}]})
      ])
      .spread(function(r1, r2, r3, r4, r5) {
        expect(r1).to.be.instanceOf(Date);
        expect(r2.a).to.be.instanceOf(Date);
        expect(r3[0]).to.be.instanceOf(Date);
        expect(r4[1].a).to.be.instanceOf(Date);
        expect(r5.b[1].a).to.be.instanceOf(Date);
      });
    });

    it('should throw if now is used after a term', function() {
      var invalid = function() { return r.expr(1).now('foo'); };
      expect(invalid).to.throw(/is not defined after/);
      expect(invalid).to.throw(r.Error.ReqlDriverError);
    });
  });

  describe('#time', function() {
    afterEach(function() { return test.cleanTables(); });

    it('should return a date (with date and time)', function() {
      return Promise.all([
        r.time(1986, 11, 3, 12, 0, 0, 'Z'),
        r.time(1986, 11, 3, 12, 20, 0, 'Z').minutes()
      ])
      .spread(function(r1, r2) {
        expect(r1).to.be.instanceOf(Date);
        expect(r2).to.equal(20);
      });
    });

    it('should work with r.args', function() {
      return r.time(r.args([1986, 11, 3, 12, 0, 0, 'Z']))
        .then(function(result) { expect(result).to.be.instanceOf(Date); });
    });

    it('should return a date (just with a date)', function() {
      return Promise.all([
        r.time(1986, 11, 3, 'Z'),
        r.time(1986, 11, 3, 0, 0, 0, 'Z')
      ])
      .spread(function(r1, r2) {
        expect(r1).to.be.instanceOf(Date);
        expect(r2).to.be.instanceOf(Date);
      });
    });

    it('should throw if no argument has been given', function() {
      var invalid = function() { return r.time(); };
      // @todo: this error message is bad english
      expect(invalid).to.throw(/called with 0 argument/);
    });

    it('should throw if maximum arguments are exceeded', function() {
      var invalid = function() { return r.time(1, 1, 1, 1, 1); };
      expect(invalid).to.throw(/called with 5 arguments/);
    });

    it('should throw if not called after a term', function() {
      var invalid = function() { return r.expr(1).time(1, 2, 3, 'Z'); };
      expect(invalid).to.throw(/is not defined after/);
    });
  });

  describe('#epochTime', function() {
    afterEach(function() { return test.cleanTables(); });

    it('should work', function() {
      var now = new Date();
      return r.epochTime(now.getTime() / 1000)
        .then(function(result) { expect(result).to.eql(now); });
    });

    it('should work (raw)', function() {
      var now = new Date();
      return r.epochTime(now.getTime() / 1000).run({ timeFormat: 'raw' })
        .then(function(result) { expect(result.$reql_type$).to.equal('TIME'); });
    });

    it('should throw if no argument has been given', function() {
      var invalid = function() { return r.epochTime(); };
      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
    });

    it('should throw if not called after a valid term', function() {
      var invalid = function() { return r.expr(1).epochTime(Date.now()); };
      expect(invalid).to.throw(/is not defined after/);
    });
  });

  describe('#ISO8601', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.ISO8601('1986-11-03T08:30:00-08:00')
        .then(function(result) { expect(result).to.eql(new Date('1986-11-03T08:30:00-08:00')); });
    });

    it('should work with a timezone', function() {
      return r.ISO8601('1986-11-03T08:30:00', { defaultTimezone: '-08:00' })
        .then(function(result) { expect(result).to.eql(new Date('1986-11-03T08:30:00-08:00')); });
    });

    it('should throw if no argument has been given', function() {
      var invalid = function() { return r.ISO8601(); };
      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
    });

    it('should throw if given too many arguments', function() {
      var invalid = function() { return r.ISO8601(1, 1, 1); };
      expect(invalid).to.throw(/takes at most 2 arguments, 3 provided/);
    });

    it('should throw when it is not defined after a term', function() {
      var invalid = function() { return r.expr(1).ISO8601('validISOstring'); };
      expect(invalid).to.throw(/is not defined after/);
    });
  });

  describe('#inTimezone', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.now().inTimezone('-08:00').hours().do(function(h) {
          return r.branch(
            h.eq(0),
            r.expr(23).eq(r.now().inTimezone('-09:00').hours()),
            h.eq(r.now().inTimezone('-09:00').hours().add(1))
          );
        })
        .then(function(result) { expect(result).to.be.true; });
    });

    it('should throw if no arguments are given', function() {
      var invalid = function() { return r.now().inTimezone(); };
      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
    });
  });

  describe('#timezone', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.ISO8601("1986-11-03T08:30:00-08:00").timezone()
        .then(function(result) { expect(result).to.eql('-08:00'); });
    });
  });

  describe('#during', function() {
    afterEach(function() { return test.cleanTables(); });

    it('should work', function() {
      return Promise.all([
        r.now().during(r.time(2013, 12, 1, 'Z'), r.now().add(1000)),
        r.now().during(r.time(2013, 12, 1, 'Z'), r.now(), { leftBound: 'closed', rightBound: 'closed' }),
        r.now().during(r.time(2013, 12, 1, 'Z'), r.now(), { leftBound: 'closed', rightBound: 'open' })
      ])
      .spread(function(r1, r2, r3) {
        expect(r1).to.be.true;
        expect(r2).to.be.true;
        expect(r3).to.be.false;
      });
    });

    it('should throw if no arguments are given', function() {
      var invalid = function() { return r.now().during(); };
      expect(invalid).to.throw(/takes at least 2 arguments, 0 provided/);
    });

    it('should throw if only one argument is given', function() {
      var invalid = function() { return r.now().during(1); };
      expect(invalid).to.throw(/takes at least 2 arguments, 1 provided/);
    });

    it('should throw if too many arguments are provided', function() {
      var invalid = function() { return r.now().during(1, 1, 1, 1, 1); };
      expect(invalid).to.throw(/takes at most 3 arguments, 5 provided/);
    });
  });

  describe('#date', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return Promise.all([
        r.now().date().hours(), r.now().date().minutes(), r.now().date().seconds()
      ])
      .spread(function(r1, r2, r3) {
        expect(r1).to.equal(0);
        expect(r2).to.equal(0);
        expect(r3).to.equal(0);
      });
    });
  });

  describe('#timeOfDay', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.now().timeOfDay()
        .then(function(result) { expect(result).to.be.greaterThan(0); });
    });
  });

  describe('#year', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.now().inTimezone(new Date().toString().match(' GMT([^ ]*)')[1]).year()
        .then(function(result) { expect(result).to.eql(new Date().getFullYear()); });
    });
  });

  describe('#month', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.now().inTimezone(new Date().toString().match(' GMT([^ ]*)')[1]).month()
        .then(function(result) { expect(result).to.eql(new Date().getMonth() + 1); });
    });
  });

  describe('#day', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.now().inTimezone(new Date().toString().match(' GMT([^ ]*)')[1]).day()
        .then(function(result) { expect(result).to.eql(new Date().getDate()); });
    });
  });

  describe('#dayOfWeek', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.now().inTimezone(new Date().toString().match(' GMT([^ ]*)')[1]).dayOfWeek()
        .then(function(result) {
          if (result === 7) result = 0;
          expect(result).to.eql(new Date().getDay());
        });
    });
  });

  describe('#dayOfYear', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.now().inTimezone(new Date().toString().match(' GMT([^ ]*)')[1]).dayOfYear()
        .then(function(result) {
          expect(result).to.be.greaterThan((new Date()).getMonth() * 28 + (new Date()).getDate() - 1);
        });
    });
  });

  describe('#hours', function() {
    afterEach(function() { return test.cleanTables(); });

  });

  describe('#minutes', function() {
    afterEach(function() { return test.cleanTables(); });

  });

  describe('#seconds', function() {
    afterEach(function() { return test.cleanTables(); });

  });

  describe('#toISO8601', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.now().toISO8601()
        .then(function(result) { expect(result).to.be.a('string'); });
    });
  });

  describe('#toEpochTime', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.now().toEpochTime()
        .then(function(result) { expect(result).to.be.a('number'); });
    });
  });

  describe('constant terms', function() {
    it('should work', function() {
      return r.expr([
        r.monday, r.tuesday, r.wednesday, r.thursday, r.friday, r.saturday, r.sunday,
        r.january, r.february, r.march, r.april, r.may, r.june, r.july, r.august, r.september,
        r.october, r.november, r.december
      ])
      .then(function(result) {
        expect(result).to.eql([1,2,3,4,5,6,7,1,2,3,4,5,6,7,8,9,10,11,12]);
      });
    });
  });
});
