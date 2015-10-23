"use strict";
var Promise = require('bluebird'),
    TestFixture = require('./support'),
    r = TestFixture.r,
    config = require('./config'),
    expect = require('chai').expect,
    Readable = require('stream').Readable;

var test = new TestFixture();
describe('ReadableStream', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });
  afterEach(function() { return test.cleanTables(); });

  it('`table` should return a stream', function() {
    return test.table.run({ stream: true })
      .then(function(stream) {
        expect(stream).to.exist;
        expect(stream).to.be.an.instanceOf(Readable);
        stream.close();
      });
  });

  it('arrays should return a stream', function(done) {
    var data = [10, 11, 12, 13, 14, 15, 16];
    return r.expr(data).run({ stream: true })
      .then(function(stream) {
        expect(stream).to.exist;
        expect(stream).to.be.an.instanceOf(Readable);

        var count = 0;
        stream.on('data', function(d) {
          expect(data).to.include(d);
          count++;
          if (count === data.length) {
            stream.close();
            done();
          }
        });
      });
  });

  it('changes() should return a stream', function(done) {
    var data = [{}, {}, {}, {}];
    return test.table.changes().run({ stream: true })
      .then(function(stream) {
        expect(stream).to.exist;
        expect(stream).to.be.an.instanceOf(Readable);

        var count = 0;
        stream.on('data', function(d) {
          count++;
          if (count === data.length) { stream.close(); done(); }
        });

        return test.table.insert(data);
      });
  });

  it('get().changes() should return a stream', function(done) {
    return test.table.get(1).changes().run({ stream: true })
      .then(function(stream) {
        expect(stream).to.exist;
        expect(stream).to.be.an.instanceOf(Readable);

        var count = 0;
        stream.on('data', function() {
          count++;
          if (count === 3) { stream.close(); done(); }
        });

        return Promise.all([
          test.table.insert({ id: 1 }),
          test.table.get(1).update({ update: 1 }),
          test.table.get(1).update({ update: 2 })
        ]);
      });
  });

  it('`table` should return a stream - testing empty SUCCESS_COMPLETE', function() {
    return r.connect({ max_batch_rows: 1, host: config.host, port: config.port, authKey: config.authKey })
      .then(function(connection) {
        return test.table.run(connection, { stream: true });
      })
      .then(function(stream) {
        expect(stream).to.exist;
        expect(stream).to.be.an.instanceOf(Readable);
        stream.close();
      });
  });

  it('test flowing - event data', function(done) {
    return test.table.insert([{}, {}, {}])
      .then(function() {
        return r.connect({ max_batch_rows: 1, host: config.host, port: config.port, authKey: config.authKey });
      })
      .then(function(connection) {
        return test.table.run(connection, { stream: true });
      })
      .then(function(stream) {
        expect(stream).to.exist;
        expect(stream).to.be.an.instanceOf(Readable);

        var count = 0;
        stream.on('data', function() {
          count++;
          if (count === 3) { stream.close(); done(); }
        });
      });
  });

  it('should return a document with `read` when the stream is readable', function(done) {
    return test.table.insert([{}, {}, {}])
      .then(function() {
        return r.connect({ max_batch_rows: 1, host: config.host, port: config.port, authKey: config.authKey });
      })
      .then(function(connection) {
        return test.table.run(connection, { stream: true });
      })
      .then(function(stream) {
        expect(stream).to.exist;
        expect(stream).to.be.an.instanceOf(Readable);

        stream.once('readable', function() {
          // read one doc
          var doc = stream.read();
          expect(doc).to.exist;

          // now read the rest
          var count = 1;
          stream.on('data', function() {
            count++;
            if (count === 3) { stream.close(); done(); }
          });
        });
      });
  });

  it('Test flowing - event data', function(done) {
    return test.table.insert([{}, {}, {}])
      .then(function() {
        return r.connect({ max_batch_rows: 1, host: config.host, port: config.port, authKey: config.authKey });
      })
      .then(function(connection) {
        return test.table.run(connection, { stream: true });
      })
      .then(function(stream) {
        expect(stream).to.exist;
        expect(stream).to.be.an.instanceOf(Readable);

        var count = 0;
        stream.on('data', function() {
          count++;
          if (count === 3) { stream.close(); done(); }
        });

        stream.pause();
        expect(count).to.equal(0);
        stream.resume();
      });
  });

  it('should not read null values', function(done) {
    return test.table.insert([
        {}, {}, {}, {}, {}, {}, {}, {}, {}, {},
        {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
      ])
      .then(function() {
        return r.connect({ max_batch_rows: 1, host: config.host, port: config.port, authKey: config.authKey });
      })
      .then(function(connection) {
        return test.table.limit(10).union([ null ])
          .union(test.table.limit(10)).run(connection, { stream: true });
      })
      .then(function(stream) {
        expect(stream).to.exist;
        expect(stream).to.be.an.instanceOf(Readable);

        stream.once('readable', function() {
          var count = 0;
          stream.on('data', function() {
            count++;
            expect(count).to.not.be.greaterThan(20);
            if (count === 20) { stream.close(); done(); }
          });
        });
      });
  });

  it('should support importing the module with stream as default', function() {
    var r1 = require('../lib')({
      stream: true,
      host: config.host,
      port: config.port,
      authKey: config.authKey,
      buffer: config.buffer,
      max: config.max,
      discovery: false,
      silent: true
    });

    return r1.db(test._dbName).table(test._tableName)
      .then(function(stream) {
        expect(stream).to.exist;
        expect(stream).to.be.an.instanceOf(Readable);
        stream.close();
      });
  });

  describe('#toStream', function() {
    afterEach(function() { return test.cleanTables(); });

    it('should work', function(done) {
      return test.table.insert([{}, {}, {}])
        .then(function() {
          return r.connect({ max_batch_rows: 1, host: config.host, port: config.port, authKey: config.authKey });
        })
        .then(function(connection) {
          return test.table.toStream();
        })
        .then(function(stream) {
          expect(stream).to.exist;
          expect(stream).to.be.an.instanceOf(Readable);

          stream.once('readable', function() {
            // read one doc
            var doc = stream.read();
            expect(doc).to.exist;

            // now read the rest
            var count = 1;
            stream.on('data', function() {
              count++;
              if (count === 3) { stream.close(); done(); }
            });
          });
        });
    });

    it('should work with grouped data', function(done) {
      return test.table.insert([{}, {}, {}])
        .then(function() {
          return r.connect({ max_batch_rows: 1, host: config.host, port: config.port, authKey: config.authKey });
        })
        .then(function(connection) {
          return test.table.group({index: 'id'}).toStream();
        })
        .then(function(stream) {
          expect(stream).to.exist;
          expect(stream).to.be.an.instanceOf(Readable);

          stream.once('readable', function() {
            // read one doc
            var doc = stream.read();
            expect(doc).to.exist;

            // now read the rest
            var count = 1;
            stream.on('data', function() {
              count++;
              if (count === 3) { stream.close(); done(); }
            });
          });
        });
    });
  });

/*
// NOTE: these belong in WritableStream and TransformStream tests

it('pipe should work with a writable stream - 200-200', function(done) {
  var r1 = require('../lib')({buffer:1, max: 2, discovery: false, silent: true});

  r1.db(dbName).table(tableName).toStream({highWaterMark: 200})
    .pipe(r1.db(dbName).table(dumpTable).toStream({writable: true, highWaterMark: 200}))
    .on('finish', function() {
      r.expr([
        r1.db(dbName).table(tableName).count(),
        r1.db(dbName).table(dumpTable).count()
      ]).run().then(function(result) {
        if (result[0] !== result[1]) {
          done(new Error('All the data should have been streamed'));
        }
        return r1.db(dbName).table(dumpTable).delete()
      }).then(function() {
        r1.getPool(0).drain();
      }).then(function() {
        setTimeout(done, 1000);
        //done();
      }).error(done);
    });
})
it('pipe should work with a writable stream - 200-20', function(done) {
  var r1 = require('../lib')({buffer:1, max: 2, discovery: false, silent: true});

  r1.db(dbName).table(tableName).toStream({highWaterMark: 200})
    .pipe(r1.db(dbName).table(dumpTable).toStream({writable: true, highWaterMark: 20}))
    .on('finish', function() {
      r.expr([
        r1.db(dbName).table(tableName).count(),
        r1.db(dbName).table(dumpTable).count()
      ]).run().then(function(result) {
        if (result[0] !== result[1]) {
          done(new Error('All the data should have been streamed'));
        }
        return r1.db(dbName).table(dumpTable).delete()
      }).then(function() {
        r1.getPool(0).drain();
        done();
      }).error(done);
    });
})
it('pipe should work with a writable stream - 20-200', function(done) {
  var r1 = require('../lib')({buffer:1, max: 2, discovery: false, silent: true});

  r1.db(dbName).table(tableName).toStream({highWaterMark: 20})
    .pipe(r1.db(dbName).table(dumpTable).toStream({writable: true, highWaterMark: 200}))
    .on('finish', function() {
      r.expr([
        r1.db(dbName).table(tableName).count(),
        r1.db(dbName).table(dumpTable).count()
      ]).run().then(function(result) {
        if (result[0] !== result[1]) {
          done(new Error('All the data should have been streamed'));
        }
        return r1.db(dbName).table(dumpTable).delete()
      }).then(function() {
        r1.getPool(0).drain();
        done();
      }).error(done);
    });
})
it('pipe should work with a writable stream - 50-50', function(done) {
  var r1 = require('../lib')({buffer:1, max: 2, discovery: false, silent: true});

  r1.db(dbName).table(tableName).toStream({highWaterMark: 50})
    .pipe(r1.db(dbName).table(dumpTable).toStream({writable: true, highWaterMark: 50}))
    .on('finish', function() {
      r.expr([
        r1.db(dbName).table(tableName).count(),
        r1.db(dbName).table(dumpTable).count()
      ]).run().then(function(result) {
        if (result[0] !== result[1]) {
          console.log(result);
          done(new Error('All the data should have been streamed'));
        }
        return r1.db(dbName).table(dumpTable).delete()
      }).then(function() {
        r1.getPool(0).drain();
        done();
      }).error(function(err) {
        console.log(err);
        done(err);
      });
    });
})
it('toStream((writable: true}) should handle options', function(done) {
  var r1 = require('../lib')({buffer:1, max: 2, discovery: false, silent: true});

  var stream = r1.db(dbName).table(dumpTable).toStream({writable: true, highWaterMark: 50, conflict: 'replace'});
  stream.write({id: 1, foo: 1});
  stream.write({id: 1, foo: 2});
  stream.end({id: 1, foo: 3});
  stream.on('finish', function() {
    r1.db(dbName).table(dumpTable).count().then(function(result) {
      assert.equal(result, 1);
      return r1.db(dbName).table(dumpTable).get(1)
    }).then(function(result) {
      assert.deepEqual(result, {id: 1, foo: 3});
      return r1.db(dbName).table(dumpTable).delete();
    }).then(function(result) {
      r1.getPool(0).drain();
      done();
    }).error(done);
  });
})

it('test pipe all streams', function(done) {
  // Create a transform stream that will convert data to a string
  var stream = require('stream')
  var addfoobar = new stream.Transform();
  addfoobar._writableState.objectMode = true;
  addfoobar._readableState.objectMode = true;
  addfoobar._transform = function (data, encoding, done) {
    data.transform = true;
    this.push(data);
    done();
  }
  var addbuzzlol = new stream.Transform();
  addbuzzlol._writableState.objectMode = true;
  addbuzzlol._readableState.objectMode = true;
  addbuzzlol._transform = function (data, encoding, done) {
    delete data.id
    data.written = true;
    this.push(data);
    done();
  }

  r.db(dbName).table(tableName).without('id').toStream()
    .on('error', done)
    .pipe(addfoobar)
    .on('error', done)
    .pipe(r.db(dbName).table(dumpTable).toStream({transform: true}))
    .on('error', done)
    .pipe(addbuzzlol)
    .on('error', done)
    .pipe(r.db(dbName).table(dumpTable).toStream({writable: true}))
    .on('error', done)
    .on('finish', function() {
      r.db(dbName).table(dumpTable).filter({written: true}).count().run().then(function(result) {
        assert(result, numDocs);
        return r.db(dbName).table(dumpTable).filter({transform:true}).count().run()
      }).then(function() {
        assert(result, numDocs*2);
        return r.db(dbName).table(dumpTable).delete();
      }).then(function(result) {
        done();
        r.getPool(0).drain();
      });
    });
})

it('toStream({writable: true}) should throw on something else than a table', function(done) {
  var r1 = require('../lib')({buffer:1, max: 2, discovery: false, silent: true});

  try {
    r.expr(dumpTable).toStream({writable: true});
  }
  catch(err) {
    assert(err.message, "Cannot create a writable stream on something else than a table.");
    done();
  }
})

it('toStream({transform: true}) should throw on something else than a table', function(done) {
  var r1 = require('../lib')({buffer:1, max: 2, discovery: false, silent: true});

  try {
    r.expr(dumpTable).toStream({transform: true});
  }
  catch(err) {
    assert(err.message, "Cannot create a writable stream on something else than a table.");
    done();
  }
})
*/

});
