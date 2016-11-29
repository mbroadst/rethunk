"use strict";
var Promise = require('bluebird'),
    TestFixture = require('./support'),
    r = TestFixture.r,
    expect = require('chai').expect;

function generateTestData(test) {
  var insert_docs = [];
  for (var i=0; i < 10; ++i) {
    insert_docs.push({
      location: r.point(r.random(0, 1, { float: true }), r.random(0, 1, { float: true }))
    });
  }

  return test.table.insert(insert_docs);
}

var test = new TestFixture();
describe('Geospacial Commands', function() {
  after(function() { return test.teardown(); });
  before(function() {
    return test.setup()
      .then(function() { return test.table.indexCreate('location', { geo: true }); })
      .then(function() { return test.table.indexWait('location'); });
  });

  describe('#circle', function() {
    it('should work', function() {
      return Promise.all([
        r.circle([0, 0], 2),
        r.circle(r.point(0, 0), 2),
        r.circle(r.point(0, 0), 2, { numVertices: 40 }),

        r.circle(r.point(0, 0), 2, { numVertices: 40, fill: false }),
        r.circle(r.point(0, 0), 1, { unit: 'km' }).eq(
          r.circle(r.point(0, 0), 1000, { unit: 'm' }))
      ])
      .spread(function(r1, r2, r3, r4, r5) {
        expect(r1.$reql_type$).to.equal('GEOMETRY');
        expect(r1.type).to.equal('Polygon');
        expect(r1.coordinates[0]).to.have.length(33);

        expect(r2.$reql_type$).to.equal('GEOMETRY');
        expect(r2.type).to.equal('Polygon');
        expect(r2.coordinates[0]).to.have.length(33);

        expect(r3.$reql_type$).to.equal('GEOMETRY');
        expect(r3.type).to.equal('Polygon');
        expect(r3.coordinates[0]).to.have.length(41);

        expect(r4.$reql_type$).to.equal('GEOMETRY');
        expect(r4.type).to.equal('LineString');
        expect(r4.coordinates).to.have.length(41);

        expect(r5).to.exist;
      });
    });

    it('should throw with unrecognized arguments', function() {
      var invalid = function() { return r.circle(r.point(0, 0), 1, { foo: 'bar' }); };
      expect(invalid).to.throw(/Unrecognized option `foo` in `circle`/);
    });

    it('should throw if given too few argumetns', function() {
      var invalid = function() { return r.circle(r.point(0, 0)); };
      expect(invalid).to.throw(/`r.circle` takes at least 2 arguments, 1 provided/);
    });

    it('should throw if given too many arguments', function() {
      var invalid = function() { return r.circle(0, 1, 2, 3, 4); };
      expect(invalid).to.throw(/`r.circle` takes at most 3 arguments, 5 provided/);
    });
  });

  describe('#distance', function() {
    it('should work', function() {
      return Promise.all([
        r.point(0, 0).distance(r.point(1,1)),
        r.point(0, 0).distance(r.point(1,1), { unit: 'km' }),
        r.distance(r.point(0, 0), r.point(1,1))
      ])
      .spread(function(r1, r2, r3) {
        expect(Math.floor(r1)).to.equal(156899);
        expect(Math.floor(r2)).to.equal(156);
        expect(Math.floor(r3)).to.equal(156899);
      });
    });

    it('should throw if given too few argumetns', function() {
      var invalid = function() { return r.point(0, 0).distance(); };
      expect(invalid).to.throw(/`distance` takes at least 1 argument, 0 provided/);
    });

    it('should throw if given too many arguments', function() {
      var invalid = function() { return r.point(0, 0).distance(1, 2, 3); };
      expect(invalid).to.throw(/`distance` takes at most 2 arguments, 3 provided/);
    });
  });

  describe('#fill', function() {
    it('should work', function() {
      return r.circle(r.point(0, 0), 2, { numVertices: 40, fill: false }).fill()
        .then(function(result) {
          expect(result.$reql_type$).to.equal('GEOMETRY');
          expect(result.type).to.equal('Polygon');
          expect(result.coordinates[0]).to.have.length(41);
        });
    });

    it('should throw if given too many arguments', function() {
      var invalid = function() {
        return r.circle(r.point(0, 0), 2, { numVertices: 40, fill: false }).fill(1);
      };
      expect(invalid).to.throw(/`fill` takes 0 argument, 1 provided/);
    });
  });

  describe('#geojson', function() {
    it('should work', function() {
      return r.geojson({ coordinates:[ 0, 0 ], type: 'Point' })
        .then(function(result) { expect(result.$reql_type$).to.equal('GEOMETRY'); });
    });

    it('should throw if given too many arguments', function() {
      var invalid = function() { return r.geojson(1,2,3); };
      expect(invalid).to.throw(/`r.geojson` takes 1 argument, 3 provided/);
    });
  });

  describe('#toGeojson', function() {
    it('should work', function() {
      return r.geojson({ coordinates: [ 0, 0 ], type: 'Point' }).toGeojson()
        .then(function(result) { expect(result.$reql_type$).to.be.undefined; });
    });

    it('should throw if given too many arguments', function() {
      var invalid = function() { return r.point(0, 0).toGeojson(1, 2, 3); };
      expect(invalid).to.throw(/`toGeojson` takes 0 argument, 3 provided/);
    });
  });

  describe('#getIntersecting', function() {
    beforeEach(function() { return generateTestData(test); });
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      return test.table
        .getIntersecting(r.polygon([0, 0], [0,1], [1,1], [1,0]), { index: "location" }).count()
        .then(function(count) { expect(count).to.equal(10); });
    });

    it('should throw if given too few arguments', function() {
      var invalid = function() {
        return test.table.getIntersecting(r.polygon([0, 0], [0,1], [1,1], [1,0]));
      };
      expect(invalid).to.throw(/`getIntersecting` takes 2 arguments, 1 provided/);
    });
  });

  describe('#getNearest', function() {
    beforeEach(function() { return generateTestData(test); });
    afterEach(function() { return test.cleanTables(); });
    it('should work', function() {
      // All points are in [0,1]x[0,1]
      return test.table.getNearest(r.point(0, 0), { index: "location", maxResults: 5 })
        .then(function(result) { expect(result.length).to.be.at.most(5); });
    });

    it('should throw if given too few arguments', function() {
      var invalid = function() { return test.table.getNearest(r.point(0, 0)); };
      expect(invalid).to.throw(/`getNearest` takes 2 arguments, 1 provided/);
    });
  });

  describe('#includes', function() {
    it('should work', function() {
      var point1 = r.point(-117.220406, 32.719464);
      var point2 = r.point(-117.206201, 32.725186);
      return r.circle(point1, 2000).includes(point2)
        .then(function(result) { expect(result).to.be.true; });
    });

    it('should throw if given too few arguments', function() {
      var invalid = function() { return r.circle([0,0], 2000).includes(); };
      expect(invalid).to.throw(/`includes` takes 1 argument, 0 provided/);
    });
  });

  describe('#intersects', function() {
    it('should work', function() {
      var point1 = r.point(-117.220406, 32.719464);
      var point2 = r.point(-117.206201, 32.725186);
      return r.circle(point1, 2000).intersects(r.circle(point2, 2000))
        .then(function(result) { expect(result).to.be.true; });
    });

    it('should throw if given too many arguments', function() {
      // All points are in [0,1]x[0,1]
      var point1 = r.point(-117.220406, 32.719464);
      var point2 = r.point(-117.206201, 32.725186);
      var invalid = function() {
        return r.circle(point1, 2000).intersects(r.circle(point2, 2000), 2, 3);
      };

      expect(invalid).to.throw(/`intersects` takes 1 argument, 3 provided/);
    });
  });

  describe('#line', function() {
    it('should work', function() {
      return Promise.all([
        r.line([0, 0], [1, 2]), r.line(r.point(0, 0), r.point(1, 2))
      ])
      .spread(function(r1, r2) {
        expect(r1.$reql_type$).to.equal('GEOMETRY');
        expect(r1.type).to.equal('LineString');
        expect(r1.coordinates[0]).to.have.length(2);

        expect(r2.$reql_type$).to.equal('GEOMETRY');
        expect(r2.type).to.equal('LineString');
        expect(r2.coordinates[0]).to.have.length(2);
      });
    });

    it('should throw if given too few arguments', function() {
      var invalid = function() { return r.line(); };
      expect(invalid).to.throw(/`r.line` takes at least 2 arguments, 0 provided/);
    });
  });

  describe('#point', function() {
    it('should work', function() {
      return r.point(0, 0)
        .then(function(result) {
          expect(result.$reql_type$).to.equal('GEOMETRY');
          expect(result.type).to.equal('Point');
          expect(result.coordinates).to.have.length(2);
        });
    });

    it('should throw if given too few arguments', function() {
      var invalid = function() { return r.point(); };
      expect(invalid).to.throw(/`r.point` takes 2 arguments, 0 provided/);
    });
  });

  describe('#polygon', function() {
    it('should work', function() {
      return r.polygon([0, 0], [0, 1], [1, 1])
        .then(function(result) {
          expect(result.$reql_type$).to.equal('GEOMETRY');
          expect(result.type).to.equal('Polygon');

          // The server will close the line
          expect(result.coordinates[0]).to.have.length(4);
        });
    });

    it('should throw if too few arguments are given', function() {
      var invalid = function() { return r.polygon(); };
      expect(invalid).to.throw(/`r.polygon` takes at least 3 arguments, 0 provided/);
    });
  });

  describe('#polygonSub', function() {
    it('should work', function() {
      return r.polygon([0, 0], [0, 1], [1, 1], [1, 0])
        .polygonSub(r.polygon([0.4, 0.4], [0.4, 0.5], [0.5, 0.5]))
        .then(function(result) {
          expect(result.$reql_type$).to.equal('GEOMETRY');
          expect(result.type).to.equal('Polygon');

          // The server will close the line
          expect(result.coordinates).to.have.length(2);
        });
    });

    it('should throw if given too few arguments', function() {
      var invalid = function() { return r.polygon([0, 0], [0, 1], [1, 1]).polygonSub(); };
      expect(invalid).to.throw(/`polygonSub` takes 1 argument, 0 provided/);
    });
  });
});
