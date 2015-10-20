"use strict";
var Promise = require('bluebird'),
    TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var test = new TestFixture();
describe('Manipulating Tables', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });

  describe('#tableCreate', function() {
    it('should create a table', function() {
      var tableName = test.uuid();
      return test.db.tableCreate(tableName)
        .then(function(result) { expect(result.tables_created).to.equal(1); });
    });

    it('should create a table with a primaryKey', function() {
      var tableName = test.uuid();
      return test.db.tableCreate(tableName, { primaryKey: 'foo' })
        .then(function(result) {
          expect(result.tables_created).to.equal(1);
          return test.db.table(tableName).info();
        })
        .then(function(info) {
          expect(info.primary_key).to.equal('foo');
        });
    });

    it('should create a table with all possible options', function() {
      var tableName = test.uuid();
      return test.db.tableCreate(tableName, { durability: 'soft', primaryKey: 'foo' })
        .then(function(result) {
          expect(result.tables_created).to.equal(1);
          return test.db.table(tableName).info();
        })
        .then(function(info) {
          expect(info.primary_key).to.equal('foo');
        });
    });

    it('should throw if given invalid arguments', function() {
      var tableName = test.uuid();
      var invalid = function() {
        return test.db.tableCreate(tableName, { invalid: false });
      };
      expect(invalid).to.throw(/Unrecognized option `invalid` in `tableCreate`/);
    });

    it('should throw if no argument is given', function() {
      var invalid = function() { return test.db.tableCreate(); };
      expect(invalid).to.throw(/`tableCreate` takes at least 1 argument, 0 provided/);
    });

    it('should throw if the name contains invalid characters', function() {
      expect(test.db.tableCreate('-_-'))
        .to.eventually.be.rejectedWith(/Table name `-_-` invalid \(Use A-Za-z0-9_ only\)/);
    });
  });

  describe('#tableDrop', function() {
    it('should drop a table', function() {
      var tableName = test.uuid();
      return test.db.tableCreate(tableName)
        .then(function(result) {
          expect(result.tables_created).to.equal(1);
          return test.db.tableList();
        })
        .then(function(tables) {
          expect(tables).to.include(tableName);
          return test.db.tableDrop(tableName);
        })
        .then(function(result) {
          expect(result.tables_dropped).to.equal(1);
          return test.db.tableList();
        })
        .then(function(tables) {
          expect(tables).to.not.include(tableName);
        });
    });

    it('should throw if no argument is given', function() {
      var invalid = function() { return test.db.tableDrop(); };
      expect(invalid).to.throw(/`tableDrop` takes 1 argument, 0 provided/);
    });
  });

  describe('#tableList', function() {
    it('should return a cursor', function() {
      return test.db.tableList()
        .then(function(result) { expect(result).is.an('array'); });
    });

    it('should list a table we created', function() {
      var tableId = test.uuid();
      return test.db.tableCreate(tableId)
        .then(function(result) {
          expect(result.tables_created).to.equal(1);
          return test.db.tableList();
        })
        .then(function(result) {
          expect(result).to.include(tableId);
        });
    });
  });

  describe('#indexCreate', function() {
    it('should work with options', function() {
      return Promise.all([
        test.table.indexCreate('foo', { multi: true }),
        test.table.indexCreate('foo1', r.row('foo'), { multi: true }),
        test.table.indexCreate('foo2', function(doc) { return doc('foo'); }, { multi: true })
      ])
      .spread(function(r1, r2, r3) {
        expect(r1.created).to.equal(1);
        expect(r2.created).to.equal(1);
        expect(r3.created).to.equal(1);
        return test.table.indexWait();
      })
      .then(function() {
        return Promise.all([
          test.table.insert({ foo: ['bar1', 'bar2'], buzz: 1 }),
          test.table.insert({ foo: ['bar1', 'bar3'], buzz: 2 })
        ]);
      })
      .spread(function(r1, r2) {
        expect(r1.inserted).to.equal(1);
        expect(r2.inserted).to.equal(1);

        return Promise.all([
          test.table.getAll('bar1', { index: 'foo' }).count(),
          test.table.getAll('bar1', { index: 'foo1' }).count(),
          test.table.getAll('bar1', { index: 'foo2' }).count(),
          test.table.getAll('bar2', { index: 'foo' }).count(),
          test.table.getAll('bar2', { index: 'foo1' }).count(),
          test.table.getAll('bar2', { index: 'foo2' }).count(),
          test.table.getAll('bar3', { index: 'foo' }).count(),
          test.table.getAll('bar3', { index: 'foo1' }).count(),
          test.table.getAll('bar3', { index: 'foo2' }).count()
        ]);
      })
      .then(function(results) {
        expect(results).to.eql([2, 2, 2, 1, 1, 1, 1, 1, 1]);

        // Test when the function is wrapped in an array
        return test.table.indexCreate('buzz', [ r.row('buzz') ]);
      })
      .then(function(result) {
        expect(result.created).to.equal(1);
        return test.table.indexWait();
      })
      .then(function() {
        return test.table.getAll([1], { index: 'buzz' }).count();
      })
      .then(function(result) {
        expect(result).to.equal(1);
      });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.db.indexCreate(); };
      expect(invalid).to.throw(/`indexCreate` takes at least 1 argument, 0 provided/);
    });
  });

  describe('#indexDrop', function() {
    it('should throw if no argument is passed', function() {
      var invalid = function() { return test.db.indexDrop(); };
      expect(invalid).to.throw(/`indexDrop` takes 1 argument, 0 provided/);
    });
  });

  describe('#indexList', function() {
  });

  describe('#indexRename', function() {
    it('should work', function() {
      var toRename = test.uuid(), renamed = test.uuid(), existing = test.uuid();
      return test.table.indexCreate(toRename)
        .then(function(result) {
          expect(result.created).to.equal(1);
          return test.table.indexRename(toRename, renamed);
        })
        .then(function(result) {
          expect(result.renamed).to.equal(1);
          return test.table.indexCreate(existing);
        })
        .then(function(result) {
          expect(result.created).to.equal(1);
          return test.table.indexRename(renamed, existing, { overwrite: true });
        })
        .then(function(result) {
          expect(result.renamed).to.equal(1);
        });
    });

    it('should not overwrite an index if not explicitly specified', function() {
      var name = test.uuid(), otherName = test.uuid();
      return Promise.all([
        test.table.indexCreate(name), test.table.indexCreate(otherName)
      ])
      .spread(function(r1, r2) {
        expect(r1.created).to.equal(1);
        expect(r2.created).to.equal(1);
        expect(test.table.indexRename(otherName, name))
          .to.eventually.be.rejectedWith(/Index `.*` already exists on table/);
      });
    });

    it('should throw if given invalid arguments', function() {
      var invalid = function() {
        return test.db.indexRename('foo', 'bar', { invalid: true });
      };
      expect(invalid).to.throw(/Unrecognized option `invalid` in `indexRename`/);
    });
  });

  describe('#indexStatus', function() {
  });

  describe('#indexWait', function() {
  });

  describe("index operations", function() {
    it('index operations (1)', function() {
      return test.table.indexCreate('newField')
        .then(function(result) {
          expect(result.created).to.equal(1);
          return test.table.indexList();
        })
        .then(function(result) {
          expect(result).to.include('newField');
          return test.table.indexWait().pluck('index', 'ready');
        })
        .then(function(result) {
          expect(result).to.include({ index: 'newField', ready: true });
          return test.table.indexStatus().pluck('index', 'ready');
        })
        .then(function(result) {
          expect(result).to.include({ index: 'newField', ready: true });
          return test.table.indexDrop('newField');
        })
        .then(function(result) {
          expect(result.dropped).to.equal(1);
        });
    });

    it('index operations (2)', function() {
      return test.table.indexCreate('field1', function(doc) { return doc('field1'); })
        .then(function(result) {
          expect(result.created).to.equal(1);
          return test.table.indexWait('field1').pluck('index', 'ready');
        })
        .then(function(result) {
          expect(result).to.include({ index: 'field1', ready: true });
          return test.table.indexStatus('field1').pluck('index', 'ready');
        })
        .then(function(result) {
          expect(result).to.include({ index: 'field1', ready: true });
          return test.table.indexDrop('field1');
        })
        .then(function(result) {
          expect(result.dropped).to.equal(1);
        });
    });
  });
});
