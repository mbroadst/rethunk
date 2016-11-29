"use strict";
var Promise = require('bluebird'),
    TestFixture = require('./support'),
    r = TestFixture.r,
    config = require('./config'),
    expect = require('chai').expect;

function generateData(test) {
  var testData =
      Array.apply(null, new Array(100)).map(function(a) { return { field: 0 }; });
  return test.table.insert(testData)
    .then(function(result) {
      expect(result.inserted).to.equal(100);
      test.pks = result.generated_keys;
    });
}

var test = new TestFixture();
describe('Cursors', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });
  beforeEach(function() { return generateData(test); });
  afterEach(function() { return test.cleanTables(); });

  describe('behaviors', function() {
    it('should throw if the user tries to serialize a cursor to JSON', function() {
      return test.table.run({ cursor: true })
        .then(function(cursor) {
          var invalid = function() { return cursor.toJSON(); };
          expect(invalid).to.throw(/You cannot serialize a Cursor to JSON/);
        });
    });

    /*
    it('Automatic coercion from cursor to table with multiple batches', function() {
      var i=0;
      try {
        var connection = yield r.connect({host: config.host, port: config.port, authKey: config.authKey});
        assert(connection);

        result = yield r.db(dbName).table(tableName).run(connection, { maxBatchRows: 1 });
        assert(result.length > 0);
        done();
      }
      catch(e) {
        done(e);
      }
    })
    */


    it('should support importing with cursor as default', function() {
      var r1 = require('../lib')({
        cursor: true,
        host: config.host, port: config.port,
        authKey: config.authKey, buffer: config.buffer,
        max: config.max, silent: true
      });

      return r1.db(test._dbName).table(test._tableName)
        .then(function(cursor) {
          expect(cursor).to.exist;
          expect(cursor.toString()).to.equal('[object Cursor]');
          return cursor.close();
        });
    });

    it('`table` should return a cursor', function() {
      return test.table.run({ cursor: true })
        .then(function(cursor) {
          expect(cursor).to.exist;
          expect(cursor.toString()).to.equal('[object Cursor]');
          return cursor.close();
        });
    });
  });

  describe('#next', function() {
    it('should return a document', function() {
      return test.table.run({ cursor: true })
        .then(function(cursor) {
          return cursor.next();
        })
        .then(function(doc) {
          expect(doc).to.exist;
          expect(doc.id).to.exist;
        });
    });

    it('should work (testing common pattern)', function(done) {
      var count = 0;
      function processData(cursor) {
        return cursor.next()
          .then(function(result) {
            expect(result).to.exist; count++;
            return processData(cursor);
          });
      }

      test.table.run({ cursor: true })
        .then(function(cursor) {
          expect(cursor).to.exist;
          return processData(cursor);
        })
        .catch(function(err) {
          expect(err).to.match(/No more rows in the cursor./);
          expect(count).to.equal(100);
          done();
        });
    });

    it('should work with multiple batches', function(done) {
      var count = 0;
      function processData(cursor) {
        return cursor.next()
          .then(function(result) {
            expect(result).to.exist; count++;
            return processData(cursor);
          });
      }

      r.connect({ host: config.host, port: config.port, authKey: config.authKey })
        .then(function(connection) {
          expect(connection).to.exist;
          return test.table.run(connection, { cursor: true, maxBatchRows: 10 });
        })
        .then(function(cursor) {
          expect(cursor).to.exist;
          return processData(cursor);
        })
        .catch(function(err) {
          expect(err).to.match(/No more rows in the cursor./);
          expect(count).to.equal(100);
          done();
        });
    });

    it('should error when hitting an error -- not on the first batch', function(done) {
      var count = 0;
      function processData(cursor) {
        return cursor.next()
          .then(function(result) {
            expect(result).to.exist; count++;
            return processData(cursor);
          });
      }

      r.connect({ host: config.host, port: config.port, authKey: config.authKey })
        .then(function(connection) {
          expect(connection).to.exist;

          return test.table
            .orderBy({ index: 'id' })
            .map(r.row('val').add(1))
            .run(connection, { cursor: true, maxBatchRows: 10 });
        })
        .then(function(cursor) {
          expect(cursor).to.exist;
          return processData(cursor);
        })
        .catch(function(err) {
          expect(err).to.match(/No attribute `val` in object/);
          done();
        });
    });

    it('should work on a feed', function(done) {
      var count = 0;
      function processData(feed) {
        return feed.next()
          .then(function(result) {
            expect(result).to.exist; count++;
            if (count === 100) {
              feed.close();
              return done();
            }

            return processData(feed);
          });
      }

      test.table.changes()
        .then(function(feed) {
          return Promise.all([
            test.table.update({ foo: r.now() }),
            processData(feed)
          ]);
        });
    });

    it('should work on an atomic feed', function() {
      var idValue = test.uuid();
      return test.table.get(idValue).changes({ includeInitial: true })
        .then(function(feed) {
          test.feed = feed;
          return test.table.insert({ id: idValue });
        })
        .then(function() {
          return test.feed.next(); })
        .then(function(result) {
          expect(result).to.eql({ new_val: null });
          return test.feed.next();
        })
        .then(function(result) {
          expect(result).to.eql({new_val: { id: idValue }, old_val: null });
          return test.feed.close();
        })
        .then(function() { test.feed = undefined; });
    });
  });

  describe('#each', function() {
    it('should work', function(done) {
      test.table.run({ cursor: true })
        .then(function(cursor) {
          var count = 0;
          cursor.each(function(err, result) { count++; if (count === 100) done(); });
        });
    });

    it('should call the onFinish callback', function(done) {
      test.table.run({ cursor: true })
        .then(function(cursor) {
          cursor.each(function(err, result) {}, done);
        });
    });

    it('should call the error callback', function(done) {
      test.table.run({ cursor: true })
        .then(function(cursor) {
          var count = 0;
          cursor.each(function(err, result) {
            count++;
            return false;
          }, function() {
            expect(count).to.equal(1);
            done();
          });
        });
    });

    it('should not return an error if the feed is closed (1)', function(done) {
      var count = 0;
      test.table.changes()
        .then(function(feed) {
          test.feed = feed;
          return test.table.limit(2).update({ foo: r.now() });
        })
        .then(function() {
          test.feed.each(function(err, result) {
            if (result.new_val.foo instanceof Date) count++;
            if (count === 1) {
              test.feed.close()
                .then(function() { done(); });
            }
          });
        });
    });

    it('should not return an error if the feed is closed (2)', function(done) {
      var count = 0;
      test.table.changes()
        .then(function(feed) {
          test.feed = feed;
          return test.table.limit(2).update({ foo: r.now() });
        })
        .then(function() {
          test.feed.each(function(err, result) {
            if (result.new_val.foo instanceof Date) count++;
            if (count === 2) {
              test.feed.close()
                .then(function() { done(); });
            }
          });
        });
    });

    it('should return an error if the connection dies', function(done) {
      var conn;
      r.connect({ host: config.host, port: config.port, authKey: config.authKey })
        .then(function(conn_) {
          conn = conn_;
          expect(conn).to.exist;
          return test.table.changes().run(conn);
        })
        .then(function(feed) {
          feed.each(function(err, change) {
            expect(err.message)
              .to.match(/^The connection was closed before the query could be completed for/);
            done();
          });

          // Kill the TCP connection
          conn.connection.end();
        });
    });
  });

  describe('#eachAsync', function() {
    it('should work - callback style', function(done) {
      test.table.run({ cursor: true })
        .then(function(cursor) {
          expect(cursor).to.exist;

          var count = 0;
          var now = Date.now();
          var timeout = 10;
          cursor
            .eachAsync(function(result, onRowFinished) {
              count++;
              setTimeout(function() { onRowFinished(); }, timeout);
            })
            .then(function() {
              var elapsed = Date.now() - now;
              expect(elapsed).to.be.greaterThan(timeout * count);
              done();
            });
        });
    });

    it('should return an error if the connection dies', function(done) {
      var conn;
      r.connect({ host: config.host, port: config.port, authKey: config.authKey })
        .then(function(conn_) {
          conn = conn_;
          expect(conn).to.exist;
          return test.table.changes().run(conn);
        })
        .then(function(feed) {
          feed.eachAsync(function(change) {})
            .error(function(err) {
              expect(err.message)
                .to.match(/^The connection was closed before the query could be completed for/);
              done();
            });

          // Kill the TCP connection
          conn.connection.end();
        });
    });
  });

  describe('#toArray', function() {
    it('should work', function() {
      return test.table.run({ cursor: true })
        .then(function(cursor) { return cursor.toArray(); })
        .then(function(result) { expect(result).to.have.length(100); });
    });

    it('should work with profiling', function() {
      return test.table.run({ cursor: true, profile: true })
        .then(function(cursor) { return cursor.result.toArray(); })
        .then(function(result) { expect(result).to.have.length(100); });
    });

    it('should work on datum', function() {
      return r.expr([1, 2, 3]).run({ cursor: true })
        .then(function(cursor) { return cursor.toArray(); })
        .then(function(result) {
          expect(result).to.have.length(3);
          expect(result).to.eql([1, 2, 3]);
        });
    });

    it('should work with multiple batches - testing empty SUCCESS_COMPLETE', function() {
      return r.connect({
          host: config.host, port: config.port, authKey: config.authKey
        })
        .then(function(connection) {
          expect(connection).to.exist;
          return test.table.run(connection, { cursor: true, maxBatchRows: 1 });
        })
        .then(function(cursor) { return cursor.toArray(); })
        .then(function(result) { expect(result).to.exist; });
    });
  });

  describe('#close', function() {
    it('should work', function() {
      return test.table.run({ cursor: true })
        .then(function(cursor) { return cursor.close(); });
    });

    it('should work on feed', function() {
      return test.table.changes()
        .then(function(feed) { return feed.close(); });
    });

    it('should work on feed with events', function(done) {
      test.table.changes()
        .then(function(feed) {
          test.feed = feed;
          feed.on('end', function() { done(); });
        })
        .delay(300)
        .then(function() { return test.feed.close(); });
    });

    it('should still return a promise if the cursor was closed', function() {
      var cursor;
      return test.table.changes().run()
        .then(function(cursor_) { cursor = cursor_; return cursor.close(); })
        .then(function() { return cursor.close(); });
    });

  });

  describe('#EventEmitter (cursor)', function() {

    // ['next' /*, 'each', 'toArray'*/].forEach(function(method) {
    //   it('should not allow use of "' + method + '" when using EventEmitter interface', function() {
    //     return test.table.changes()
    //       .then(function(feed) {
    //         test.feed = feed;
    //         expect(feed[method])
    //           .to.throw(/You cannot called `next` once you have bound listeners on the Feed./);
    //       })
    //       .finally(function() { test.feed.close(); });
    //   });
    // });

    it('`on` should work on cursor - a `end` event should be eventually emitted on a cursor', function(done) {
      test.table.run({ cursor: true })
        .then(function(cursor) {
          cursor.on('end', function() { done(); });
          setTimeout(function() {
            return test.table.update({ foo: r.now() });
          }, 100);
        });
    });
  });

});
