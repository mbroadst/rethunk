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
        var connection = yield r.connect({max_batch_rows: 1, host: config.host, port: config.port, authKey: config.authKey});
        assert(connection);

        result = yield r.db(dbName).table(tableName).run(connection);
        assert(result.length > 0);
        done();
      }
      catch(e) {
        done(e);
      }
    })
    */
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

      return test.table.run({ cursor: true })
        .then(function(cursor) {
          expect(cursor).to.exist;
          return processData(cursor);
        })
        .catch(function(err) {
          expect(err).to.match(/No more rows in the Cursor./);
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

      return r.connect({
          max_batch_rows: 10, host: config.host, port: config.port, authKey: config.authKey
        })
        .then(function(connection) {
          expect(connection).to.exist;
          return test.table.run(connection, { cursor: true });
        })
        .then(function(cursor) {
          expect(cursor).to.exist;
          return processData(cursor);
        })
        .catch(function(err) {
          expect(err).to.match(/No more rows in the Cursor./);
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

      return r.connect({
          max_batch_rows: 10, host: config.host, port: config.port, authKey: config.authKey
        })
        .then(function(connection) {
          expect(connection).to.exist;

          return test.table
            .orderBy({ index: 'id' })
            .map(r.row('val').add(1))
            .run(connection, { cursor: true });
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

      return test.table.changes()
        .then(function(feed) {
          return Promise.all([
            test.table.update({ foo: r.now() }),
            processData(feed)
          ]);
        });
    });

    it('should work on an atom feed', function() {
      var idValue = test.uuid();
      return test.table.get(idValue).changes()
        .then(function(feed) {
          test.feed = feed;
          return test.table.insert({ id: idValue });
        })
        .then(function() { return test.feed.next(); })
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
      return test.table.run({ cursor: true })
        .then(function(cursor) {
          var count = 0;
          cursor.each(function(err, result) { count++; if (count === 100) done(); });
        });
    });

    it('should call the onFinish callback', function(done) {
      return test.table.run({ cursor: true })
        .then(function(cursor) {
          cursor.each(function(err, result) {}, done);
        });
    });

    it('should call the error callback', function(done) {
      return test.table.run({ cursor: true })
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
      return test.table.changes()
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
      return test.table.changes()
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
          max_batch_rows: 1, host: config.host, port: config.port, authKey: config.authKey
        })
        .then(function(connection) {
          expect(connection).to.exist;
          return test.table.run(connection, { cursor: true });
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
      return test.table.changes()
        .then(function(feed) {
          test.feed = feed;
          feed.on('end', function() { done(); });
        })
        .delay(100)
        .then(function() { return test.feed.close(); });
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

  });

/*
  // @todo: these all belong in the "Accessing ReQL" test suite

    it('`on` should work on feed', function() {
      try {
        feed = yield r.db(dbName).table(tableName2).changes().run();
        setTimeout(function() {
          r.db(dbName).table(tableName2).update({foo: r.now()}).run();
        }, 100)
        var i=0;
        feed.on('data', function() {
          i++;
          if (i === smallNumDocs) {
            feed.close().then(function() {
              done();
            }).error(function(error) {
              done(error);
            });
          }
        });
        feed.on('error', function(e) {
          done(e)
        })
      }
      catch(e) {
        done(e);
      }
    })
    it('`on` should work on cursor - a `end` event shoul be eventually emitted on a cursor', function() {
      try {
        cursor = yield r.db(dbName).table(tableName2).run({cursor: true});
        setTimeout(function() {
          r.db(dbName).table(tableName2).update({foo: r.now()}).run();
        }, 100)
        cursor.on('end', function() {
          done()
        });
        cursor.on('error', function(e) {
          done(e)
        })
      }
      catch(e) {
        done(e);
      }
    })

    it('Import with cursor as default', function() {
      yield util.sleep(1000);
      var r1 = require('../lib')({cursor: true, host: config.host, port: config.port, authKey: config.authKey, buffer: config.buffer, max: config.max, silent: true});
      var i=0;
      try {
        cursor = yield r1.db(dbName).table(tableName).run();
        assert.equal(cursor.toString(), '[object Cursor]');
        yield cursor.close();
        done();
      }
      catch(e) {
        done(e);
      }
    })

    it('events should not return an error if the feed is closed - 1', function() {
      try {
        feed = yield r.db(dbName).table(tableName2).get(1).changes().run();
        setTimeout(function() {
          r.db(dbName).table(tableName2).insert({id: 1}).run();
        }, 100)
        feed.each(function(err, result) {
          if (err) {
            return done(err);
          }
          if ((result.new_val != null) && (result.new_val.id === 1)) {
            feed.close().then(function() {
              done();
            }).error(done);
          }
        });
      }
      catch(e) {
        done(e);
      }
    })
    it('events should not return an error if the feed is closed - 2', function() {
      try {
        feed = yield r.db(dbName).table(tableName2).changes().run();
        setTimeout(function() {
          r.db(dbName).table(tableName2).limit(2).update({foo: r.now()}).run();
        },100)
        var count = 0;
        feed.on('data', function(result) {
          if (result.new_val.foo instanceof Date) {
            count++;
          }
          if (count === 1) {
            setTimeout(function() {
              feed.close().then(function() {
                done();
              }).error(done);
            }, 100);
          }
        });
      }
      catch(e) {
        done(e);
      }
    })
    it('`includeStates` should work', function() {
      try {
        feed = yield r.db(dbName).table(tableName).orderBy({index: 'id'}).limit(10).changes({includeStates: true}).run();
        var i = 0;
        feed.each(function(err, change) {
          i++;
          if (i === 10) {
            feed.close();
            done();
          }
        });
      }
      catch(e) {
        done(e);
      }
    })
*/


/*

    var numDocs = 100; // Number of documents in the "big table" used to test the SUCCESS_PARTIAL
    var smallNumDocs = 5; // Number of documents in the "small table"

    it('Init for `cursor.js`', function() {
      try {
        dbName = uuid();
        tableName = uuid(); // Big table to test partial sequence
        tableName2 = uuid(); // small table to test success sequence

        result = yield r.dbCreate(dbName).run()
        assert.equal(result.dbs_created, 1);
        result = yield [
          r.db(dbName).tableCreate(tableName)('tables_created').run(),
          r.db(dbName).tableCreate(tableName2)('tables_created').run()
        ]
        assert.deepEqual(result, [1, 1]);
        done();
      }
      catch(e) {
        done(e);
      }
    })
    it('Inserting batch - table 1', function() {
      try {
        result = yield r.db(dbName).table(tableName).insert(eval('['+new Array(numDocs).join('{}, ')+'{}]')).run();
        assert.equal(result.inserted, numDocs);
        done();
      }
      catch(e) {
        done(e);
      }
    })
    it('Inserting batch - table 2', function() {
      try {
        result = yield r.db(dbName).table(tableName2).insert(eval('['+new Array(smallNumDocs).join('{}, ')+'{}]')).run();
        assert.equal(result.inserted, smallNumDocs);
        done();
      }
      catch(e) {
        done(e);
      }
    })
    it('Updating batch', function() {
      try {
        // Add a date
        result = yield r.db(dbName).table(tableName).update({
          date: r.now().sub(r.random().mul(1000000)),
          value: r.random()
        }, {nonAtomic: true}).run();
        done();
      }
      catch(e) {
        done(e);
      }
    })
    it('`table` should return a cursor', function() {
      try {
        cursor = yield r.db(dbName).table(tableName).run({cursor: true});
        assert(cursor);
        assert.equal(cursor.toString(), '[object Cursor]');

        done();
      }
      catch(e) {
        done(e);
      }
    })



    // This test is not working for now -- need more data? Server bug?
    it('Remove the field `val` in some docs', function() {
      var i=0;
      try {
        result = yield r.db(dbName).table(tableName).update({val: 1}).run();
        //assert.equal(result.replaced, numDocs);

        result = yield r.db(dbName).table(tableName)
          .orderBy({index: r.desc("id")}).limit(5).replace(r.row.without("val"))
          //.sample(1).replace(r.row.without("val"))
          .run({cursor: true});
        assert.equal(result.replaced, 5);
        done();
      }
      catch(e) {
        done(e);
      }
    })
    it('`changes` should work with squash: true', function() {
      try {
        feed = yield r.db(dbName).table(tableName).changes({squash: true}).run();
        assert(feed);
        assert.equal(feed.toString(), '[object Feed]');
        yield feed.close();
        done();
      }
      catch(e) {
        done(e);
      }
    })

    it('`get.changes` should return a feed', function() {
      try {
        feed = yield r.db(dbName).table(tableName).get(1).changes().run();
        assert(feed);
        assert.equal(feed.toString(), '[object AtomFeed]');
        yield feed.close();
        done();
      }
      catch(e) {
        done(e);
      }
    })
    it('`orderBy.limit.changes` should return a feed', function() {
      try {
        feed = yield r.db(dbName).table(tableName).orderBy({index: 'id'}).limit(2).changes().run();
        assert(feed);
        assert.equal(feed.toString(), '[object OrderByLimitFeed]');
        yield feed.close();
        done();
      }
      catch(e) {
        done(e);
      }
    })

*/


});
