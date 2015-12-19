"use strict";
module.exports = {
  host: process.env.RETHINKDB_HOST || 'localhost',
  port: parseInt(process.env.RETHINKDB_PORT, 10) || 28015,
  authKey: '',
  buffer: 2,
  max: 5,
  fake_server: {
    host: process.env.RETHINKDB_HOST || 'localhost',
    port: parseInt(process.env.RETHINKDB_PORT, 10) + 1 || 28016,
  },
  discovery: false,
  silent: true
};
