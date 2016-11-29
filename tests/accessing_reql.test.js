"use strict";
var Promise = require('bluebird'),
    TestFixture = require('./support'),
    config = require('./config'),
    expect = require('chai').expect;

var test = new TestFixture({ pool: false }),
    r = TestFixture.r;

function generateData(test) {
  var testData =
      Array.apply(null, new Array(100)).map(function(a) { return { field: 0 }; });
  return test.table.insert(testData)
    .then(function(result) {
      expect(result.inserted).to.equal(100);
      test.pks = result.generated_keys;
      test.data = testData;
    });
}

describe('Accessing ReQL', function() {
  after(function() { return test.teardown(); });
  before(function() { return test.setup(); });

  describe('#r', function() {
    it('should be a shortcut for r.expr', function() {
      return r(1).then(function(result) { expect(result).to.equal(1); });
    });

    it('should throw an error if `servers` is empty', function() {
      expect(function() {
        require('../lib')({ servers: [] });
      }).to.throw('If `servers` is an array, it must contain at least one server.');
    });
  });

  describe('#connect', function() {
    it('should support a timeout', function() {
      var port = Math.floor(Math.random() * (65535-1025) + 1025);
      var server = require('net').createServer(function(c) {});
      server.listen(port);

      expect(r.connect({ port: port, timeout: 1 }))
        .to.eventually.be.rejectedWith('Failed to connect to localhost:' + port + ' in less than 1s.');
    });
  });

  describe('#close', function() {
  });

  describe('#reconnect', function() {
    it('should work', function() {
      return r.connect(config)
        .then(function(connection) {
          test.connection = connection;
          test.connection.use(test._dbName);
          return r.expr(1).run(test.connection);
        })
        .then(function(result) {
          expect(result).to.equal(1);
          return test.connection.close();
        })
        .then(function() {
          expect(test.connection._isOpen()).to.be.false;
          return test.connection.reconnect();
        })
        .then(function(connection) {
          test.connection = connection;
          expect(test.connection._isOpen()).to.be.true;
          return r.tableList().run(test.connection);
        })
        .then(function(list) {
          expect(list).to.eql([ test._tableName ]);
          return test.connection.close();
        });
    });

    it('should work with options', function() {
      return r.connect(config)
        .then(function(connection) {
          test.connection = connection;
          return r.expr(1).run(test.connection);
        })
        .then(function(result) {
          expect(result).to.equal(1);
          return test.connection.reconnect({ noreplyWait: true });
        })
        .then(function(connection) {
          expect(connection).to.exist;
          test.connection = connection;
          return r.expr(1).run(test.connection);
        })
        .then(function(result) {
          expect(result).to.equal(1);
          return test.connection.reconnect({ noreplyWait: false });
        })
        .then(function(connection) {
          expect(connection).to.exist;
          test.connection = connection;
          return r.expr(1).run(test.connection);
        })
        .then(function(result) {
          expect(result).to.equal(1);
          return test.connection.close();
        });
    });
  });

  describe('#use', function() {
    it('should work', function() {
      return r.connect(config)
        .then(function(connection) {
          connection.use(test._dbName);
          return r.tableList().run(connection);
        })
        .then(function(list) {
          expect(list).to.eql([ test._tableName ]);
        });
    });
  });

  describe('#run', function() {
    it('should throw if called without a connection', function() {
      var r1 = require('../lib')({ pool: false, silent: true });
      var invalid = function() { return r1.expr(1).run(); };
      expect(invalid).to.throw(/`run` was called without a connection/);
    });

    it('should throw if called with a closed connection', function() {
      var r1 = require('../lib')({ pool: false, silent: true });
      return r1.connect(config)
        .then(function(connection) {
          test.connection = connection;
          return connection.close();
        })
        .then(function() {
          expect(r1.expr(1).run(test.connection))
            .to.eventually.be.rejectedWith(/`run` was called with a closed connection/);
          test.connection = undefined;
        });
    });

    it('should use the default database', function() {
      return r.connect({ db: test._dbName, host: config.host, port: config.port, authKey: config.authKey })
        .then(function(connection) { return r.tableList().run(connection); })
        .then(function(list) {
          expect(list).to.eql([ test._tableName ]);
        });
    });

    it('should take an argument', function() {
      return r.connect({ db: test._dbName, host: config.host, port: config.port, authKey: config.authKey })
        .then(function(connection) {
          return Promise.all([
            r.expr(1).run(connection, { readMode: 'primary' }),
            r.expr(1).run(connection, { readMode: 'majority' }),
            r.expr(1).run(connection, { profile: false }),
            r.expr(1).run(connection, { profile: true }),
            r.expr(1).run(connection, { durability: 'soft' }),
            r.expr(1).run(connection, { durability: 'hard' })
          ]);
        })
        .spread(function(r1, r2, r3, r4, r5, r6) {
          expect(r1).to.equal(1);
          expect(r2).to.equal(1);
          expect(r3).to.equal(1);
          expect(r4.profile).to.exist;
          expect(r4.result).to.equal(1);
          expect(r5).to.equal(1);
          expect(r6).to.equal(1);
        });
    });

    it('should throw on an unrecognized argument', function() {
      return r.connect({ db: test._dbName, host: config.host, port: config.port, authKey: config.authKey })
        .then(function(connection) {
          expect(r.expr(1).run(connection, { foo: 'bar' }))
            .to.eventually.be.rejectedWith(/Unrecognized option `foo` in `run`./);
        });
    });


    it('`timeFormat` should work', function() {
      return r.connect({ db: test._dbName, host: config.host, port: config.port, authKey: config.authKey })
        .then(function(connection) {
          test.connection = connection;
          return r.now().run(test.connection);
        })
        .then(function(result) {
          expect(result).to.be.an.instanceOf(Date);
          return r.now().run(test.connection, { timeFormat: 'native' });
        })
        .then(function(result) {
          expect(result).to.be.an.instanceOf(Date);
          return r.now().run(test.connection, { timeFormat: 'raw' });
        })
        .then(function(result) {
          expect(result.$reql_type$).to.equal('TIME');
          return test.connection.close();
        });
    });

    it('`binaryFormat` should work', function() {
      return r.connect({ db: test._dbName, host: config.host, port: config.port, authKey: config.authKey })
        .then(function(connection) {
          test.connection = connection;
          return r.binary(new Buffer([1, 2, 3])).run(connection, { binaryFormat: 'raw' });
        })
        .then(function(result) {
          expect(result.$reql_type$).to.equal('BINARY');
          return test.connection.close();
        });
    });

    it('`groupFormat` should work', function() {
      var testData = [
        { name: 'Michel', grownUp: true }, { name: 'Laurent', grownUp: true },
        { name: 'Sophie', grownUp: true }, { name: 'Luke', grownUp: false },
        { name: 'Mino', grownUp: false }
      ];

      return r.connect({ db: test._dbName, host: config.host, port: config.port, authKey: config.authKey })
        .then(function(connection) {
          test.connection = connection;
          return r.expr(testData).group('grownUp').run(test.connection, { groupFormat: 'raw' });
        })
        .then(function(result) {
          expect(result.$reql_type$).to.equal('GROUPED_DATA');
          expect(result.data).to.eql([
            [ false, [ { 'grownUp': false, 'name': 'Luke' }, { 'grownUp': false, 'name': 'Mino' } ] ],
            [ true, [ { 'grownUp': true, 'name': 'Michel' }, { 'grownUp': true, 'name': 'Laurent' }, { 'grownUp': true, 'name': 'Sophie' } ] ]
          ]);

          return test.connection.close();
        });
    });

    it('`profile` should work', function() {
      return r.connect({ db: test._dbName, host: config.host, port: config.port, authKey: config.authKey })
        .then(function(connection) {
          test.connection = connection;
          return r.expr(true).run(connection, { profile: false });
        })
        .then(function(result) {
          expect(result).to.be.true;
          return r.expr(true).run(test.connection, { profile: true });
        })
        .then(function(result) {
          expect(result.profile).to.exist;
          expect(result.result).to.be.true;
          return r.expr(true).run(test.connection, { profile: false });
        })
        .then(function(result) {
          expect(result).to.be.true;
          return test.connection.close();
        });
    });

    it('should throw an error when running a query on a closed connection', function() {
      return r.connect({ db: test._dbName, host: config.host, port: config.port, authKey: config.authKey })
        .then(function(connection) {
          expect(connection).to.exist;
          test.connection = connection;
          return test.connection.close();
        })
        .then(function() {
          expect(r.expr(1).run(test.connection))
            .to.eventually.be.rejectedWith(/`run` was called with a closed connection/);
        });
    });

  });

  describe('#changes', function() {
    afterEach(function() { return test.cleanTables(); });

    it('should work with { squash: true }', function() {
      return test.table.changes({ squash: true })
        .then(function(feed) {
          expect(feed).to.exist;
          expect(feed.toString()).to.equal('[object Feed]');
          return feed.close();
        });
    });

    it('should work on `get` terms', function() {
      return test.table.get(1).changes()
        .then(function(feed) {
          expect(feed).to.exist;
          expect(feed.toString()).to.equal('[object AtomFeed]');
          return feed.close();
        });
    });

    it('should work on `orderBy().limit()`', function() {
      return test.table.orderBy({index: 'id'}).limit(2).changes()
        .then(function(feed) {
          expect(feed).to.exist;
          expect(feed.toString()).to.equal('[object OrderByLimitFeed]');
          return feed.close();
        });
    });

    it('should support `includeStates`', function(done) {
      generateData(test)
        .then(function() {
          return test.table.orderBy({ index: 'id' })
            .limit(10).changes({ includeStates: true, includeInitial: true });
        })
        .then(function(feed) {
          var i = 0;
          feed.each(function(err, change) {
            i++;
            if (i === 10) {
              feed.close();
              done();
            }
          });
        });
    });

    it('should support `includeInitial`', function(done) {
      generateData(test)
        .then(function() {
          return test.table.orderBy({ index: 'id' }).changes({ includeInitial: true });
        })
        .then(function(feed) {
          var i = 0;
          feed.each(function(err, change) {
            i++;
            expect(change.old_val).to.be.undefined;
            expect(test.pks).to.include(change.new_val.id);
            if (i === test.data.length) {
              feed.close();
              done();
            }
          });
        });
    });

    it('should support `on`', function(done) {
      generateData(test)
        .then(function() { return test.table.changes(); })
        .then(function(feed) {
          var i = 0;
          feed.on('data', function() {
            i++;
            if (i === 100) {
              feed.close()
                .then(function() { done(); })
                .error(function(error) { done(error); });
            }
          });
        })
        .delay(100)
        .then(function() {
          return test.table.update({ foo: r.now() });
        });
    });

    it('events should not return an error if the feed is closed (1)', function(done) {
      test.table.get(1).changes()
        .then(function(feed) {
          feed.each(function(err, result) {
            if (err) return done(err);
            if (result.new_val !== null && result.new_val.id === 1) {
              feed.close()
                .then(function() { done(); })
                .error(function(err) { done(err); });
            }
          });
        })
        .delay(100)
        .then(function() {
          return test.table.insert({ id: 1 });
        });
    });

    it('events should not return an error if the feed is closed (2)', function(done) {
      generateData(test)
        .then(function() { return test.table.changes(); })
        .then(function(feed) {
          var count = 0;
          feed.on('data', function(result) {
            if (result.new_val.foo instanceof Date) count++;
            if (count === 1) {
              setTimeout(function() {
                feed.close()
                  .then(function() { done(); })
                  .error(function(err) { done(err); });
              }, 100);
            }
          });
        })
        .delay(100)
        .then(function() {
          return test.table.limit(2).update({ foo: r.now() });
        });
    });

    it('should support `includeOffsets`', function(done) {
      test.table.insert([{}, {}, {}, {}, {}]).run()
        .then(function() {
          return test.table.orderBy({ index: 'id' }).limit(2)
            .changes({ includeOffsets: true, includeInitial: true }).run();
        })
        .then(function(feed) {
          var counter = 0;
          feed.each(function(error, change) {
            expect(change.new_offset).to.be.a.number;
            if (counter >= 2) {
              expect(change.old_offset).to.be.a.number;
              feed.close().then(function() { done(); });
            }
            counter++;
          });

          return test.table.insert({ id: 0 });
        });
    });

    it('should support `includeTypes`', function(done) {
      test.table.insert([{}, {}, {}, {}, {}]).run()
        .then(function() {
          return test.table.orderBy({ index: 'id' })
            .limit(2).changes({ includeTypes: true, includeInitial: true }).run();
        })
        .then(function(feed) {
          var counter = 0;
          feed.each(function(error, change) {
            expect(change.type).to.be.a.string;
            if (counter > 0) feed.close().then(function() { done(); });
            counter++;
          });

          return test.table.insert({ id: 0 });
        });
    });
  });

  describe('#noreplyWait', function() {
    it('`noReplyWait` should throw', function() {
      return r.connect({ db: test._dbName, host: config.host, port: config.port, authKey: config.authKey })
        .then(function(connection) {
          var invalid = function() { return connection.noReplyWait(); };
          expect(invalid).to.throw(/Did you mean to use `noreplyWait` instead of `noReplyWait`?/);
        });
    });

    it('should work', function() {
      return r.connect({ db: test._dbName, host: config.host, port: config.port, authKey: config.authKey })
        .then(function(connection) {
          test.connection = connection;
          return connection.noreplyWait();
        });
    });
  });

  describe('#server', function() {
    it('should return the server UUID and name for the current connection', function() {
      return r.connect(config)
        .then(function(conn) { return conn.server(); })
        .then(function(serverInfo) {
          expect(serverInfo.name).to.be.a.string;
          expect(serverInfo.id).to.be.a.string;
        });
    });
  });

  describe('#grant', function() {
    it('should work', function() {
      var conn;
      var restrictedDbName = test.uuid();
      var restrictedTableName = test.uuid();
      var user = test.uuid();
      var password = test.uuid();

      return r.connect(config)
        .then(function(conn_) {
          expect(conn_).to.exist;
          conn = conn_;
          return r.dbCreate(restrictedDbName).run(conn);
        })
        .then(function(result) {
          expect(result.config_changes).to.have.length(1);
          expect(result.dbs_created).to.equal(1);
          return r.db(restrictedDbName).tableCreate(restrictedTableName).run(conn);
        })
        .then(function(result) {
          expect(result.tables_created).to.equal(1);

          return r.db('rethinkdb').table('users')
            .insert({ id: user, password: password })
            .run(conn);
        })
        .then(function(result) {
          return r.db(restrictedDbName).table(restrictedTableName)
            .grant(user, { read: true, write: true, config: true })
            .run(conn);
        })
        .then(function(result) {
          expect(result).to.eql({
            granted: 1,
            permissions_changes: [{
              new_val: { config: true, read: true, write: true },
              old_val: null
            }]
          });
        });
    });
  });

});
