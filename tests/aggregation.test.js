"use strict";
var Promise = require('bluebird'),
    TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

var test = new TestFixture();
describe('Aggregation', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });

  describe('#group', function() {
    it('should work ', function() {
      var users = [
        { name: 'Michel', grownUp: true }, { name: 'Laurent', grownUp: true },
        { name: 'Sophie', grownUp: true }, { name: 'Luke', grownUp: false },
        { name: 'Mino', grownUp: false }
      ];

      return r.expr(users).group('grownUp')
        .then(function(result) {
          expect(result).to.eql([
            {
              group: false,
              reduction: [
                { grownUp: false, name: 'Luke' }, { grownUp: false, name: 'Mino' }
              ]
            }, {
              group: true,
              reduction: [
                { grownUp: true, name: 'Michel' }, { grownUp: true, name: 'Laurent' },
                { grownUp: true, name: 'Sophie' }
              ]
            }
          ]);
        });
    });

    it('should work with r.row', function() {
      var users = [
        { name: 'Michel', grownUp: true }, { name: 'Laurent', grownUp: true },
        { name: 'Sophie', grownUp: true }, { name: 'Luke', grownUp: false },
        { name: 'Mino', grownUp: false }
      ];

      return r.expr(users).group(r.row('grownUp'))
        .then(function(result) {
          expect(result).to.eql([
            {
              group: false,
              reduction: [
                { grownUp: false, name: 'Luke' }, { grownUp: false, name: 'Mino' }
              ]
            }, {
              group: true,
              reduction: [
                { grownUp: true, name: 'Michel' }, { grownUp: true, name: 'Laurent' },
                { grownUp: true, name: 'Sophie' }
              ]
            }
          ]);
        });
    });

    it('should work with an index ', function() {
      return test.table.insert([
        {id: 1, group: 1}, {id: 2, group: 1}, {id: 3, group: 1}, {id: 4, group: 4},
      ])
      .then(function() { return test.table.indexCreate('group'); })
      .then(function() { return test.table.indexWait('group'); })
      .then(function() { return test.table.group({ index: 'group' }); })
      .then(function(result) {
        expect(result).to.eql([
          { group: 1,
            reduction: [ { id: 3, group: 1 }, { id: 2, group: 1 }, { id: 1, group: 1 } ]
          },
          { group: 4,
            reduction: [ { id: 4, group: 4 } ]
          }
        ]);
      });
    });

    it('should work with groupFormat: raw', function() {
      var users = [
        { name: 'Michel', grownUp: true }, { name: 'Laurent', grownUp: true },
        { name: 'Sophie', grownUp: true }, { name: 'Luke', grownUp: false },
        { name: 'Mino', grownUp: false }
      ];

      return r.expr(users).group('grownUp').run({ groupFormat: 'raw' })
        .then(function(result) {
          expect(result).to.eql({
            $reql_type$: 'GROUPED_DATA',
            data: [
              [ false, [ { grownUp: false, name: 'Luke' }, { grownUp: false, name: 'Mino' } ] ],
              [ true, [
                { grownUp: true, name: 'Michel' }, { grownUp: true, name: 'Laurent' },
                { grownUp: true, name: 'Sophie' }
                ] ]
            ]
          });
        });
    });

    it('should property parse the results', function() {
      return r.expr([
          { name: "Michel", date: r.now() },
          { name: "Laurent", date: r.now() },
          { name: "Sophie", date: r.now().sub(1000) }
        ])
        .group('date')
        .then(function(result) {
          expect(result).to.have.length(2);
          expect(result[0].group).to.be.an.instanceOf(Date);
          expect(result[0].reduction[0].date).to.be.an.instanceOf(Date);
        });
    });
  });

  describe('#ungroup', function() {
    it('should work ', function() {
      var users = [
        { name: 'Michel', grownUp: true }, { name: 'Laurent', grownUp: true },
        { name: 'Sophie', grownUp: true }, { name: 'Luke', grownUp: false },
        { name: 'Mino', grownUp: false }
      ];

      return r.expr(users).group('grownUp').ungroup()
        .then(function(result) {
          expect(result).to.eql([
            {
              group: false,
              reduction: [
                { grownUp: false, name: 'Luke' }, { grownUp: false, name: 'Mino' }
              ]
            }, {
              group: true,
              reduction: [
                { grownUp: true, name: 'Michel' }, { grownUp: true, name: 'Laurent' },
                { grownUp: true, name: 'Sophie' }
              ]
            }
          ]);
        });
    });
  });

  describe('#reduce', function() {
    it('should work -- no base ', function() {
      return r.expr([1,2,3]).reduce(function(left, right) { return left.add(right); })
        .then(function(result) { expect(result).to.equal(6); });
    });

    it('should throw if no arguments are passed', function() {
      var invalid = function() { return test.table.reduce(); };
      expect(invalid).to.throw(/`reduce` takes 1 argument, 0 provided/);
    });
  });

  describe('#count', function() {
    it('should work with no arguments', function() {
      return r.expr([0, 1, 2, 3, 4, 5]).count()
        .then(function(result) { expect(result).to.equal(6); });
    });

    it('should work with a filter argument', function() {
      return Promise.all([
        r.expr([0, 1, 2, 3, 4, 5]).count(r.row.eq(2)),
        r.expr([0, 1, 2, 3, 4, 5]).count(function(doc) { return doc.eq(2); })
      ])
      .spread(function(r1, r2) {
        expect(r1).to.equal(1);
        expect(r2).to.equal(1);
      });
    });
  });

  describe('#sum', function() {
    it('should work ', function() {
      return r.expr([1,2,3]).sum()
        .then(function(result) { expect(result).to.equal(6); });
    });

    it('should work with a field', function() {
      return r.expr([{a: 2}, {a: 10}, {a: 9}]).sum('a')
        .then(function(result) { expect(result).to.equal(21); });
    });
  });

  describe('#avg', function() {
    it('should work ', function() {
      return r.expr([1,2,3]).avg()
        .then(function(result) { expect(result).to.equal(2); });
    });

    it('should work with a field', function() {
      return r.expr([{a: 2}, {a: 10}, {a: 9}]).avg('a')
        .then(function(result) { expect(result).to.equal(7); });
    });

    describe('#r.avg', function() {
      it('should work ', function() {
        return r.avg([1,2,3])
          .then(function(result) { expect(result).to.equal(2); });
      });

      it('should work with a field', function() {
        return r.avg([{a: 2}, {a: 10}, {a: 9}], 'a')
          .then(function(result) { expect(result).to.equal(7); });
      });
    });
  });

  describe('#min', function() {
    it('should work ', function() {
      return r.expr([1,2,3]).min()
        .then(function(result) { expect(result).to.equal(1); });
    });

    it('should work with a field', function() {
      return r.expr([{a: 2}, {a: 10}, {a: 9}]).min('a')
        .then(function(result) { expect(result).to.eql({ a: 2 }); });
    });

    describe('#r.min', function() {
      it('should work ', function() {
        return r.min([1,2,3])
          .then(function(result) { expect(result).to.equal(1); });
      });

      it('should work with a field', function() {
        return r.min([{a: 2}, {a: 10}, {a: 9}], 'a')
          .then(function(result) { expect(result).to.eql({ a: 2 }); });
      });
    });
  });

  describe('#max', function() {
    it('should work ', function() {
      return r.expr([1,2,3]).max()
        .then(function(result) { expect(result).to.equal(3); });
    });

    it('should work with a field', function() {
      return r.expr([{a: 2}, {a: 10}, {a: 9}]).max('a')
        .then(function(result) { expect(result).to.eql({ a: 10 }); });
    });

    describe('#r.max', function() {
      it('should work ', function() {
        return r.max([1,2,3])
          .then(function(result) { expect(result).to.equal(3); });
      });

      it('should work with a field', function() {
        return r.max([{a: 2}, {a: 10}, {a: 9}], 'a')
          .then(function(result) { expect(result).to.eql({ a: 10 }); });
      });
    });
  });

  describe('#distinct', function() {
    it('should work', function() {
      return r.expr([1,2,3,1,2,1,3,2,2,1,4]).distinct().orderBy(r.row)
        .then(function(result) { expect(result).to.eql([1,2,3,4]); });
    });

    it('should work with an index', function() {
      return test.table.insert([{}, {}, {}, {}])
        .then(function() {
          return Promise.all([
            test.table.distinct({ index: 'id' }).count(),
            test.table.count()
          ]);
        })
        .spread(function(r1, r2) { expect(r1).to.eql(r2); });
    });

    describe('#r.distinct', function() {
      it('should work', function() {
        return r.distinct([1,2,3,1,2,1,3,2,2,1,4]).orderBy(r.row)
          .then(function(result) { expect(result).to.eql([1,2,3,4]); });
      });
    });
  });

  describe('#contains', function() {
    it('should work ', function() {
      return Promise.all([
        r.expr([1,2,3]).contains(2), r.expr([1,2,3]).contains(1, 2),
        r.expr([1,2,3]).contains(1, 5),
        r.expr([1,2,3]).contains(function(doc) { return doc.eq(1); }),
        r.expr([1,2,3]).contains(r.row.eq(1)),
        r.expr([1,2,3]).contains(r.row.eq(1), r.row.eq(2)),
        r.expr([1,2,3]).contains(r.row.eq(1), r.row.eq(5))
      ])
      .spread(function(r1, r2, r3, r4, r5, r6, r7) {
        expect(r1).to.be.true;
        expect(r2).to.be.true;
        expect(r3).to.be.false;
        expect(r4).to.be.true;
        expect(r5).to.be.true;
        expect(r6).to.be.true;
        expect(r7).to.be.false;
      });
    });

    it('should throw if called without arguments', function() {
      var invalid = function() { return test.table.contains(); };
      expect(invalid).to.throw(/`contains` takes at least 1 argument, 0 provided/);
    });
  });

  describe('#fold', function() {
    it('should work', function() {
      return r.expr([1,2,3]).fold(10, function(left, right) { return left.add(right); }).run()
        .then(function(result) { expect(result).to.equal(16); });
    });

    it('should work -- with emit', function() {
      return r.expr(['foo', 'bar', 'buzz', 'hello', 'world'])
        .fold(0, function(acc, row) { return acc.add(1); }, {
          emit: function(oldAcc, element, newAcc) {
            return [oldAcc, element, newAcc];
          }
        })
        .run()
        .then(function(result) {
          expect(result)
            .to.eql([0, 'foo', 1, 1, 'bar', 2, 2, 'buzz', 3, 3, 'hello', 4, 4, 'world', 5]);
        });
    });

    it('should work -- with emit and finalEmit', function() {
      return r.expr(['foo', 'bar', 'buzz', 'hello', 'world'])
        .fold(0, function(acc, row) { return acc.add(1); }, {
          emit: function(oldAcc, element, newAcc) { return [ oldAcc, element, newAcc ]; },
          finalEmit: function(acc) { return [ acc ]; }
        })
        .run()
        .then(function(result) {
          expect(result)
            .to.eql([0, 'foo', 1, 1, 'bar', 2, 2, 'buzz', 3, 3, 'hello', 4, 4, 'world', 5, 5]);
        });
    });
  });
});
