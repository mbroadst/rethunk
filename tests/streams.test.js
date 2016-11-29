"use strict";
var Stream = require('stream'),
    TestFixture = require('./support'),
    r = TestFixture.r,
    config = require('./config'),
    expect = require('chai').expect,
    devNull = require('dev-null'),
    Readable = require('stream').Readable;

var conditionalDescribe = describe;
if (process.version.match(/v0.10./)) {
  console.log('Streams are incredibly flakey on v0.10.x, skipping...');
  conditionalDescribe = describe.skip;
}

var test = new TestFixture();
conditionalDescribe('Streams', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });

  describe('ReadableStream', function() {
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
      r.expr(data).run({ stream: true })
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
      test.table.changes().run({ stream: true })
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
      test.table.get(1).changes().run({ stream: true })
        .then(function(stream) {
          expect(stream).to.exist;
          expect(stream).to.be.an.instanceOf(Readable);

          var count = 0;
          stream.on('data', function(d) {
            count++;
            if (count === 3) { stream.close(); done(); }
          });
        })
        .delay(100)
        .then(function() { return test.table.insert({ id: 1 }); })
        .then(function() { return test.table.get(1).update({ update: 1 }); })
        .then(function() { return test.table.get(1).update({ update: 2 }); });
    });

    it('`table` should return a stream - testing empty SUCCESS_COMPLETE', function() {
      return r.connect({ host: config.host, port: config.port, authKey: config.authKey })
        .then(function(connection) {
          return test.table.run(connection, { stream: true, maxBatchRows: 1 });
        })
        .then(function(stream) {
          expect(stream).to.exist;
          expect(stream).to.be.an.instanceOf(Readable);
          stream.close();
        });
    });

    it('test flowing - event data', function(done) {
      test.table.insert([{}, {}, {}])
        .then(function() {
          return r.connect({ host: config.host, port: config.port, authKey: config.authKey });
        })
        .then(function(connection) {
          return test.table.run(connection, { stream: true, maxBatchRows: 1 });
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
      test.table.insert([{}, {}, {}])
        .then(function() {
          return r.connect({ host: config.host, port: config.port, authKey: config.authKey });
        })
        .then(function(connection) {
          return test.table.run(connection, { stream: true, maxBatchRows: 1 });
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
      test.table.insert([{}, {}, {}])
        .then(function() {
          return r.connect({ host: config.host, port: config.port, authKey: config.authKey });
        })
        .then(function(connection) {
          return test.table.run(connection, { stream: true, maxBatchRows: 1 });
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
      test.table.insert([
          {}, {}, {}, {}, {}, {}, {}, {}, {}, {},
          {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
        ])
        .then(function() {
          return r.connect({ host: config.host, port: config.port, authKey: config.authKey });
        })
        .then(function(connection) {
          return test.table.limit(10).union([ null ])
            .union(test.table.limit(10)).run(connection, { stream: true, maxBatchRows: 1 });
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
        test.table.insert([{}, {}, {}])
          .then(function() {
            return r.connect({ host: config.host, port: config.port, authKey: config.authKey });
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
        test.table.insert([{}, {}, {}])
          .then(function() {
            return r.connect({ host: config.host, port: config.port, authKey: config.authKey });
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
  });

  describe('WritableStream', function() {
    afterEach(function() { return test.cleanTables(); });

    it('test pipe writable - fast input', function(done) {
      var stream = new Readable({ objectMode: true });
      var size = 35;
      var value = test.uuid();
      for (var i = 0; i < size; i++) {
        stream.push({field: value});
      }
      stream.push(null);

      var tableStream = test.table.toStream({ writable: true, debug: true, highWaterMark: 10 });
      stream.pipe(tableStream)
        .on('finish', function() {
          test.table.filter({field: value}).count()
            .then(function(result) {
              expect(result).to.equal(size);
              expect(tableStream._sequence).to.eql([10, 10, 10, 5]);
              done();
            });
        });
    });

    it('test pipe writable - slow input - 1', function(done) {
      var stream = new Readable({ objectMode: true });
      var values = [ test.uuid(), test.uuid() ];

      var i = 0;
      stream._read = function() {
        i++;
        if (i <= 3) {
          stream.push({field: values[0]});
        } else if (i === 4) {
          setTimeout(function() { stream.push({field: values[1]}); }, 1000);
        } else if (i <= 10) {
          stream.push({field: values[1]});
        } else {
          stream.push(null);
        }
      };

      var tableStream = test.table.toStream({ writable: true, debug: true, highWaterMark: 5 });
      stream.pipe(tableStream)
        .on('finish', function() {
          r.expr([
            test.table.filter({ field: values[0] }).count(),
            test.table.filter({ field: values[1] }).count()
          ])
          .then(function(result) {
            expect(result).to.eql([3, 7]);
            expect(tableStream._sequence).to.eql([3, 5, 2]);
            done();
          });
        });
    });

    it('test pipe writable - slow input - 2', function(done) {
      var stream = new Readable({objectMode: true});
      var values = [ test.uuid(), test.uuid() ];

      var i = 0;
      stream._read = function() {
        i++;
        if (i <= 5) {
          stream.push({field: values[0]});
        } else if (i === 6) {
          setTimeout(function() { stream.push({field: values[1]}); }, 1000);
        } else if (i <= 10) {
          stream.push({field: values[1]});
        } else {
          stream.push(null);
        }
      };

      var tableStream = test.table.toStream({writable: true, debug: true, highWaterMark: 5});
      stream.pipe(tableStream)
        .on('finish', function() {
          r.expr([
            test.table.filter({field: values[0]}).count(),
            test.table.filter({field: values[1]}).count()
          ])
          .then(function(result) {
            expect(result).to.eql([5, 5]);
            expect(tableStream._sequence).to.eql([5, 5]);
            done();
          });
        });
    });

    it('test pipe writable - single insert', function(done) {
      var stream = new Readable({objectMode: true});
      var value = test.uuid();

      var i = 0;
      stream._read = function() {
        i++;
        if (i > 10) {
          stream.push(null);
        } else {
          setTimeout(function() { stream.push({field: value}); }, 50);
        }
      };

      var tableStream = test.table.toStream({writable: true, debug: true, highWaterMark: 5});
      stream.pipe(tableStream)
        .on('finish', function() {
          test.table.filter({ field: value }).count()
            .then(function(result) {
              expect(result).to.equal(10);
              expect(tableStream._sequence).to.eql([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
              done();
            });
        });
    });
  });

  describe('TransformStream', function() {
    afterEach(function() { return test.cleanTables(); });

    it('test pipe transform - fast input', function(done) {
      var stream = new Readable({ objectMode: true });
      var size = 35;
      var value = test.uuid();
      for (var i = 0; i < size; i++) {
        stream.push({ field: value });
      }
      stream.push(null);

      var tableStream = test.table.toStream({ transform: true, debug: true, highWaterMark: 10 });
      stream.pipe(tableStream)
        .on('error', function(err) { console.log('ERROR: ', err); })
        .on('end', function() {
          test.table.filter({ field: stream._value }).count()
            .then(function(result) {
              expect(result).to.eql(size);
              expect(tableStream._sequence).to.eql([10, 10, 10, 5]);
              done();
            });
        })
        .pipe(devNull({ objectMode: true }));
    });

    it('test pipe transform - slow input - 1', function(done) {
      var stream = new Readable({ objectMode: true });
      var values = [test.uuid(), test.uuid()];
      var tableStream = test.table.toStream({ transform: true, debug: true, highWaterMark: 5 });

      var i = 0;
      stream._read = function() {
        i++;
        if (i <= 3) {
          stream.push({ field: values[0] });
        } else if (i === 4) {
          setTimeout(function() { stream.push({field: values[1]}); }, 1000);
        } else if (i <= 10) {
          stream.push({field: values[1]});
        } else {
          stream.push(null);
        }
      };

      stream.pipe(tableStream)
        .on('end', function() {
          r.expr([
            test.table.filter({ field: values[0] }).count(),
            test.table.filter({ field: values[1] }).count()
          ])
          .then(function(result) {
            expect(result).to.eql([3, 7]);
            expect(tableStream._sequence).to.eql([3, 5, 2]);
            done();
          });
        })
        .pipe(devNull({ objectMode: true }));
    });

    it('test pipe transform - slow input - 2', function(done) {
      var stream = new Readable({objectMode: true});
      var values = [ test.uuid(), test.uuid() ];
      var tableStream = test.table.toStream({ transform: true, debug: true, highWaterMark: 5 });

      var i = 0;
      stream._read = function() {
        i++;
        if (i <= 5) {
          stream.push({field: values[0]});
        } else if (i === 6) {
          setTimeout(function() { stream.push({field: values[1]}); }, 1000);
        } else if (i <= 10) {
          stream.push({field: values[1]});
        } else {
          stream.push(null);
        }
      };

      stream.pipe(tableStream)
        .on('error', done)
        .on('end', function() {
          r.expr([
            test.table.filter({field: values[0]}).count(),
            test.table.filter({field: values[1]}).count()
          ])
          .then(function(result) {
            expect(result).to.eql([5, 5]);
            expect(tableStream._sequence).to.eql([5, 5]);
            done();
          });
        })
        .pipe(devNull({ objectMode: true }));
    });

    it('test pipe transform - single insert', function(done) {
      // Create a transform stream that will convert data to a string
      var stream = new Readable({objectMode: true});
      var value = test.uuid();
      var tableStream =
        test.table.toStream({ transform: true, debug: true, highWaterMark: 5 });

      var i = 0;
      stream._read = function() {
        i++;
        if (i > 10) {
          this.push(null);
        } else {
          setTimeout(function() { stream.push({field: value}); }, 100); // suppose that each insert take less than 100 ms
        }
      };

      stream.pipe(tableStream)
        .on('end', function() {
          r.expr(test.table.filter({ field: value }).count())
            .then(function(result) {
              expect(result).to.equal(10);
              expect(tableStream._sequence).to.eql([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
              done();
            });
        })
        .pipe(devNull({ objectMode: true }));
    });

    it('test transform output - object', function(done) {
      var stream = new Readable({ objectMode: true });
      var values = [ test.uuid(), test.uuid()];

      var i = 0;
      stream._read = function() {
        i++;
        if (i <= 3) {
          stream.push({field: values[0]});
        } else if (i === 4) {
          setTimeout(function() { stream.push({field: values[1]}); }, 300);
        } else if (i <= 10) {
          stream.push({field: values[1]});
        } else {
          stream.push(null);
        }
      };

      var tableStream = test.table.toStream({ transform: true });

      var result = [];
      var endStream = new Stream.Transform();
      endStream._writableState.objectMode = true;
      endStream._readableState.objectMode = true;
      endStream._transform = function (data, encoding, streamDone) {
        result.push(data);
        this.push(data);
        streamDone();
      };

      stream.pipe(tableStream)
        .pipe(endStream)
        .on('finish', function() {
          expect(result).to.have.length(10);
          result.forEach(function(r) { expect(r).to.be.an('object'); });
          done();
        });
    });

    it('test transform output - string', function(done) {
      var stream = new Readable({ objectMode: true });
      var values = [ test.uuid(), test.uuid() ];

      var i = 0;
      stream._read = function() {
        i++;
        if (i <= 3) {
          stream.push({field: values[0]});
        } else if (i === 4) {
          setTimeout(function() { stream.push({field: values[1]}); }, 300);
        } else if (i <= 10) {
          stream.push({field: values[1]});
        } else {
          stream.push(null);
        }
      };

      var result = [];
      var endStream = new Stream.Transform();
      endStream._writableState.objectMode = true;
      endStream._readableState.objectMode = true;
      endStream._transform = function (data, encoding, streamDone) {
        result.push(data);
        this.push(data);
        streamDone();
      };

      var tableStream = test.table.toStream({ transform: true, format: 'primaryKey' });
      stream.pipe(tableStream)
        .pipe(endStream)
        .on('finish', function() {
          expect(result).to.have.length(10);
          result.forEach(function(r) { expect(r).to.be.a.string; });
          done();
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
