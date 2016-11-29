"use strict";
var TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var test = new TestFixture();
describe('Selecting Data', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });
  beforeEach(function() {
    var testData =
      Array.apply(null, new Array(100)).map(function(a) { return { field: 0 }; });
    return test.table.insert(testData)
      .then(function(result) {
        expect(result.inserted).to.equal(100);
        test.pks = result.generated_keys;

        return test.table.sample(20).update({ field: 10 });
      })
      .then(function(result) { expect(result.replaced).to.equal(20); });
  });

  describe('#db', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.db(test._dbName).info()
        .then(function(result) {
          expect(result.name).to.equal(test._dbName);
          expect(result.type).to.equal('DB');
        });
    });
  });

  describe('#table', function() {
    afterEach(function() { test.pks = []; return test.cleanTables(); });
    it('should work', function() {
      return r.db(test._dbName).table(test._tableName).info()
        .then(function(result) {
          expect(result.name).to.equal(test._tableName);
          expect(result.type).to.equal('TABLE');
          expect(result.primary_key).to.equal('id');
          expect(result.db.name).to.equal(test._dbName);

          return r.db(test._dbName).table(test._tableName);
        })
        .then(function(docs) { expect(docs).to.have.length(100) ; });
    });

    it('should throw with invalid options', function() {
      var invalid = function() {
        return r.db(test._dbName).table(test._tableName, { invalidOption: false });
      };

      expect(invalid).to.throw(/Unrecognized option/);
      expect(invalid).to.throw(r.Error.ReqlDriverError);
    });

    describe('readMode', function() {
      [ 'single', 'majority', 'outdated' ].forEach(function(mode) {
        it('should support: ' + mode, function() {
          return r.db(test._dbName).table(test._tableName, { readMode: mode })
            .then(function(docs) { expect(docs).to.have.length(100); });
        });
      });
    });

  });

  describe('#get', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return r.db(test._dbName).table(test._tableName).get(test.pks[0])
        .then(function(doc) {
          expect(doc.id).to.equal(test.pks[0]);
        });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() {
        return r.db(test._dbName).table(test._tableName).get();
      };

      expect(invalid).to.throw(/takes 1 argument, 0 provided/);
      expect(invalid).to.throw(r.Error.ReqlDriverError);
    });
  });

  describe('#getAll', function() {
    afterEach(function() { return test.cleanTables(); });

    it('should work with multiple values - primary key', function() {
      var table = r.db(test._dbName).table(test._tableName);
      var query = table.getAll.apply(table, test.pks);
      return query.run()
        .then(function(result) {
          expect(result).to.have.length(100);

          query = table.getAll.apply(table, test.pks.slice(0, 50));
          return query.run();
        })
        .then(function(result) {
          expect(result).to.have.length(50);
        });
    });

    it('should work with multiple values - secondary index 1', function() {
      return test.table.indexCreate('field')
        .then(function(result) {
          expect(result.created).to.equal(1);
          return test.table.indexWait('field').pluck('index', 'ready');
        })
        .then(function(result) {
          expect(result).to.eql([ { 'index': 'field', 'ready' : true } ]);
          return r.db(test._dbName).table(test._tableName).getAll(10, { index: 'field' });
        })
        .then(function(result) {
          expect(result).to.exist;
          expect(result).to.have.length(20);
        });
    });

    it('should return native dates (and cursor should handle them)', function() {
      return test.table.insert({ field: -1, date: r.now() })
        .then(function(result) {
          expect(result.inserted).to.equal(1);
          return r.db(test._dbName).table(test._tableName).getAll(-1, { index: 'field' });
        })
        .then(function(results) {
          expect(results[0].date instanceof Date);
        });
    });

    it('should work with multiple values - secondary index 2', function() {
      return test.table.indexCreate('fieldAddOne', function(doc) {
          return doc('field').add(1);
        })
        .then(function(result) {
          expect(result.created).to.equal(1);
          return test.table.indexWait('fieldAddOne').pluck('index', 'ready');
        })
        .then(function(result) {
          expect(result).to.eql([ { index: 'fieldAddOne', ready: true } ]);
          return test.table.getAll(11, { index: 'fieldAddOne' });
        })
        .then(function(result) {
          expect(result).to.exist;
          expect(result).to.have.length(20);
        });
    });

    it('should work with no argument - primary key', function() {
      return test.table.getAll().run()
        .then(function(result) { expect(result).to.have.length(0); });
    });

    it('should work with no argument - index', function() {
      return test.table.getAll({ index: 'id' }).run()
        .then(function(result) { expect(result).to.have.length(0); });
    });
  });

  describe('#between', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should work -- secondary index', function() {
      return test.table.between(5, 20, { index: 'fieldAddOne' })
        .then(function(results) {
          expect(results).to.exist;
          expect(results).to.have.length(20);
        });
    });

    it('should work -- all args', function() {
      return test.table.between(5, 20, {
          index: 'fieldAddOne', leftBound: 'open', rightBound: 'closed'
        })
        .then(function(results) {
          expect(results).to.exist;
          expect(results).to.have.length(20);
        });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() {
        return r.db(test._dbName).table(test._tableName).between();
      };

      expect(invalid).to.throw(/takes at least 2 arguments, 0 provided/);
      expect(invalid).to.throw(r.Error.ReqlDriverError);
      expect(invalid).to.throw(Error);
    });

    it('should throw if passed invalid arguments', function() {
      var invalid = function() {
        return r.db(test._dbName).table(test._tableName).between(1, 2, { invalid: true });
      };

      expect(invalid).to.throw(/Unrecognized option/);
      expect(invalid).to.throw(r.Error.ReqlDriverError);
      expect(invalid).to.throw(Error);
    });
  });

  describe('#filter', function() {
    afterEach(function() { return test.cleanTables(); });
    it('should support filtering by object', function() {
      return r.db(test._dbName).table(test._tableName).filter({ field: 10 })
        .then(function(docs) {
          expect(docs).to.exist;
          expect(docs).to.have.length(20);
        });
    });

    it('should filter by object (non-existant field)', function() {
      return test.table.filter({ nonExistantField: 10 })
        .then(function(results) {
          expect(results).to.exist;
          expect(results).to.have.length(0);
        });
    });

    it('should filter by anonymous function', function() {
      return test.table.filter(function(doc) { return doc('field').eq(10); })
        .then(function(results) {
          expect(results).to.exist;
          expect(results).to.have.length(20);
        });
    });

    it('should filter by invalid object (default: true)', function() {
      return test.table.filter({ nonExistantField: 10 }, { default: true })
        .then(function(results) {
          expect(results).to.exist;
          expect(results).to.have.length(100);
        });
    });

    it('should filter by invalid object (default: false)', function() {
      return test.table.filter({ nonExistantField: 10 }, { default: false })
        .then(function(results) {
          expect(results).to.exist;
          expect(results).to.have.length(0);
        });
    });

    it('should filter by object (default: error)', function() {
      var query = r.expr([ { a: 1 }, {} ]).filter(r.row('a'), { default: r.error() });
      expect(query).to.eventually.be.rejectedWith(/^No attribute `a` in object:/);
      expect(query).to.eventually.be.rejectedWith(r.Error.ReqlRuntimeError);
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() {
        r.db(test._dbName).table(test._tableName).filter();
      };

      expect(invalid).to.throw(/takes at least 1 argument, 0 provided/);
      expect(invalid).to.throw(r.Error.ReqlDriverError);
      expect(invalid).to.throw(Error);
    });

    it('should throw if passed an invalid option', function() {
      var invalid = function() {
        return r.db(test._dbName).table(test._tableName).filter(true, { invalid: false });
      };

      expect(invalid).to.throw(/Unrecognized option/);
      expect(invalid).to.throw(r.Error.ReqlDriverError);
      expect(invalid).to.throw(Error);
    });
  });

});
