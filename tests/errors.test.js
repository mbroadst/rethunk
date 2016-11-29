"use strict";
var TestFixture = require('./support'),
    r = TestFixture.r,
    errors = require('../lib/error'),
    expect = require('chai').expect;

/*
 *** NOTE ***
 *
 * Most of the backtraces are broken on the server.
 * By broken, I mean they are most of the time not precise, like when a table doesn't exists,
 * it underlines the database and the table. Or when you add a string to a number, it underlines
 * everything and not just the string.
 *
 * We still keep tests for all the terms to be sure that at least, we properly print them.
 *
 ************
 */

var test = new TestFixture();
describe('Errors', function() {
  before(function() { return test.setup(); });
  after(function() { return test.teardown(); });

  [
    { name: 'r.dbDrop(1)', fn: function() { return r.dbDrop(1); },
      message: 'Expected type STRING but found NUMBER in:\nr.dbDrop(1)\n         ^ \n'
    },
    { name: 'r.dbCreate(1)', fn: function() { return r.dbCreate(1); },
      message: 'Expected type STRING but found NUMBER in:\nr.dbCreate(1)\n           ^ \n'
    },
    { name: "r.dbList().do(function(x) { return x.add('a'); })",
      fn: function() { return r.dbList().do(function(x) { return x.add('a'); }); },
      message: 'Expected type ARRAY but found STRING in:\nr.dbList().do(function(var_1) {\n    return var_1.add(\"a\")\n           ^^^^^^^^^^^^^^\n})\n'
    },
    { name: "r.expr(2).do(function(x) { return x.add('a'); })",
      fn: function() { return r.expr(2).do(function(x) { return x.add('a'); }); },
      message: 'Expected type NUMBER but found STRING in:\nr.expr(2).do(function(var_1) {\n    return var_1.add(\"a\")\n           ^^^^^^^^^^^^^^\n})\n'
    },
    { name: "r.db('test').tableCreate(existingTableName)",
      fn: function() { return r.db(test._dbName).tableCreate(test._tableName); },
      message: function() { return 'Table `'+ test._dbName + '.'+ test._tableName + '` already exists in:\nr.db(\"'+ test._dbName + '\").tableCreate(\"'+ test._tableName + '\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.db('test').tableDrop('nonExistingTable')",
      fn: function() { return r.db(test._dbName).tableDrop('nonExistingTable'); },
      message: function() { return 'Table `'+ test._dbName + '.nonExistingTable` does not exist in:\nr.db(\"'+ test._dbName + '\").tableDrop(\"nonExistingTable\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.db('test').tableList().do(function(x) { return x.add('a'); })",
      fn: function() { return r.db(test._dbName).tableList().do(function(x) { return x.add('a'); }); },
      message: function() { return 'Expected type ARRAY but found STRING in:\nr.db(\"'+ test._dbName + '\").tableList().do(function(var_1) {\n    return var_1.add(\"a\")\n           ^^^^^^^^^^^^^^\n})\n'; }
    },
    { name: "r.expr(['zoo', 'zoo']).forEach(function(index) { return r.db('test').table('test_table').indexCreate(index); })",
      fn: function() { return r.expr(['zoo', 'zoo']).forEach(function(index) { return r.db(test._dbName).table(test._tableName).indexCreate(index); }); },
      message: function() { return 'Index `zoo` already exists on table `'+ test._dbName + '.'+ test._tableName + '` in:\nr.expr([\"zoo\", \"zoo\"]).forEach(function(var_1) {\n    return r.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\")\n           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n        .indexCreate(var_1)\n        ^^^^^^^^^^^^^^^^^^^\n})\n'; }
    },
    { name: "r.db('test').table('test_table').indexDrop('nonExistingIndex')",
      fn: function() { return r.db(test._dbName).table(test._tableName).indexDrop('nonExistingIndex'); },
      message: function() { return 'Index `nonExistingIndex` does not exist on table `'+ test._dbName + '.'+ test._tableName + '` in:\nr.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    .indexDrop(\"nonExistingIndex\")\n    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.db('test').table('test_table').indexList().do(function(x) { return x.add('a'); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).indexList().do(function(x) { return x.add('a'); }); },
      message: function() { return 'Expected type ARRAY but found STRING in:\nr.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\")\n    .indexList().do(function(var_1) {\n        return var_1.add(\"a\")\n               ^^^^^^^^^^^^^^\n    })\n'; }
    },
    { name: "r.db('test').table('test_table').indexWait().do(function(x) { return x.add('a'); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).indexWait().do(function(x) { return x.add('a'); }); },
      message: function() { return 'Expected type ARRAY but found STRING in:\nr.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\")\n    .indexWait().do(function(var_1) {\n        return var_1.add(\"a\")\n               ^^^^^^^^^^^^^^\n    })\n'; }
    },
    { name: "r.db('test').table('test_table').indexStatus().and(r.expr(1).add('a'))",
      fn: function() { return r.db(test._dbName).table(test._tableName).indexStatus().and(r.expr(1).add('a')); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\")\n    .indexStatus().and(r.expr(1).add(\"a\"))\n                       ^^^^^^^^^^^^^^^^^^ \n'; }
    },
    { name: "r.db('test').table('test_table').indexStatus('foo', 'bar').do(function(x) { return x.add('a'); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).indexStatus('foo', 'bar').do(function(x) { return x.add('a'); }); },
      message: function() { return 'Index `bar` was not found on table `'+ test._dbName + '.'+ test._tableName + '` in:\nr.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    .indexStatus(\"foo\", \"bar\").do(function(var_1) {\n    ^^^^^^^^^^^^^^^^^^^^^^^^^^                     \n        return var_1.add(\"a\")\n    })\n'; }
    },
    { name: "r.db('test').table('nonExistingTable').update({foo: 'bar'})",
      fn: function() { return r.db(test._dbName).table('nonExistingTable').update({foo: 'bar'}); },
      message: function() { return 'Table `'+ test._dbName + '.nonExistingTable` does not exist in:\nr.db(\"'+ test._dbName + '\").table(\"nonExistingTable\").update({\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^         \n    foo: \"bar\"\n})\n'; }
    },
    { name: "r.db('test').table('nonExistingTable').update(function(doc) { return doc('foo'); })",
      fn: function() { return r.db(test._dbName).table('nonExistingTable').update(function(doc) { return doc('foo'); }); },
      message: function() { return 'Table `'+ test._dbName + '.nonExistingTable` does not exist in:\nr.db(\"'+ test._dbName + '\").table(\"nonExistingTable\").update(function(var_1) {\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^                         \n    return var_1(\"foo\")\n})\n'; }
    },
    { name: "r.db('test').table('nonExistingTable').replace({foo: 'bar'})",
      fn: function() { return r.db(test._dbName).table('nonExistingTable').replace({foo: 'bar'}); },
      message: function() { return 'Table `'+ test._dbName + '.nonExistingTable` does not exist in:\nr.db(\"'+ test._dbName + '\").table(\"nonExistingTable\").replace({\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^          \n    foo: \"bar\"\n})\n'; }
    },
    { name: "r.db('test').table('nonExistingTable').replace(function(doc) { return doc('foo'); })",
      fn: function() { return r.db(test._dbName).table('nonExistingTable').replace(function(doc) { return doc('foo'); }); },
      message: function() { return 'Table `'+ test._dbName + '.nonExistingTable` does not exist in:\nr.db(\"'+ test._dbName + '\").table(\"nonExistingTable\").replace(function(var_1) {\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^                          \n    return var_1(\"foo\")\n})\n'; }
    },
    { name: "r.db('test').table('nonExistingTable').delete()",
      fn: function() { return r.db(test._dbName).table('nonExistingTable').delete(); },
      message: function() { return 'Table `'+ test._dbName + '.nonExistingTable` does not exist in:\nr.db(\"'+ test._dbName + '\").table(\"nonExistingTable\").delete()\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^         \n'; }
    },
    { name: "r.db('test').table('nonExistingTable').sync()",
      fn: function() { return r.db(test._dbName).table('nonExistingTable').sync(); },
      message: function() { return 'Table `'+ test._dbName + '.nonExistingTable` does not exist in:\nr.db(\"'+ test._dbName + '\").table(\"nonExistingTable\").sync()\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^       \n'; }
    },
    { name: "r.db('nonExistingDb').table('nonExistingTable')",
      fn: function() { return r.db('nonExistingDb').table('nonExistingTable'); },
      message: function() { return 'Database `nonExistingDb` does not exist in:\nr.db(\"nonExistingDb\").table(\"nonExistingTable\")\n^^^^^^^^^^^^^^^^^^^^^                          \n'; }
    },
    { name: "r.db('test').table('nonExistingTable')",
      fn: function() { return r.db(test._dbName).table('nonExistingTable'); },
      message: function() { return 'Table `'+ test._dbName + '.nonExistingTable` does not exist in:\nr.db(\"'+ test._dbName + '\").table(\"nonExistingTable\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.db('test').table('test_table').get(1).do(function(x) { return x.add(3); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).get(1).do(function(x) { return x.add(3); }); },
      message: function() { return 'Expected type NUMBER but found NULL in:\nr.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\")\n    .get(1).do(function(var_1) {\n        return var_1.add(3)\n               ^^^^^^^^^^^^\n    })\n'; }
    },
    { name: "r.db('test').table('test_table').getAll(1, 2, 3).do(function(x) { return x.add(3); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).getAll(1, 2, 3).do(function(x) { return x.add(3); }); },
      message: function() { return 'Expected type DATUM but found SELECTION:\nSELECTION ON table('+ test._tableName + ') in:\nr.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    .getAll(1, 2, 3).do(function(var_1) {\n    ^^^^^^^^^^^^^^^^                     \n        return var_1.add(3)\n    })\n'; }
    },
    { name: "r.db('test').table('test_table').getAll(1, 2, 3, { index: 'foo' }).do(function(x) { return x.add(3); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).getAll(1, 2, 3, { index: 'foo' }).do(function(x) { return x.add(3); }); },
      message: function() { return 'Expected type DATUM but found SELECTION:\nSELECTION ON table('+ test._tableName + ') in:\nr.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    .getAll(1, 2, 3, {\n    ^^^^^^^^^^^^^^^^^^\n        index: \"foo\"\n        ^^^^^^^^^^^^\n    }).do(function(var_1) {\n    ^^                     \n        return var_1.add(3)\n    })\n'; }
    },
    { name: "r.db(test._dbName).table(test._tableName).between(2, 3, { index: 'foo' }).do(function(x) { return x.add(3); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).between(2, 3, { index: 'foo' }).do(function(x) { return x.add(3); }); },
      message: function() { return 'Expected type DATUM but found TABLE_SLICE:\nSELECTION ON table('+ test._tableName + ') in:\nr.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    .between(2, 3, {\n    ^^^^^^^^^^^^^^^^\n        index: \"foo\"\n        ^^^^^^^^^^^^\n    }).do(function(var_1) {\n    ^^                     \n        return var_1.add(3)\n    })\n'; }
    },
    { name: "r.db(test._dbName).table(test._tableName).filter({foo: 'bar'}).do(function(x) { return x.add(3); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).filter({foo: 'bar'}).do(function(x) { return x.add(3); }); },
      message: function() { return 'Expected type DATUM but found SELECTION:\nSELECTION ON table('+ test._tableName + ') in:\nr.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    .filter({\n    ^^^^^^^^^\n        foo: \"bar\"\n        ^^^^^^^^^^\n    }).do(function(var_1) {\n    ^^                     \n        return var_1.add(3)\n    })\n'; }
    },
    { name: "r.expr([1, 2, 3]).innerJoin(function(left, right) { return left.eq(right('bar').add(1)); }, r.db(test._dbName).table(test._tableName))",
      fn: function() { return r.expr([1, 2, 3]).innerJoin(function(left, right) { return left.eq(right('bar').add(1)); }, r.db(test._dbName).table(test._tableName)); },
      message: function() { return 'Expected type SEQUENCE but found FUNCTION:\nVALUE FUNCTION in:\nr.expr([1, 2, 3]).innerJoin(function(var_1, var_2) {\n                            ^^^^^^^^^^^^^^^^^^^^^^^^\n    return var_1.eq(var_2(\"bar\").add(1))\n    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n}, r.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\"))\n^                                                                                     \n'; }
    },
    { name: "r.expr([1, 2, 3]).innerJoin(r.expr([1, 2, 3]), function(left, right) { return r.expr(1).add('str').add(left.eq(right('bar').add(1))); })",
      fn: function() { return r.expr([1, 2, 3]).innerJoin(r.expr([1, 2, 3]), function(left, right) { return r.expr(1).add('str').add(left.eq(right('bar').add(1))); }); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.expr([1, 2, 3]).innerJoin([1, 2, 3], function(var_1, var_2) {\n    return r.expr(1).add(\"str\").add(var_1.eq(var_2(\"bar\").add(1)))\n           ^^^^^^^^^^^^^^^^^^^^                                   \n})\n'; }
    },
    { name: "r.expr([1, 2, 3]).outerJoin(function(left, right) { return left.eq(right('bar').add(1)); }, r.db(test._dbName).table(test._tableName))",
      fn: function() { return r.expr([1, 2, 3]).outerJoin(function(left, right) { return left.eq(right('bar').add(1)); }, r.db(test._dbName).table(test._tableName)); },
      message: function() { return 'Expected type SEQUENCE but found FUNCTION:\nVALUE FUNCTION in:\nr.expr([1, 2, 3]).outerJoin(function(var_1, var_2) {\n                            ^^^^^^^^^^^^^^^^^^^^^^^^\n    return var_1.eq(var_2(\"bar\").add(1))\n    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n}, r.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\"))\n^                                                                                     \n'; }
    },
    { name: "r.expr([1, 2, 3]).eqJoin('id', r.db(test._dbName).table(test._tableName)).add(1)",
      fn: function() { return r.expr([1, 2, 3]).eqJoin('id', r.db(test._dbName).table(test._tableName)).add(1); },
      message: function() { return 'Cannot perform get_field on a non-object non-sequence `1` in:\nr.expr([1, 2, 3]).eqJoin(\"id\", r.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\"))\n                         ^^^^                                                                                     \n    .add(1)\n'; }
    },
    { name: "r.expr([1, 2, 3]).eqJoin('id', r.db(test._dbName).table(test._tableName)).zip().add(1)",
      fn: function() { return r.expr([1, 2, 3]).eqJoin('id', r.db(test._dbName).table(test._tableName)).zip().add(1); },
      message: function() { return 'Cannot perform get_field on a non-object non-sequence `1` in:\nr.expr([1, 2, 3]).eqJoin(\"id\", r.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\"))\n                         ^^^^                                                                                     \n    .zip().add(1)\n'; }
    },
    { name: "r.expr([1, 2, 3]).map(function(v) { return v; }).add(1)",
      fn: function() { return r.expr([1, 2, 3]).map(function(v) { return v; }).add(1); },
      message: function() { return 'Expected type ARRAY but found NUMBER in:\nr.expr([1, 2, 3]).map(function(var_1) {\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    return var_1\n    ^^^^^^^^^^^^\n}).add(1)\n^^^^^^^^^\n'; }
    },
    { name: "r.expr([1, 2, 3]).withFields('foo', 'bar').add(1)",
      fn: function() { return r.expr([1, 2, 3]).withFields('foo', 'bar').add(1); },
      message: function() { return 'Cannot perform has_fields on a non-object non-sequence `1` in:\nr.expr([1, 2, 3]).withFields(\"foo\", \"bar\").add(1)\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^       \n'; }
    },
    { name: "r.expr([1, 2, 3]).concatMap(function(v) { return v; }).add(1)",
      fn: function() { return r.expr([1, 2, 3]).concatMap(function(v) { return v; }).add(1); },
      message: function() { return "Cannot convert NUMBER to SEQUENCE in:\nr.expr([1, 2, 3]).concatMap(function(var_1) {\n                            ^^^^^^^^^^^^^^^^^\n    return var_1\n    ^^^^^^^^^^^^\n}).add(1)\n^        \n"; }
    },
    { name: "r.expr([1, 2, 3]).orderBy('foo').add(1)",
      fn: function() { return r.expr([1, 2, 3]).orderBy('foo').add(1); },
      message: function() { return /Cannot perform get_field on a non-object non-sequence \`\d\`/; }
    },
    { name: "r.expr([1, 2, 3]).skip('foo').add(1)",
      fn: function() { return r.expr([1, 2, 3]).skip('foo').add(1); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.expr([1, 2, 3]).skip(\"foo\").add(1)\n                       ^^^^^        \n'; }
    },
    { name: "r.expr([1, 2, 3]).limit('foo').add(1)",
      fn: function() { return r.expr([1, 2, 3]).limit('foo').add(1); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.expr([1, 2, 3]).limit(\"foo\").add(1)\n                        ^^^^^        \n'; }
    },
    { name: "r.expr([1, 2, 3]).slice('foo', 'bar').add(1)",
      fn: function() { return r.expr([1, 2, 3]).slice('foo', 'bar').add(1); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.expr([1, 2, 3]).slice(\"foo\", \"bar\").add(1)\n                        ^^^^^               \n'; }
    },
    { name: "r.expr([1, 2, 3]).nth('bar').add(1)",
      fn: function() { return r.expr([1, 2, 3]).nth('bar').add(1); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.expr([1, 2, 3]).nth(\"bar\").add(1)\n                      ^^^^^        \n'; }
    },
    { name: "r.expr([1, 2, 3]).offsetsOf('bar').add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).offsetsOf('bar').add('Hello'); },
      message: function() { return 'Expected type ARRAY but found STRING in:\nr.expr([1, 2, 3]).offsetsOf(\"bar\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.expr([1, 2, 3]).isEmpty().add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).isEmpty().add('Hello'); },
      message: function() { return 'Expected type NUMBER but found BOOL in:\nr.expr([1, 2, 3]).isEmpty().add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.expr([1, 2, 3]).union([5, 6]).add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).union([5, 6]).add('Hello'); },
      message: function() { return 'Expected type ARRAY but found STRING in:\nr.expr([1, 2, 3]).union([5, 6]).add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.expr([1, 2, 3]).sample('Hello')",
      fn: function() { return r.expr([1, 2, 3]).sample('Hello'); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.expr([1, 2, 3]).sample(\"Hello\")\n                         ^^^^^^^ \n'; }
    },
    { name: "r.expr([1, 2, 3]).count(function() { return true; }).add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).count(function() { return true; }).add('Hello'); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.expr([1, 2, 3]).count(function() {\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    return true\n    ^^^^^^^^^^^\n}).add(\"Hello\")\n^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.expr([1, 2, 3]).distinct().add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).distinct().add('Hello'); },
      message: function() { return 'Expected type ARRAY but found STRING in:\nr.expr([1, 2, 3]).distinct().add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.expr([1, 2, 3]).contains('foo', 'bar').add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).contains('foo', 'bar').add('Hello'); },
      message: function() { return 'Expected type NUMBER but found BOOL in:\nr.expr([1, 2, 3]).contains(\"foo\", \"bar\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.expr([1, 2, 3]).update(r.row('foo')).add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).update(r.row('foo')).add('Hello'); },
      message: function() { return 'Expected type SELECTION but found DATUM:\n[\n\t1,\n\t2,\n\t3\n] in:\nr.expr([1, 2, 3]).update(r.row(\"foo\")).add(\"Hello\")\n^^^^^^^^^^^^^^^^^                                  \n'; }
    },
    { name: "r.expr([1, 2, 3]).pluck('foo').add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).pluck('foo').add('Hello'); },
      message: function() { return 'Cannot perform pluck on a non-object non-sequence `1` in:\nr.expr([1, 2, 3]).pluck(\"foo\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             \n'; }
    },
    { name: "r.expr([1, 2, 3]).without('foo').add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).without('foo').add('Hello'); },
      message: function() { return 'Cannot perform without on a non-object non-sequence `1` in:\nr.expr([1, 2, 3]).without(\"foo\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             \n'; }
    },
    { name: "r.expr([1, 2, 3]).merge('foo').add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).merge('foo').add('Hello'); },
      message: function() { return 'Cannot perform merge on a non-object non-sequence `1` in:\nr.expr([1, 2, 3]).merge(\"foo\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             \n'; }
    },
    { name: "r.expr([1, 2, 3]).append('foo').add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).append('foo').add('Hello'); },
      message: function() { return 'Expected type ARRAY but found STRING in:\nr.expr([1, 2, 3]).append(\"foo\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.expr([1, 2, 3]).prepend('foo').add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).prepend('foo').add('Hello'); },
      message: function() { return 'Expected type ARRAY but found STRING in:\nr.expr([1, 2, 3]).prepend(\"foo\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.expr([1, 2, 3]).difference('foo').add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).difference('foo').add('Hello'); },
      message: function() { return 'Cannot convert STRING to SEQUENCE in:\nr.expr([1, 2, 3]).difference(\"foo\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             \n'; }
    },
    { name: "r.expr([1, 2, 3]).setInsert('foo').add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).setInsert('foo').add('Hello'); },
      message: function() { return 'Expected type ARRAY but found STRING in:\nr.expr([1, 2, 3]).setInsert(\"foo\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.expr([1, 2, 3]).setUnion('foo').add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).setUnion('foo').add('Hello'); },
      message: function() { return 'Expected type ARRAY but found STRING in:\nr.expr([1, 2, 3]).setUnion(\"foo\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             \n'; }
    },
    { name: "r.expr([1, 2, 3]).setIntersection('foo').add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).setIntersection('foo').add('Hello'); },
      message: function() { return 'Expected type ARRAY but found STRING in:\nr.expr([1, 2, 3]).setIntersection(\"foo\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             \n'; }
    },
    { name: "r.expr([1, 2, 3])('foo').add('Hello')",
      fn: function() { return r.expr([1, 2, 3])('foo').add('Hello'); },
      message: function() { return 'Cannot perform bracket on a non-object non-sequence `1` in:\nr.expr([1, 2, 3])(\"foo\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^             \n'; }
    },
    { name: "r.expr([1, 2, 3]).hasFields('foo').add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).hasFields('foo').add('Hello'); },
      message: function() { return 'Cannot perform has_fields on a non-object non-sequence `1` in:\nr.expr([1, 2, 3]).hasFields(\"foo\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             \n'; }
    },
    { name: "r.expr([1, 2, 3]).insertAt('foo', 2).add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).insertAt('foo', 2).add('Hello'); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.expr([1, 2, 3]).insertAt(\"foo\", 2).add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             \n'; }
    },
    { name: "r.expr([1, 2, 3]).spliceAt('foo', 2).add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).spliceAt('foo', 2).add('Hello'); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.expr([1, 2, 3]).spliceAt(\"foo\", 2).add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             \n'; }
    },
    { name: "r.expr([1, 2, 3]).deleteAt('foo', 2).add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).deleteAt('foo', 2).add('Hello'); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.expr([1, 2, 3]).deleteAt(\"foo\", 2).add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             \n'; }
    },
    { name: "r.expr([1, 2, 3]).changeAt('foo', 2).add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).changeAt('foo', 2).add('Hello'); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.expr([1, 2, 3]).changeAt(\"foo\", 2).add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             \n'; }
    },
    { name: "r.expr([1, 2, 3]).keys().add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).keys().add('Hello'); },
      message: function() { return 'Cannot call `keys` on objects of type `ARRAY` in:\nr.expr([1, 2, 3]).keys().add(\"Hello\")\n^^^^^^^^^^^^^^^^^                    \n'; }
    },
    { name: "r.expr([1, 2, 3]).match('foo').add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).match('foo').add('Hello'); },
      message: function() { return 'Expected type STRING but found ARRAY in:\nr.expr([1, 2, 3]).match(\"foo\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^                          \n'; }
    },
    { name: "r.expr([1, 2, 3]).add('Hello')",
      fn: function() { return r.expr([1, 2, 3]).add('Hello'); },
      message: function() { return 'Expected type ARRAY but found STRING in:\nr.expr([1, 2, 3]).add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.expr([1, 2, 3]).sub('Hello')",
      fn: function() { return r.expr([1, 2, 3]).sub('Hello'); },
      message: function() { return 'Expected type NUMBER but found ARRAY in:\nr.expr([1, 2, 3]).sub(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.expr([1, 2, 3]).mul('Hello')",
      fn: function() { return r.expr([1, 2, 3]).mul('Hello'); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.expr([1, 2, 3]).mul(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.expr([1, 2, 3]).div('Hello')",
      fn: function() { return r.expr([1, 2, 3]).div('Hello'); },
      message: function() { return 'Expected type NUMBER but found ARRAY in:\nr.expr([1, 2, 3]).div(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.expr([1, 2, 3]).mod('Hello')",
      fn: function() { return r.expr([1, 2, 3]).mod('Hello'); },
      message: function() { return 'Expected type NUMBER but found ARRAY in:\nr.expr([1, 2, 3]).mod(\"Hello\")\n^^^^^^^^^^^^^^^^^             \n'; }
    },
    { name: "r.expr([1, 2, 3]).and(r.expr('Hello').add(2))",
      fn: function() { return r.expr([1, 2, 3]).and(r.expr('Hello').add(2)); },
      message: function() { return 'Expected type STRING but found NUMBER in:\nr.expr([1, 2, 3]).and(r.expr(\"Hello\").add(2))\n                      ^^^^^^^^^^^^^^^^^^^^^^ \n'; }
    },
    { name: "r.expr(false).or(r.expr('Hello').add(2))",
      fn: function() { return r.expr(false).or(r.expr('Hello').add(2)); },
      message: function() { return 'Expected type STRING but found NUMBER in:\nr.expr(false).or(r.expr(\"Hello\").add(2))\n                 ^^^^^^^^^^^^^^^^^^^^^^ \n'; }
    },
    { name: "r.expr([1, 2, 3]).eq(r.expr('Hello').add(2))",
      fn: function() { return r.expr([1, 2, 3]).eq(r.expr('Hello').add(2)); },
      message: function() { return 'Expected type STRING but found NUMBER in:\nr.expr([1, 2, 3]).eq(r.expr(\"Hello\").add(2))\n                     ^^^^^^^^^^^^^^^^^^^^^^ \n'; }
    },
    { name: "r.expr([1, 2, 3]).ne(r.expr('Hello').add(2))",
      fn: function() { return r.expr([1, 2, 3]).ne(r.expr('Hello').add(2)); },
      message: function() { return 'Expected type STRING but found NUMBER in:\nr.expr([1, 2, 3]).ne(r.expr(\"Hello\").add(2))\n                     ^^^^^^^^^^^^^^^^^^^^^^ \n'; }
    },
    { name: "r.expr([1, 2, 3]).gt(r.expr('Hello').add(2))",
      fn: function() { return r.expr([1, 2, 3]).gt(r.expr('Hello').add(2)); },
      message: function() { return 'Expected type STRING but found NUMBER in:\nr.expr([1, 2, 3]).gt(r.expr(\"Hello\").add(2))\n                     ^^^^^^^^^^^^^^^^^^^^^^ \n'; }
    },
    { name: "r.expr([1, 2, 3]).lt(r.expr('Hello').add(2))",
      fn: function() { return r.expr([1, 2, 3]).lt(r.expr('Hello').add(2)); },
      message: function() { return 'Expected type STRING but found NUMBER in:\nr.expr([1, 2, 3]).lt(r.expr(\"Hello\").add(2))\n                     ^^^^^^^^^^^^^^^^^^^^^^ \n'; }
    },
    { name: "r.expr([1, 2, 3]).le(r.expr('Hello').add(2))",
      fn: function() { return r.expr([1, 2, 3]).le(r.expr('Hello').add(2)); },
      message: function() { return 'Expected type STRING but found NUMBER in:\nr.expr([1, 2, 3]).le(r.expr(\"Hello\").add(2))\n                     ^^^^^^^^^^^^^^^^^^^^^^ \n'; }
    },
    { name: "r.expr([1, 2, 3]).ge(r.expr('Hello').add(2))",
      fn: function() { return r.expr([1, 2, 3]).ge(r.expr('Hello').add(2)); },
      message: function() { return 'Expected type STRING but found NUMBER in:\nr.expr([1, 2, 3]).ge(r.expr(\"Hello\").add(2))\n                     ^^^^^^^^^^^^^^^^^^^^^^ \n'; }
    },
    { name: "r.expr([1, 2, 3]).not().add(r.expr('Hello').add(2))",
      fn: function() { return r.expr([1, 2, 3]).not().add(r.expr('Hello').add(2)); },
      message: function() { return 'Expected type STRING but found NUMBER in:\nr.expr([1, 2, 3]).not().add(r.expr(\"Hello\").add(2))\n                            ^^^^^^^^^^^^^^^^^^^^^^ \n'; }
    },
    { name: "r.now().add('Hello')",
      fn: function() { return r.now().add('Hello'); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.now().add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.time(1023, 11, 3, 'Z').add('Hello')",
      fn: function() { return r.time(1023, 11, 3, 'Z').add('Hello'); },
      message: function() { return 'Error in time logic: Year is out of valid range: 1400..10000 in:\nr.time(1023, 11, 3, \"Z\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^             \n'; }
    },
    { name: "r.epochTime(12132131).add('Hello')",
      fn: function() { return r.epochTime(12132131).add('Hello'); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.epochTime(12132131).add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.ISO8601('UnvalidISO961String').add('Hello')",
      fn: function() { return r.ISO8601('UnvalidISO961String').add('Hello'); },
      message: function() { return 'Invalid date string `UnvalidISO961String` (got `U` but expected a digit) in:\nr.ISO8601(\"UnvalidISO961String\").add(\"Hello\")\n          ^^^^^^^^^^^^^^^^^^^^^              \n'; }
    },
    { name: "r.now().inTimezone('noTimezone').add('Hello')",
      fn: function() { return r.now().inTimezone('noTimezone').add('Hello'); },
      message: function() { return 'Timezone `noTimezone` does not start with `-` or `+` in:\nr.now().inTimezone(\"noTimezone\").add(\"Hello\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^             \n'; }
    },
    { name: "r.now().timezone().add(true)",
      fn: function() { return r.now().timezone().add(true); },
      message: function() { return 'Expected type STRING but found BOOL in:\nr.now().timezone().add(true)\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.now().during(r.now(), r.now()).add(true)",
      fn: function() { return r.now().during(r.now(), r.now()).add(true); },
      message: function() { return 'Expected type NUMBER but found BOOL in:\nr.now().during(r.now(), r.now()).add(true)\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.now().timeOfDay().add(true)",
      fn: function() { return r.now().timeOfDay().add(true); },
      message: function() { return 'Expected type NUMBER but found BOOL in:\nr.now().timeOfDay().add(true)\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.now().year().add(true)",
      fn: function() { return r.now().year().add(true); },
      message: function() { return 'Expected type NUMBER but found BOOL in:\nr.now().year().add(true)\n^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.now().month().add(true)",
      fn: function() { return r.now().month().add(true); },
      message: function() { return 'Expected type NUMBER but found BOOL in:\nr.now().month().add(true)\n^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.now().day().add(true)",
      fn: function() { return r.now().day().add(true); },
      message: function() { return 'Expected type NUMBER but found BOOL in:\nr.now().day().add(true)\n^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.now().dayOfWeek().add(true)",
      fn: function() { return r.now().dayOfWeek().add(true); },
      message: function() { return 'Expected type NUMBER but found BOOL in:\nr.now().dayOfWeek().add(true)\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.now().dayOfYear().add(true)",
      fn: function() { return r.now().dayOfYear().add(true); },
      message: function() { return 'Expected type NUMBER but found BOOL in:\nr.now().dayOfYear().add(true)\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.now().hours().add(true)",
      fn: function() { return r.now().hours().add(true); },
      message: function() { return 'Expected type NUMBER but found BOOL in:\nr.now().hours().add(true)\n^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.now().minutes().add(true)",
      fn: function() { return r.now().minutes().add(true); },
      message: function() { return 'Expected type NUMBER but found BOOL in:\nr.now().minutes().add(true)\n^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.now().seconds().add(true)",
      fn: function() { return r.now().seconds().add(true); },
      message: function() { return 'Expected type NUMBER but found BOOL in:\nr.now().seconds().add(true)\n^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.now().toISO8601().add(true)",
      fn: function() { return r.now().toISO8601().add(true); },
      message: function() { return 'Expected type STRING but found BOOL in:\nr.now().toISO8601().add(true)\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.now().toEpochTime().add(true)",
      fn: function() { return r.now().toEpochTime().add(true); },
      message: function() { return 'Expected type NUMBER but found BOOL in:\nr.now().toEpochTime().add(true)\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.expr(1).do(function(var_1) { return var_1('bah').add(3); })",
      fn: function() { return r.expr(1).do(function(var_1) { return var_1('bah').add(3); }); },
      message: function() { return 'Cannot perform bracket on a non-object non-sequence `1` in:\nr.expr(1).do(function(var_1) {\n    return var_1(\"bah\").add(3)\n           ^^^^^              \n})\n'; }
    },
    { name: "r.branch(r.expr(1).add('hello'), 'Hello', 'World')",
      fn: function() { return r.branch(r.expr(1).add('hello'), 'Hello', 'World'); },
      message: function() { return 'Expected type NUMBER but found STRING in:\nr.branch(r.expr(1).add(\"hello\"), \"Hello\", \"World\")\n         ^^^^^^^^^^^^^^^^^^^^^^                   \n'; }
    },
    { name: "r.expr(1).forEach(function(foo) { return foo('bar'); })",
      fn: function() { return r.expr(1).forEach(function(foo) { return foo('bar'); }); },
      message: function() { return 'Cannot convert NUMBER to SEQUENCE in:\nr.expr(1).forEach(function(var_1) {\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    return var_1(\"bar\")\n    ^^^^^^^^^^^^^^^^^^^\n})\n^^\n'; }
    },
    { name: "r.error('foo')",
      fn: function() { return r.error('foo'); },
      message: function() { return 'foo in:\nr.error(\"foo\")\n^^^^^^^^^^^^^^\n'; }
    },
    { name: "r.expr({a: 1})('b').default('bar').add(2)",
      fn: function() { return r.expr({a: 1})('b').default('bar').add(2); },
      message: function() { return "Expected type STRING but found NUMBER in:\nr.expr({\n^^^^^^^^\n    a: 1\n    ^^^^\n})(\"b\").default(\"bar\").add(2)\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n"; }
    },
    { name: "r.expr({a:1}).add(2)",
      fn: function() { return r.expr({a:1}).add(2); },
      message: function() { return "Expected type NUMBER but found OBJECT in:\nr.expr({\n^^^^^^^^\n    a: 1\n    ^^^^\n}).add(2)\n^^^^^^^^^\n"; }
    },
    { name: "r.expr({a:1}).add(r.js('2'))",
      fn: function() { return r.expr({a:1}).add(r.js('2')); },
      message: function() { return "Expected type NUMBER but found OBJECT in:\nr.expr({\n^^^^^^^^\n    a: 1\n    ^^^^\n}).add(r.js(\"2\"))\n^^^^^^^^^^^^^^^^^\n"; }
    },
    { name: "r.expr(2).coerceTo('ARRAY')",
      fn: function() { return r.expr(2).coerceTo('ARRAY'); },
      message: function() { return "Cannot coerce NUMBER to ARRAY in:\nr.expr(2).coerceTo(\"ARRAY\")\n^^^^^^^^^                  \n"; }
    },
    { name: "r.expr(2).add('foo').typeOf()",
      fn: function() { return r.expr(2).add('foo').typeOf(); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.expr(2).add(\"foo\").typeOf()\n^^^^^^^^^^^^^^^^^^^^         \n"; }
    },
    { name: "r.expr(2).add('foo').info()",
      fn: function() { return r.expr(2).add('foo').info(); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.expr(2).add(\"foo\").info()\n^^^^^^^^^^^^^^^^^^^^       \n"; }
    },
    { name: "r.expr(2).add(r.json('foo'))",
      fn: function() { return r.expr(2).add(r.json('foo')); },
      message: function() { return "Failed to parse \"foo\" as JSON: Invalid value in:\nr.expr(2).add(r.json(\"foo\"))\n              ^^^^^^^^^^^^^ \n"; }
    },
    { name: "r.db(test._dbName).table(test._tableName).replace({a:1}, {nonValid:true})", throws: true,
      fn: function() { return r.db(test._dbName).table(test._tableName).replace({a:1}, {nonValid:true}); },
      message: function() { return "Unrecognized option `nonValid` in `replace` after:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\nAvailable options are returnChanges <bool>, durability <string>, nonAtomic <bool>"; }
    },
    { name: "r.db(test._dbName).table(test._tableName.replace({a:1}, {durability: 'softt'})",
      fn: function() { return r.db(test._dbName).table(test._tableName).replace({a:1}, {durability: 'softt'}); },
      message: function() { return "Durability option `softt` unrecognized (options are \"hard\" and \"soft\") in:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n    .replace({\n        a: 1\n    }, {\n       ^\n        durability: \"softt\"\n        ^^^^^^^^^^^^^^^^^^^\n    })\n    ^ \n"; }
    },
    { name: "r.expr([1,2]).map(r.row.add('eh'))",
      fn: function() { return r.expr([1,2]).map(r.row.add('eh')); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.expr([1, 2]).map(r.row.add(\"eh\"))\n                   ^^^^^^^^^^^^^^^ \n"; }
    },
    { name: "r.expr({a:1, b:r.expr(1).add('eh')})",
      fn: function() { return r.expr({a:1, b:r.expr(1).add('eh')}); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.expr({\n    a: 1,\n    b: r.expr(1).add(\"eh\")\n       ^^^^^^^^^^^^^^^^^^^\n})\n"; }
    },
    { name: "r.db(test._dbName).table(test._tableName.replace({a:1}, {durability:'soft'}).add(2)",
      fn: function() { return r.db(test._dbName).table(test._tableName).replace({a:1}, {durability:'soft'}).add(2); },
      message: function() { return "Expected type NUMBER but found OBJECT in:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    .replace({\n    ^^^^^^^^^^\n        a: 1\n        ^^^^\n    }, {\n    ^^^^\n        durability: \"soft\"\n        ^^^^^^^^^^^^^^^^^^\n    }).add(2)\n    ^^^^^^^^^\n"; }
    },
    { name: "r.db(test._dbName).table(test._tableName).replace({a:1}, {durability:r.expr(1).add('heloo')})",
      fn: function() { return r.db(test._dbName).table(test._tableName).replace({a:1}, {durability:r.expr(1).add('heloo')}); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n    .replace({\n        a: 1\n    }, {\n       ^\n        durability: r.expr(1).add(\"heloo\")\n        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    })\n    ^ \n"; }
    },
    { name: "r.expr({a:r.expr(1).add('eh'), b: 2})",
      fn: function() { return r.expr({a:r.expr(1).add('eh'), b: 2}); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.expr({\n    a: r.expr(1).add(\"eh\"),\n       ^^^^^^^^^^^^^^^^^^^ \n    b: 2\n})\n"; }
    },
    { name: "r.expr([1,2,3]).add('eh')",
      fn: function() { return r.expr([1,2,3]).add('eh'); },
      message: function() { return "Expected type ARRAY but found STRING in:\nr.expr([1, 2, 3]).add(\"eh\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^\n"; }
    },
    { name: "r.expr({a:1}).add('eh')",
      fn: function() { return r.expr({a:1}).add('eh'); },
      message: function() { return "Expected type NUMBER but found OBJECT in:\nr.expr({\n^^^^^^^^\n    a: 1\n    ^^^^\n}).add(\"eh\")\n^^^^^^^^^^^^\n"; }
    },
    { name: "r.expr([1,2,3]).group('foo')",
      fn: function() { return r.expr([1,2,3]).group('foo'); },
      message: function() { return "Cannot perform get_field on a non-object non-sequence `1` in:\nr.expr([1, 2, 3]).group(\"foo\")\n                        ^^^^^ \n"; }
    },
    { name: "r.expr([1,2,3]).ungroup()",
      fn: function() { return r.expr([1,2,3]).ungroup(); },
      message: function() { return "Expected type GROUPED_DATA but found DATUM:\n[\n\t1,\n\t2,\n\t3\n] in:\nr.expr([1, 2, 3]).ungroup()\n^^^^^^^^^^^^^^^^^          \n"; }
    },
    { name: "r.expr([1,2,3,'hello']).sum()",
      fn: function() { return r.expr([1,2,3,'hello']).sum(); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.expr([1, 2, 3, \"hello\"]).sum()\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n"; }
    },
    { name: "r.expr([1,2,3,'hello']).avg()",
      fn: function() { return r.expr([1,2,3,'hello']).avg(); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.expr([1, 2, 3, \"hello\"]).avg()\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n"; }
    },
    { name: "r.expr([]).min()",
      fn: function() { return r.expr([]).min(); },
      message: function() { return "Cannot take the min of an empty stream.  (If you passed `min` a field name, it may be that no elements of the stream had that field.) in:\nr.expr([]).min()\n^^^^^^^^^^^^^^^^\n"; }
    },
    { name: "r.expr([]).max()",
      fn: function() { return r.expr([]).max(); },
      message: function() { return "Cannot take the max of an empty stream.  (If you passed `max` a field name, it may be that no elements of the stream had that field.) in:\nr.expr([]).max()\n^^^^^^^^^^^^^^^^\n"; }
    },
    { name: "r.expr([]).avg()",
      fn: function() { return r.expr([]).avg(); },
      message: function() { return "Cannot take the average of an empty stream.  (If you passed `avg` a field name, it may be that no elements of the stream had that field.) in:\nr.expr([]).avg()\n^^^^^^^^^^^^^^^^\n"; }
    },
    { name: "r.expr(1).upcase()",
      fn: function() { return r.expr(1).upcase(); },
      message: function() { return "Expected type STRING but found NUMBER in:\nr.expr(1).upcase()\n^^^^^^^^^         \n"; }
    },
    { name: "r.expr(1).downcase()",
      fn: function() { return r.expr(1).downcase(); },
      message: function() { return "Expected type STRING but found NUMBER in:\nr.expr(1).downcase()\n^^^^^^^^^           \n"; }
    },
    { name: "r.expr(1).do(function(v) { return r.object(1, 2); })",
      fn: function() { return r.expr(1).do(function(v) { return r.object(1, 2); }); },
      message: function() { return "Expected type STRING but found NUMBER in:\nr.expr(1).do(function(var_1) {\n    return r.object(1, 2)\n                    ^    \n})\n"; }
    },
    { name: "r.expr(1).do(function(v) { return r.object('a'); })",
      fn: function() { return r.expr(1).do(function(v) { return r.object('a'); }); },
      message: function() { return "OBJECT expects an even number of arguments (but found 1) in:\nr.expr(1).do(function(var_1) {\n    return r.object(\"a\")\n           ^^^^^^^^^^^^^\n})\n"; }
    },
    { name: "r.random(1,2,{float: true}).sub('foo')",
      fn: function() { return r.random(1,2,{float: true}).sub('foo'); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.random(1, 2, {\n^^^^^^^^^^^^^^^^\n    float: true\n    ^^^^^^^^^^^\n}).sub(\"foo\")\n^^^^^^^^^^^^^\n"; }
    },
    { name: "r.random('foo', 'bar')",
      fn: function() { return r.random('foo', 'bar'); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.random(\"foo\", \"bar\")\n         ^^^^^        \n"; }
    },
    { name: "r.random('foo', 'bar', 'buzz', 'lol')",
      fn: function() { return r.random('foo', 'bar', 'buzz', 'lol'); }, throws: true,
      message: function() { return "`random` takes at most 3 arguments, 4 provided."; }
    },
    { name: "r.db(test._dbName).table(test._tableName).changes().add(2)",
      fn: function() { return r.db(test._dbName).table(test._tableName).changes().add(2); },
      message: function() { return "Expected type DATUM but found SEQUENCE:\nVALUE SEQUENCE in:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    .changes().add(2)\n    ^^^^^^^^^^       \n"; }
    },
    { name: "r.http('').add(2)",
      fn: function() { return r.http('').add(2); },
      message: function() { return "Error in HTTP GET of ``: URL using bad/illegal format or missing URL.\nheader:\nnull\nbody:\nnull in:\nr.http(\"\").add(2)\n^^^^^^^^^^       \n"; }
    },
    { name: "r.args(['foo', 'bar']).add(2)",
      fn: function() { return r.args(['foo', 'bar']).add(2); },
      message: function() { return "Expected type STRING but found NUMBER in:\nr.args([\"foo\", \"bar\"]).add(2)\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n"; }
    },
    { name: "r.do(1, function(b) { return b.add('foo'); })",
      fn: function() { return r.do(1, function(b) { return b.add('foo'); }); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.expr(1).do(function(var_1) {\n    return var_1.add(\"foo\")\n           ^^^^^^^^^^^^^^^^\n})\n"; }
    },
    { name: "r.db(test._dbName).table(test._tableName).between('foo', 'bar', { index: 'id' }).add(1)",
      fn: function() { return r.db(test._dbName).table(test._tableName).between('foo', 'bar', { index: 'id' }).add(1); },
      message: function() { return "Expected type DATUM but found TABLE_SLICE:\nSELECTION ON table(" + test._tableName +") in:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    .between(\"foo\", \"bar\", {\n    ^^^^^^^^^^^^^^^^^^^^^^^^\n        index: \"id\"\n        ^^^^^^^^^^^\n    }).add(1)\n    ^^       \n"; }
    },
    { name: "r.db(test._dbName).table(test._tableName).orderBy({index: 'id'}).add(1)",
      fn: function() { return r.db(test._dbName).table(test._tableName).orderBy({index: 'id'}).add(1); },
      message: function() { return "Expected type DATUM but found TABLE_SLICE:\nSELECTION ON table(" + test._tableName +") in:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    .orderBy({\n    ^^^^^^^^^^\n        index: \"id\"\n        ^^^^^^^^^^^\n    }).add(1)\n    ^^       \n"; }
    },
    { name: "r.binary('foo').add(1)",
      fn: function() { return r.binary('foo').add(1); },
      message: function() { return "Expected type NUMBER but found PTYPE<BINARY> in:\nr.binary(\"foo\").add(1)\n^^^^^^^^^^^^^^^^^^^^^^\n"; }
    },
    { name: "r.binary(new Buffer([0,1,2,3,4])).add(1)",
      fn: function() { return r.binary(new Buffer([0,1,2,3,4])).add(1); },
      message: function() { return "Expected type NUMBER but found PTYPE<BINARY> in:\nr.binary(<Buffer>).add(1)\n^^^^^^^^^^^^^^^^^^^^^^^^^\n"; }
    },
    { name: "r.do(1,function(b) { return r.point(1, 2).add('foo'); })",
      fn: function() { return r.do(1,function(b) { return r.point(1, 2).add('foo'); }); },
      message: function() { return "Expected type NUMBER but found PTYPE<GEOMETRY> in:\nr.expr(1).do(function(var_1) {\n    return r.point(1, 2).add(\"foo\")\n           ^^^^^^^^^^^^^^^^^^^^^^^^\n})\n"; }
    },
    { name: "r.do(1,function(b) { return r.line(1, 2).add('foo'); })",
      fn: function() { return r.do(1,function(b) { return r.line(1, 2).add('foo'); }); },
      message: function() { return "Expected type ARRAY but found NUMBER in:\nr.expr(1).do(function(var_1) {\n    return r.line(1, 2).add(\"foo\")\n           ^^^^^^^^^^^^           \n})\n"; }
    },
    { name: "r.do(1,function(b) { return r.circle(1, 2).add('foo'); })",
      fn: function() { return r.do(1,function(b) { return r.circle(1, 2).add('foo'); }); },
      message: function() { return "Expected type ARRAY but found NUMBER in:\nr.expr(1).do(function(var_1) {\n    return r.circle(1, 2).add(\"foo\")\n           ^^^^^^^^^^^^^^           \n})\n"; }
    },
    { name: "r.do(1,function(b) { return r.polygon(1, 2, 3).add('foo'); })",
      fn: function() { return r.do(1,function(b) { return r.polygon(1, 2, 3).add('foo'); }); },
      message: function() { return "Expected type ARRAY but found NUMBER in:\nr.expr(1).do(function(var_1) {\n    return r.polygon(1, 2, 3).add(\"foo\")\n           ^^^^^^^^^^^^^^^^^^           \n})\n"; }
    },
    { name: "r.do(1,function(b) { return r.polygon([0,0], [1,1], [2,3]).polygonSub(3).add('foo'); })",
      fn: function() { return r.do(1,function(b) { return r.polygon([0,0], [1,1], [2,3]).polygonSub(3).add('foo'); }); },
      message: function() { return "Not a GEOMETRY pseudotype: `3` in:\nr.expr(1).do(function(var_1) {\n    return r.polygon([0, 0], [1, 1], [2, 3]).polygonSub(3).add(\"foo\")\n                                                        ^            \n})\n"; }
    },
    { name: "r.do(1,function(b) { return r.polygon([0,0], [1,1], [2,3]).fill().polygonSub(3).add('foo'); })",
      fn: function() { return r.do(1,function(b) { return r.polygon([0,0], [1,1], [2,3]).fill().polygonSub(3).add('foo'); }); },
      message: function() { return "Expected geometry of type `LineString` but found `Polygon` in:\nr.expr(1).do(function(var_1) {\n    return r.polygon([0, 0], [1, 1], [2, 3]).fill().polygonSub(3).add(\"foo\")\n           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^                         \n})\n"; }
    },
    { name: "r.do(1,function(b) { return r.polygon([0,0], [1,1], [2,3]).distance(r.expr('foo').polygonSub(3)).add('foo'); })",
      fn: function() { return r.do(1,function(b) { return r.polygon([0,0], [1,1], [2,3]).distance(r.expr('foo').polygonSub(3)).add('foo'); }); },
      message: function() { return "Not a GEOMETRY pseudotype: `\"foo\"` in:\nr.expr(1).do(function(var_1) {\n    return r.polygon([0, 0], [1, 1], [2, 3]).distance(r.expr(\"foo\").polygonSub(3)).add(\"foo\")\n                                                      ^^^^^^^^^^^^^                          \n})\n"; }
    },
    { name: "r.db(test._dbName).table(test._tableName).getIntersecting(r.circle(0, 1), 3)",
      fn: function() { return r.db(test._dbName).table(test._tableName).getIntersecting(r.circle(0, 1), 3); },
      message: function() { return "Expected type ARRAY but found NUMBER in:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n    .getIntersecting(r.circle(0, 1))\n                     ^^^^^^^^^^^^^^ \n"; }
    },
    { name: "r.db(test._dbName).table(test._tableName).getNearest(r.circle(0, 1), 3)",
      fn: function() { return r.db(test._dbName).table(test._tableName).getNearest(r.circle(0, 1), 3); },
      message: function() { return "Expected type ARRAY but found NUMBER in:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n    .getNearest(r.circle(0, 1))\n                ^^^^^^^^^^^^^^ \n"; }
    },
    { name: "r.polygon([0, 0], [0, 1], [1, 1]).includes(r.expr([0, 1, 3]))",
      fn: function() { return r.polygon([0, 0], [0, 1], [1, 1]).includes(r.expr([0, 1, 3])); },
      message: function() { return "Not a GEOMETRY pseudotype: `[\n\t0,\n\t1,\n\t3\n]` in:\nr.polygon([0, 0], [0, 1], [1, 1]).includes([0, 1, 3])\n                                           ^^^^^^^^^ \n"; }
    },
    { name: "r.polygon([0, 0], [0, 1], [1, 1]).intersects(r.expr([0, 1, 3]))",
      fn: function() { return r.polygon([0, 0], [0, 1], [1, 1]).intersects(r.expr([0, 1, 3])); },
      message: function() { return "Not a GEOMETRY pseudotype: `[\n\t0,\n\t1,\n\t3\n]` in:\nr.polygon([0, 0], [0, 1], [1, 1]).intersects([0, 1, 3])\n                                             ^^^^^^^^^ \n"; }
    },
    { name: "r.polygon([0, 0], [0, 1], [1, 1]).includes(r.expr([0, 1, 3]))",
      fn: function() { return r.polygon([0, 0], [0, 1], [1, 1]).includes(r.expr([0, 1, 3])); },
      message: function() { return "Not a GEOMETRY pseudotype: `[\n\t0,\n\t1,\n\t3\n]` in:\nr.polygon([0, 0], [0, 1], [1, 1]).includes([0, 1, 3])\n                                           ^^^^^^^^^ \n"; }
    },
    { name: "r.db(test._dbName).table(test._tableName).orderBy(r.desc('foo')).add(1)",
      fn: function() { return r.db(test._dbName).table(test._tableName).orderBy(r.desc('foo')).add(1); },
      message: function() { return "Expected type DATUM but found SELECTION:\nSELECTION ON table(" + test._tableName +") in:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    .orderBy(r.desc(\"foo\")).add(1)\n    ^^^^^^^^^^^^^^^^^^^^^^^       \n"; }
    },
    { name: "r.db(test._dbName).table(test._tableName).orderBy(r.asc('foo')).add(1)",
      fn: function() { return r.db(test._dbName).table(test._tableName).orderBy(r.asc('foo')).add(1); },
      message: function() { return "Expected type DATUM but found SELECTION:\nSELECTION ON table(" + test._tableName +") in:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    .orderBy(r.asc(\"foo\")).add(1)\n    ^^^^^^^^^^^^^^^^^^^^^^       \n"; }
    },
    { name: "r.range('foo')",
      fn: function() { return r.range('foo'); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.range(\"foo\")\n        ^^^^^ \n"; }
    },
    { name: "r.range(1,10).do(function(x) { return x.add(4); })",
      fn: function() { return r.range(1,10).do(function(x) { return x.add(4); }); },
      message: function() { return "Expected type DATUM but found SEQUENCE:\nVALUE SEQUENCE in:\nr.range(1, 10).do(function(var_1) {\n^^^^^^^^^^^^^^                     \n    return var_1.add(4)\n})\n"; }
    },
    { name: "r.range(1,10).toJSON().do(function(x) { return x.add(4); })",
      fn: function() { return r.range(1,10).toJSON().do(function(x) { return x.add(4); }); },
      message: function() { return "Expected type DATUM but found SEQUENCE:\nVALUE SEQUENCE in:\nr.range(1, 10).toJSON().do(function(var_1) {\n^^^^^^^^^^^^^^                              \n    return var_1.add(4)\n})\n"; }
    },
    { name: "r.db(test._dbName).table(test._tableName).config().do(function(x) { return x.add(4); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).config().do(function(x) { return x.add(4); }); },
      message: function() { return "Expected type NUMBER but found OBJECT in:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n    .config().do(function(var_1) {\n        return var_1.add(4)\n               ^^^^^^^^^^^^\n    })\n"; }
    },
    { name: "r.db(test._dbName).table(test._tableName).status().do(function(x) { return x.add(4); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).status().do(function(x) { return x.add(4); }); },
      message: function() { return "Expected type NUMBER but found OBJECT in:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n    .status().do(function(var_1) {\n        return var_1.add(4)\n               ^^^^^^^^^^^^\n    })\n"; }
    },
    { name: "r.db(test._dbName).table(test._tableName).wait().do(function(x) { return x.add(4); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).wait().do(function(x) { return x.add(4); }); },
      message: function() { return "Expected type NUMBER but found OBJECT in:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n    .wait().do(function(var_1) {\n        return var_1.add(4)\n               ^^^^^^^^^^^^\n    })\n"; }
    },
    { name: "r.db(test._dbName).table(test._tableName).reconfigure({ shards: 1 }).do(function(x) { return x.add(4); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).reconfigure({ shards: 1 }).do(function(x) { return x.add(4); }); },
      message: function() { return "Missing required argument `replicas` in:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    .reconfigure({\n    ^^^^^^^^^^^^^^\n        shards: 1\n        ^^^^^^^^^\n    }).do(function(var_1) {\n    ^^                     \n        return var_1.add(4)\n    })\n"; }
    },
    { name: "r.expr(1).add('foo').add(r.db(test._dbName).table(test._tableName).rebalance().do(function(x) { return x.add(4); }))",
      fn: function() { return r.expr(1).add('foo').add(r.db(test._dbName).table(test._tableName).rebalance().do(function(x) { return x.add(4); })); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.expr(1).add(\"foo\").add(r.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n^^^^^^^^^^^^^^^^^^^^                                                                                       \n    .rebalance().do(function(var_1) {\n        return var_1.add(4)\n    }))\n"; }
    },
    { name: "r.map([1,2,3], [1,2,3], function(var_1) { return var_1('bah').add(3); })",
      fn: function() { return r.map([1,2,3], [1,2,3], function(var_1) { return var_1('bah').add(3); }); },
      message: function() { return "The function passed to `map` expects 1 argument, but 2 sequences were found in:\nr.map(r.expr([1, 2, 3]), [1, 2, 3], function(var_1) {\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    return var_1(\"bah\").add(3)\n    ^^^^^^^^^^^^^^^^^^^^^^^^^^\n})\n^^\n"; }
    },
    { name: "r.map([1,2,3], [1,2,3], function(var_1, var_2) { return var_1('bah').add(3); })",
      fn: function() { return r.map([1,2,3], [1,2,3], function(var_1, var_2) { return var_1('bah').add(3); }); },
      message: function() { return "Cannot perform bracket on a non-object non-sequence `1` in:\nr.map(r.expr([1, 2, 3]), [1, 2, 3], function(var_1, var_2) {\n    return var_1(\"bah\").add(3)\n           ^^^^^              \n})\n"; }
    },
    { name: "r.expr([1,2,3]).split(',', 3).add(3)",
      fn: function() { return r.expr([1,2,3]).split(',', 3).add(3); },
      message: function() { return "Expected type STRING but found ARRAY in:\nr.expr([1, 2, 3]).split(\",\", 3).add(3)\n^^^^^^^^^^^^^^^^^                     \n"; }
    },
    { name: "r.expr({}).merge({a: r.literal({foo: 'bar'})}).add(2)",
      fn: function() { return r.expr({}).merge({a: r.literal({foo: 'bar'})}).add(2); },
      message: function() { return "Expected type NUMBER but found OBJECT in:\nr.expr({}).merge({\n^^^^^^^^^^^^^^^^^^\n    a: r.literal({\n    ^^^^^^^^^^^^^^\n        foo: \"bar\"\n        ^^^^^^^^^^\n    })\n    ^^\n}).add(2)\n^^^^^^^^^\n"; }
    },
    { name: "r.monday.add([1])",
      fn: function() { return r.monday.add([1]); },
      message: function() { return "Expected type NUMBER but found ARRAY in:\nr.monday.add([1])\n^^^^^^^^^^^^^^^^^\n"; }
    },
    { name: "r.november.add([1])",
      fn: function() { return r.november.add([1]); },
      message: function() { return "Expected type NUMBER but found ARRAY in:\nr.november.add([1])\n^^^^^^^^^^^^^^^^^^^\n"; }
    },
    { name: "r.expr({a: r.wednesday}).add([1])",
      fn: function() { return r.expr({a: r.wednesday}).add([1]); },
      message: function() { return "Expected type NUMBER but found OBJECT in:\nr.expr({\n^^^^^^^^\n    a: r.wednesday\n    ^^^^^^^^^^^^^^\n}).add([1])\n^^^^^^^^^^^\n"; }
    },
    { name: "r.db(test._dbName).table(test._tableName).between(r.minval, r.maxval, {index: 'foo'}).add(1)",
      fn: function() { return r.db(test._dbName).table(test._tableName).between(r.minval, r.maxval, {index: 'foo'}).add(1); },
      message: function() { return "Expected type DATUM but found TABLE_SLICE:\nSELECTION ON table(" + test._tableName +") in:\nr.db(\"" + test._dbName +"\").table(\"" + test._tableName +"\")\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    .between(r.minval, r.maxval, {\n    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n        index: \"foo\"\n        ^^^^^^^^^^^^\n    }).add(1)\n    ^^       \n"; }
    },
    { name: "r.expr(1).add('bar').add(r.ISO8601('dadsa', { defaultTimezone: 'dsada' }))",
      fn: function() { return r.expr(1).add('bar').add(r.ISO8601('dadsa', { defaultTimezone: 'dsada' })); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.expr(1).add(\"bar\").add(r.ISO8601(\"dadsa\", {\n^^^^^^^^^^^^^^^^^^^^                         \n    defaultTimezone: \"dsada\"\n}))\n"; }
    },
    { name: "r.expr({foo: 'bar'}).merge({foo: r.literal(), bar: r.expr('lol').add(1)})",
      fn: function() { return r.expr({foo: 'bar'}).merge({foo: r.literal(), bar: r.expr('lol').add(1)}); },
      message: function() { return "Expected type STRING but found NUMBER in:\nr.expr({\n    foo: \"bar\"\n}).merge({\n    foo: r.literal(),\n    bar: r.expr(\"lol\").add(1)\n         ^^^^^^^^^^^^^^^^^^^^\n})\n"; }
    },
    { name: "r.floor('hello')",
      fn: function() { return r.floor('hello'); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.expr(\"hello\").floor()\n^^^^^^^^^^^^^^^        \n"; }
    },
    { name: "r.floor()",
      fn: function() { return r.floor(); }, throws: true,
      message: function() { return "`r.floor` takes 1 argument, 0 provided."; }
    },
    { name: "r.round('hello')",
      fn: function() { return r.round('hello'); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.expr(\"hello\").round()\n^^^^^^^^^^^^^^^        \n"; }
    },
    { name: "r.ceil('hello')",
      fn: function() { return r.ceil('hello'); },
      message: function() { return "Expected type NUMBER but found STRING in:\nr.expr(\"hello\").ceil()\n^^^^^^^^^^^^^^^       \n"; }
    },
    { name: "lots of long strings",
      fn: function() { return r.table("foo").add(1).add(1).add("hello-super-long-string").add("another-long-string").add("one-last-string").map( function(doc) { return r.expr([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]).map(function(test) { return test("b").add("hello-super-long-string").add("another-long-string").add("one-last-string").add("hello-super-long-string").add("another-long-string").add("one-last-string").add("hello-super-long-string").add("another-long-string").add("one-last-string").add("hello-super-long-string").add("another-long-string").add("one-last-string").add("hello-super-long-string").add("another-long-string").add("one-last-string").mul(test("b")).merge({ firstName: "xxxxxx", lastName: "yyyy", email: "xxxxx@yyyy.com", phone: "xxx-xxx-xxxx" }); }).add(2).map(function(doc) { return doc.add("hello-super-long-string").add("another-long-string").add("one-last-string").add("hello-super-long-string").add("another-long-string").add("one-last-string").add("hello-super-long-string").add("another-long-string").add("one-last-string").add("hello-super-long-string").add("another-long-string").add("one-last-string").add("hello-super-long-string").add("another-long-string").add("one-last-string"); }); }); },
      message: function() { return "Table `test.foo` does not exist in:\nr.table(\"foo\").add(1).add(1).add(\"hello-super-long-string\").add(\"another-long-string\")\n^^^^^^^^^^^^^^                                                                        \n    .add(\"one-last-string\").map(function(var_1) {\n        return r.expr([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]).map(function(var_2) {\n            return var_2(\"b\").add(\"hello-super-long-string\").add(\"another-long-string\").add(\"one-last-string\")\n                .add(\"hello-super-long-string\").add(\"another-long-string\").add(\"one-last-string\")\n                .add(\"hello-super-long-string\").add(\"another-long-string\").add(\"one-last-string\")\n                .add(\"hello-super-long-string\").add(\"another-long-string\").add(\"one-last-string\")\n                .add(\"hello-super-long-string\").add(\"another-long-string\").add(\"one-last-string\")\n                .mul(var_2(\"b\")).merge({\n                    firstName: \"xxxxxx\",\n                    lastName: \"yyyy\",\n                    email: \"xxxxx@yyyy.com\",\n                    phone: \"xxx-xxx-xxxx\"\n                })\n        }).add(2).map(function(var_3) {\n            return var_3.add(\"hello-super-long-string\").add(\"another-long-string\").add(\"one-last-string\")\n                .add(\"hello-super-long-string\").add(\"another-long-string\").add(\"one-last-string\")\n                .add(\"hello-super-long-string\").add(\"another-long-string\").add(\"one-last-string\")\n                .add(\"hello-super-long-string\").add(\"another-long-string\").add(\"one-last-string\")\n                .add(\"hello-super-long-string\").add(\"another-long-string\").add(\"one-last-string\")\n        })\n    })\n"; }
    },
    { name: "r.db(test._dbName).table(test._tableName).map(function(doc) { return doc('key').add(NaN); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).map(function(doc) { return doc('key').add(NaN); }); },
      message: function() { return 'Cannot convert `NaN` to JSON in:\nr.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\")\n    .map(function(var_1) {\n        return var_1(\"key\").add(NaN)\n                                ^^^ \n    })\n'; }
    },
    { name: "r.db(test._dbName).table(test._tableName).map(function(doc) { return doc('key').add(Infinity); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).map(function(doc) { return doc('key').add(Infinity); }); },
      message: function() { return 'Cannot convert `Infinity` to JSON in:\nr.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\")\n    .map(function(var_1) {\n        return var_1(\"key\").add(Infinity)\n                                ^^^^^^^^ \n    })\n'; }
    },
    { name: "r.db(test._dbName).table(test._tableName).map(function(doc) { return doc('key').add(undefined); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).map(function(doc) { return doc('key').add(undefined); }); },
      message: function() { return 'Cannot convert `undefined` with r.expr() in:\nr.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\")\n    .map(function(var_1) {\n        return var_1(\"key\").add(undefined)\n                                ^^^^^^^^^ \n    })\n'; }
    },
    { name: "r.db(test._dbName).table(test._tableName).merge(function(user) { return r.branch(user('location').eq('US'), { adult: user('age').gt(NaN) }, { radult: user('age').gt(18) }); })",
      fn: function() { return r.db(test._dbName).table(test._tableName).merge(function(user) { return r.branch(user('location').eq('US'), { adult: user('age').gt(NaN) }, { radult: user('age').gt(18) }); }); },
      message: function() { return 'Cannot convert `NaN` to JSON in:\nr.db(\"'+ test._dbName + '\").table(\"'+ test._tableName + '\")\n    .merge(function(var_1) {\n        return r.branch(var_1(\"location\").eq(\"US\"), {\n            adult: var_1(\"age\").gt(NaN)\n                                   ^^^ \n        }, {\n            radult: var_1(\"age\").gt(18)\n        })\n    })\n'; }
    },
    {
      name: "r.expr({a:1, b:2, c: 3}).values().add(2)",
      fn: function() { return r.expr({a:1, b:2, c: 3}).values().add(2); },
      message: "Expected type ARRAY but found NUMBER in:\nr.expr({\n^^^^^^^^\n    a: 1,\n    ^^^^^\n    b: 2,\n    ^^^^^\n    c: 3\n    ^^^^\n}).values().add(2)\n^^^^^^^^^^^^^^^^^^\n"
    }
  ].forEach(function(testCase) {
    var testName = !!testCase.name ? testCase.name : testCase.fn.toString();
    it(testName, function() {
      r.nextVarId = 1;
      var message = (typeof testCase.message === 'function') ? testCase.message() : testCase.message;
      if (!!testCase.throws) {
        expect(testCase.fn).to.throw(message);
      } else {
        var promise = testCase.fn();
        expect(promise).to.eventually.be.rejectedWith(message);
      }
    });
  });

  describe('error types', function() {
    it('ReqlResourceLimitError', function() {
      var invalid = r.expr([1, 2, 3, 4]).run({ arrayLimit: 2 });
      expect(invalid).to.eventually.be.rejectedWith(errors.ReqlRuntimeError);
    });

    it('ReqlQueryLogicError', function() {
      var invalid = r.expr(1).add('foo');
      expect(invalid).to.eventually.be.rejectedWith(errors.ReqlRuntimeError);
    });

    it('ReqlOpFailedError', function() {
      var invalid = r.db('DatabaseThatDoesNotExist').tableList();
      expect(invalid).to.eventually.be.rejectedWith(errors.ReqlRuntimeError);
    });

    it('ReqlUserError', function() {
      var invalid = r.branch(r.error('a'), 1, 2);
      expect(invalid).to.eventually.be.rejectedWith(errors.ReqlRuntimeError);
    });

    // Missing tests for ReqlInternalError and ReqlOpIndeterminateError
    // as there are no easy way to trigger those
  });

});
