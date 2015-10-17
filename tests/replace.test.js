"use strict";
var TestFixture = require('./support'),
    expect = require('chai').expect;

var test = new TestFixture();
describe('#replace', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });
  afterEach(function() { return test.cleanTables(); });

  describe('errors', function() {
    it('should throw if no argument is given', function() {
      expect(function() {
        return test.table.replace();
      }).to.throw(/takes at least 1 argument, 0 provided/);
    });

    it('should throw if given a non-valid option', function() {
      expect(function() {
        return test.table.replace({}, { nonValidKey: true });
      }).to.throw(/Unrecognized option/);
    });
  });

});