"use strict";
var net = require('net'),
    tls = require('tls'),
    Promise = require('bluebird'),
    events = require('events'),
    util = require('util'),
    crypto = require('crypto'),

    helper = require('./helper.js'),
    errors = require('./error.js'),
    Cursor = require('./cursor.js'),
    ReadableStream = require('./stream.js'),
    Metadata = require('./metadata.js'),

    protodef = require('./protodef.js'),
    rt = protodef.Response.ResponseType;

// We'll ping a connection using this special value.
var PING_VALUE = '__rethinkdbdash_ping__';

var PROTOCOL_VERSION = 0;
var AUTHENTIFICATION_METHOD = 'SCRAM-SHA-256';
var KEY_LENGTH = 32; // Because we are currently using SHA 256
var NULL_BUFFER = new Buffer('\0', 'binary');
var CACHE_PBKDF2 = {};

function Connection(r, options, resolve, reject) {
  var self = this;
  this.r = r;
  this.state = 0; // Track the progress of the handshake. -1 will be used for an error state.

  // Set default options - We have to save them in case the user tries to reconnect
  if (!helper.isPlainObject(options)) options = {};
  if (!!options.authKey) {
    if (!!options.user || !!options.password)
      throw new errors.ReqlDriverError('Cannot use both authKey and password');

    this.user = r._user;
    this.password = options.authKey;
  } else {
    this.user = (options.user === undefined) ? r._user : options.user;
    this.password = (options.password === undefined) ? r._password : options.password;
  }

  this.host = options.host || r._host;
  this.port = options.port || r._port;
  this.authKey = options.authKey || r._authKey;

  // period in *seconds* for the connection to be opened
  this.timeoutConnect = options.timeout || r._timeoutConnect;

  // The connection will be pinged every <pingInterval> seconds
  this.pingInterval = options.pingInterval || r._pingInterval;

  if (options.db) this.db = options.db; // Pass to each query

  this.token = 1;
  this.buffer = new Buffer(0);

  this.metadata = {};

  this.open = false; // true only if the user can write on the socket
  this.timeout = null;

  var family = 'IPv4';
  if (net.isIPv6(self.host)) {
    family = 'IPv6';
  }

  var connectionArgs = {
    host: self.host,
    port: self.port,
    family: family
  };

  var tlsOptions = options.ssl || false;
  if (tlsOptions === false) {
    self.connection = net.connect(connectionArgs);
  } else {
    if (helper.isPlainObject(tlsOptions)) {
      // Copy the TLS options in connectionArgs
      helper.loopKeys(tlsOptions, function(tlsOptions, key) {
        connectionArgs[key] = tlsOptions[key];
      });
    }
    self.connection = tls.connect(connectionArgs);
  }

  self.connection.setKeepAlive(true);

  self.timeoutOpen = setTimeout(function() {
    self.connection.end(); // Send a FIN packet
    reject(new errors.ReqlDriverError('Failed to connect to ' + self.host + ':' + self.port + ' in less than ' + self.timeoutConnect + 's'));
  }, self.timeoutConnect * 1000);

  self.connection.on('end', function() {
    self.open = false;
    self.emit('end');
    // We got a FIN packet, so we'll just flush
    self._flush();
  });

  self.connection.on('close', function() {
    // We emit end or close just once
    clearTimeout(self.timeoutOpen);
    clearInterval(self.pingIntervalId);
    self.connection.removeAllListeners();
    self.open = false;
    self.emit('closed');
    // The connection is fully closed, flush (in case 'end' was not triggered)
    self._flush();
  });

  self.connection.setNoDelay();
  self.connection.once('error', function(error) {
    reject(new errors.ReqlDriverError('Failed to connect to ' + self.host + ':' + self.port + '\nFull error:\n' + JSON.stringify(error)));
  });

  self.connection.on('connect', function() {
    self.connection.removeAllListeners('error');
    self.connection.on('error', function(error) {
      self.emit('error', error);
    });

    var versionBuffer = new Buffer(4);
    versionBuffer.writeUInt32LE(protodef.VersionDummy.Version.V1_0, 0);

    self.randomString = new Buffer(crypto.randomBytes(18)).toString('base64');
    var authBuffer = new Buffer(JSON.stringify({
      protocol_version: PROTOCOL_VERSION,
      authentication_method: AUTHENTIFICATION_METHOD,
      authentication: "n,,n=" + self.user + ",r=" + self.randomString
    }));


    helper.tryCatch(function() {
      self.connection.write(Buffer.concat([versionBuffer, authBuffer, NULL_BUFFER]));
    }, function(err) {
      // The TCP connection is open, but the ReQL connection wasn't established.
      // We can just abort the whole thing
      self.open = false;
      reject(new errors.ReqlDriverError('Failed to perform handshake with ' + self.host + ':' + self.port));
    });
  });

  self.connection.once('end', function() {
    self.open = false;
  });

  self.connection.on('data', function(buffer) {
    if (self.state === -1) {
      // This is an error state
      return;
    }

    self.buffer = Buffer.concat([self.buffer, buffer]);

    if (self.open === false) {
      for (var i=0; i < self.buffer.length; i++) {
        if (self.buffer[i] === 0) {
          var messageServerStr = self.buffer.slice(0, i).toString();
          var messageServer;
          self.buffer = self.buffer.slice(i + 1); // +1 to remove the null byte
          try {
            messageServer = JSON.parse(messageServerStr);
          } catch(error) {
            self._abort();
            reject(new errors.ReqlDriverError('Could not parse the message sent by the server : \'' + messageServerStr + '\''));
            return;
          }

          if (messageServer.success !== true) {
            self._abort();
            reject(new errors.ReqlDriverError('Error ' + messageServer.error_code + ':' + messageServer.error));
            return;
          }

          if (self.state === 0) {
            self._checkProtocolVersion(messageServer, reject);
          } else if (self.state === 1) {
            // Compute salt and send the proof
            self._computeSaltedPassword(messageServer, reject);
          } else if (self.state === 2) {
            self._compareDigest(messageServer, resolve, reject);
          }
        }
      }
    } else {
      while (self.buffer.length >= 12) {
        var token = self.buffer.readUInt32LE(0) + 0x100000000 * self.buffer.readUInt32LE(4);
        var responseLength = self.buffer.readUInt32LE(8);

        if (self.buffer.length < 12 + responseLength) break;

        var responseBuffer = self.buffer.slice(12, 12 + responseLength);
        var response = JSON.parse(responseBuffer);

        self._processResponse(response, token);

        self.buffer = self.buffer.slice(12 + responseLength);
      }
    }
  });

  self.connection.on('timeout', function(buffer) {
    self.connection.open = false;
    self.emit('timeout');
  });

  self.connection.toJSON = function() { // We want people to be able to jsonify a cursor
    return '"A socket object cannot be converted to JSON due to circular references."';
  };
}

util.inherits(Connection, events.EventEmitter);

Connection.prototype._checkProtocolVersion = function(messageServer, reject) {
  // Expect max_protocol_version, min_protocol_version, server_version, success
  var minVersion = messageServer.min_protocol_version;
  var maxVersion = messageServer.max_protocol_version;

  if (minVersion > PROTOCOL_VERSION || maxVersion < PROTOCOL_VERSION) {
    this._abort();
    reject(new errors.ReqlDriverError('Unsupported protocol version: ' + PROTOCOL_VERSION + ', expected between ' + minVersion + ' and ' + maxVersion));
  }
  this.state = 1;
};

Connection.prototype._computeSaltedPassword = function(messageServer, reject) {
  var self = this;
  var authentication = helper.splitCommaEqual(messageServer.authentication);

  var randomNonce = authentication.r;
  var salt = new Buffer(authentication.s, 'base64');
  var iterations = parseInt(authentication.i);

  if (randomNonce.substr(0, self.randomString.length) !== self.randomString) {
    self._abort();
    reject(new errors.ReqlDriverError('Invalid nonce from server').setOperational());
  }

  // The salt is constant, so we can cache the salted password.
  var cacheKey = self.password.toString("base64") + ',' + salt.toString("base64") + ',' + iterations;
  if (CACHE_PBKDF2.hasOwnProperty(cacheKey)) {
    helper.tryCatch(function() {
      self._sendProof(messageServer.authentication, randomNonce, CACHE_PBKDF2[cacheKey]);
    }, function(err) {
      // The TCP connection is open, but the ReQL connection wasn't established.
      // We can just abort the whole thing
      self.open = false;
      reject(new errors.ReqlDriverError('Failed to perform handshake with ' + self.host + ':' + self.port));
    });
  } else {
    crypto.pbkdf2(self.password, salt, iterations, KEY_LENGTH, "sha256", function(error, saltedPassword) {
      if (!!error) {
        self._abort();
        reject(new errors.ReqlDriverError('Could not derive the key. Error:' + error.toString()));
      }

      CACHE_PBKDF2[cacheKey] = saltedPassword;
      helper.tryCatch(function() {
        self._sendProof(messageServer.authentication, randomNonce, saltedPassword);
      }, function(err) {
        // The TCP connection is open, but the ReQL connection wasn't established.
        // We can just abort the whole thing
        self.open = false;
        reject(new errors.ReqlDriverError('Failed to perform handshake with ' + self.host + ':' + self.port));
      });
    });
  }
};

Connection.prototype._sendProof = function(authentication, randomNonce, saltedPassword) {
  var clientFinalMessageWithoutProof = "c=biws,r=" + randomNonce;
  var clientKey = crypto.createHmac("sha256", saltedPassword).update("Client Key").digest();
  var storedKey = crypto.createHash("sha256").update(clientKey).digest();

  var authMessage =
      "n=" + this.user + ",r=" + this.randomString + "," +
      authentication + "," +
      clientFinalMessageWithoutProof;

  var clientSignature = crypto.createHmac("sha256", storedKey).update(authMessage).digest();
  var clientProof = helper.xorBuffer(clientKey, clientSignature);

  var serverKey = crypto.createHmac("sha256", saltedPassword).update("Server Key").digest();
  this.serverSignature = crypto.createHmac("sha256", serverKey).update(authMessage).digest();

  this.state = 2;
  var message = JSON.stringify({
    authentication: clientFinalMessageWithoutProof + ",p=" + clientProof.toString("base64")
  });

  this.connection.write(Buffer.concat([new Buffer(message.toString()), NULL_BUFFER]));
};

Connection.prototype._compareDigest = function(messageServer, resolve, reject) {
  var self = this;
  var firstEquals = messageServer.authentication.indexOf('=');
  var serverSignatureValue = messageServer.authentication.slice(firstEquals + 1);

  if (!helper.compareDigest(serverSignatureValue, self.serverSignature.toString("base64"))) {
    reject(new errors.ReqlDriverError('Invalid server signature'));
  }

  self.state = 4;
  self.connection.removeAllListeners('error');
  self.open = true;
  self.connection.on('error', function(e) {
    self.open = false;
  });

  clearTimeout(self.timeoutOpen);
  resolve(self);
  if (self.pingInterval > 0) {
    self.pingIntervalId = setInterval(function() {
      self.pendingPing = true;
      self.r.error(PING_VALUE).run(self).error(function(error) {
        self.pendingPing = false;
        if (error.message !== PING_VALUE) {
          self.emit('error', new errors.ReqlDriverError(
                'Could not ping the connection').setOperational());
          self.open = false;
          self.connection.end();
        } else {
        }
      });
    }, self.pingInterval*1000);
  }
};

Connection.prototype._abort = function() {
  this.state = -1;
  this.removeAllListeners();
  this.close();
};

Connection.prototype._handleCompileError = function(response, token) {
  this.emit('release');
  if (typeof this.metadata[token].reject === 'function') {
    this.metadata[token].reject(
      new errors.ReqlCompileError(helper.makeAtom(response), this.metadata[token].query, response));
  }

  delete this.metadata[token];
};

Connection.prototype._handleClientError = function(response, token) {
  this.emit('release');

  var currentResolve, currentReject, error;
  if (typeof this.metadata[token].reject === 'function') {
    currentResolve = this.metadata[token].resolve;
    currentReject = this.metadata[token].reject;
    this.metadata[token].removeCallbacks();
    currentReject(new errors.ReqlClientError(helper.makeAtom(response), this.metadata[token].query, response));
    if (typeof this.metadata[token].endReject !== 'function') {
      // No pending STOP query, we can delete
      delete this.metadata[token];
    }
  } else if (typeof this.metadata[token].endResolve === 'function') {
    currentResolve = this.metadata[token].endResolve;
    currentReject = this.metadata[token].endReject;
    this.metadata[token].removeEndCallbacks();
    currentReject(new errors.ReqlClientError(helper.makeAtom(response), this.metadata[token].query, response));
    delete this.metadata[token];
  } else if (token === -1) { // This should not happen now since 1.13 took the token out of the query
    error = new errors.ReqlClientError(helper.makeAtom(response) + '\nClosing all outstanding queries...');
    this.emit('error', error);

    // We don't want a function to yield forever, so we just reject everything
    helper.loopKeys(this.rejectMap, function(rejectMap, key) {
      rejectMap[key](error);
    });

    this.close();
    delete this.metadata[token];
  }
};

Connection.prototype._handleRuntimeError = function(response, token) {
  var errorValue = helper.makeAtom(response);
  var error;

  // We don't want to release a connection if we just pinged it.
  if (this.pendingPing === false || (errorValue !== PING_VALUE)) {
    this.emit('release');
    error = new errors.ReqlRuntimeError(errorValue, this.metadata[token].query, response);
  } else {
    error = new errors.ReqlRuntimeError(errorValue);
  }

  var currentResolve, currentReject;
  if (typeof this.metadata[token].reject === 'function') {
    currentResolve = this.metadata[token].resolve;
    currentReject = this.metadata[token].reject;
    this.metadata[token].removeCallbacks();
    currentReject(error);
    if (typeof this.metadata[token].endReject !== 'function') {
      // No pending STOP query, we can delete
      delete this.metadata[token];
    }
  } else if (typeof this.metadata[token].endResolve === 'function') {
    currentResolve = this.metadata[token].endResolve;
    currentReject = this.metadata[token].endReject;
    this.metadata[token].removeEndCallbacks();
    delete this.metadata[token];
  }
};

Connection.prototype._handleSuccessAtom = function(response, token) {
  this.emit('release');

  var datum = helper.makeAtom(response, this.metadata[token].options);
  var cursor, stream;
  if ((Array.isArray(datum)) &&
      ((this.metadata[token].options.cursor === true) ||
      ((this.metadata[token].options.cursor === undefined) && (this.r._options.cursor === true)))) {
    cursor = new Cursor(this, token, this.metadata[token].options, 'cursor');
    this.metadata[token].resolve(cursor, response);
    cursor._push({ done: true, response: { r: datum } });
  } else if ((Array.isArray(datum)) &&
      ((this.metadata[token].options.stream === true || this.r._options.stream === true))) {
    cursor = new Cursor(this, token, this.metadata[token].options, 'cursor');
    stream = new ReadableStream({}, cursor);
    this.metadata[token].resolve(stream, response);
    cursor._push({ done: true, response: { r: datum } });
  } else {
    this.metadata[token].resolve(datum, response);
  }

  delete this.metadata[token];
};

Connection.prototype._handleSuccessPartial = function(response, token) {
  // We save the current resolve function because we are going to call cursor._fetch
  // before resuming the user's yield
  var currentResolve = this.metadata[token].resolve;
  var currentReject = this.metadata[token].reject;

  // We need to delete before calling cursor._push
  this.metadata[token].removeCallbacks();

  if (!!this.metadata[token].cursor) {  // This is a continue query
    return currentResolve({ done: false, response: response });
  }

  // No cursor, let's create one
  this.metadata[token].cursor = true;
  var typeResult = 'Cursor';
  var includesStates = false;
  if (Array.isArray(response.n)) {
    for (var i = 0; i < response.n.length; i++) {
      if (response.n[i] === protodef.Response.ResponseNote.SEQUENCE_FEED) {
        typeResult = 'Feed';
      } else if (response.n[i] === protodef.Response.ResponseNote.ATOM_FEED) {
        typeResult = 'AtomFeed';
      } else if (response.n[i] === protodef.Response.ResponseNote.ORDER_BY_LIMIT_FEED) {
        typeResult = 'OrderByLimitFeed';
      } else if (response.n[i] === protodef.Response.ResponseNote.UNIONED_FEED) {
        typeResult = 'UnionedFeed';
      } else if (response.n[i] === protodef.Response.ResponseNote.INCLUDES_STATES) {
        includesStates = true;
      } else {
        currentReject(new errors.ReqlDriverError('Unknown ResponseNote ' + response.n[i] + ', the driver is probably out of date.'));
        return;
      }
    }
  }

  var cursor = new Cursor(this, token, this.metadata[token].options, typeResult);
  if (includesStates === true) {
    cursor.setIncludesStates();
  }

  if ((this.metadata[token].options.cursor === true) ||
      ((this.metadata[token].options.cursor === undefined) && (this.r._options.cursor === true))) {
    currentResolve(cursor, response);
  } else if ((this.metadata[token].options.stream === true || this.r._options.stream === true)) {
    var stream = new ReadableStream({}, cursor);
    currentResolve(stream, response);
  } else if (typeResult !== 'Cursor') {
    currentResolve(cursor, response);
  } else {
    // When we get SUCCESS_SEQUENCE, we will delete self.metadata[token].options
    // So we keep a reference of it here
    // var options = this.metadata[token].options;

    // Fetch everything and return an array
    cursor.toArray()
      .then(function(result) { currentResolve(result, response); })
      .error(currentReject);
  }

  cursor._push({ done: false, response: response });
};

Connection.prototype._handleSuccessSequence = function(response, token) {
  this.emit('release');

  var currentResolve, currentReject;
  if (typeof this.metadata[token].resolve === 'function') {
    currentResolve = this.metadata[token].resolve;
    currentReject = this.metadata[token].reject;
    this.metadata[token].removeCallbacks();
  } else if (typeof this.metadata[token].endResolve === 'function') {
    currentResolve = this.metadata[token].endResolve;
    currentReject = this.metadata[token].endReject;
    this.metadata[token].removeEndCallbacks();
  }

  if (!!this.metadata[token].cursor) {  // This is a continue query
    return currentResolve({ done: true, response: response });
  }

  // No cursor, let's create one
  var cursor = new Cursor(this, token, this.metadata[token].options, 'Cursor');
  if ((this.metadata[token].options.cursor === true) ||
      ((this.metadata[token].options.cursor === undefined) && (this.r._options.cursor === true))) {
    currentResolve(cursor, response);

    // We need to keep the options in the else statement, so we clean it inside the if/else blocks
    delete this.metadata[token];
  } else if ((this.metadata[token].options.stream === true || this.r._options.stream === true)) {
    var stream = new ReadableStream({}, cursor);
    currentResolve(stream, response);

    // We need to keep the options in the else statement, so we clean it inside the if/else blocks
    delete this.metadata[token];
  } else {
    var self = this;
    cursor.toArray()
      .then(function(result) {
        currentResolve(result, response);
        delete self.metadata[token];
      })
      .error(currentReject);
  }

  cursor._push({ done: true, response: response });
};

Connection.prototype._handleWaitComplete = function(response, token) {
  this.emit('release');
  this.metadata[token].resolve();
  delete this.metadata[token];
};

Connection.prototype._handleServerInfo = function(response, token) {
  this.emit('release');
  var datum = helper.makeAtom(response, this.metadata[token].options);
  this.metadata[token].resolve(datum);
  delete this.metadata[token];
};

Connection.prototype._processResponse = function(response, token) {
  switch(response.t) {
    case rt.COMPILE_ERROR: return this._handleCompileError(response, token);
    case rt.CLIENT_ERROR: return this._handleClientError(response, token);
    case rt.RUNTIME_ERROR: return this._handleRuntimeError(response, token);
    case rt.SUCCESS_ATOM: return this._handleSuccessAtom(response, token);
    case rt.SUCCESS_PARTIAL: return this._handleSuccessPartial(response, token);
    case rt.SUCCESS_SEQUENCE: return this._handleSuccessSequence(response, token);
    case rt.WAIT_COMPLETE: return this._handleWaitComplete(response, token);
    case rt.SERVER_INFO: return this._handleServerInfo(response, token);
  }
};

Connection.prototype.reconnect = function(options, callback) {
  var self = this;
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (!helper.isPlainObject(options)) options = {};
  if (options.noreplyWait === false) {
    return self.r.connect({
      host: self.host, port: self.port, authKey: self.authKey, db: self.db
    }, callback);
  }

  return new Promise(function(resolve, reject) {
    self.close(options)
      .then(function() {
        return self.r.connect({
          host: self.host, port: self.port, authKey: self.authKey, db: self.db
        });
      })
      .then(function(c) { resolve(c); })
      .error(function(e) { reject(e); });
  }).nodeify(callback);
};

Connection.prototype._send = function(query, token, resolve, reject, originalQuery, options, end) {
  //console.log('Connection.prototype._send: '+token);
  //console.log(JSON.stringify(query, null, 2));

  var self = this;
  if (self.open === false) {
    return reject(new errors.ReqlDriverError('The connection was closed by the other party'));
  }

  var queryStr = JSON.stringify(query);
  var querySize = Buffer.byteLength(queryStr);

  var buffer = new Buffer(8 + 4 + querySize);
  buffer.writeUInt32LE(token & 0xFFFFFFFF, 0);
  buffer.writeUInt32LE(Math.floor(token / 0xFFFFFFFF), 4);

  buffer.writeUInt32LE(querySize, 8);

  buffer.write(queryStr, 12);

  // noreply instead of noReply because the otpions are translated for the server
  if ((!helper.isPlainObject(options)) || (options.noreply !== true)) {
    if (!self.metadata[token]) {
      self.metadata[token] = new Metadata(resolve, reject, originalQuery, options);
    } else if (end === true) {
      self.metadata[token].setEnd(resolve, reject);
    } else {
      self.metadata[token].setCallbacks(resolve, reject);
    }
  } else {
    if (typeof resolve === 'function') resolve();
    this.emit('release');
  }

  // This will emit an error if the connection is closed
  helper.tryCatch(function() {
    self.connection.write(buffer);
  }, function(err) {
    self.metadata[token].reject(err);
    delete self.metadata[token];
  });

};

Connection.prototype._continue = function(token, resolve, reject) {
  var query = [protodef.Query.QueryType.CONTINUE];
  this._send(query, token, resolve, reject);
};

Connection.prototype._end = function(token, resolve, reject) {
  var query = [protodef.Query.QueryType.STOP];
  this._send(query, token, resolve, reject, undefined, undefined, true);
};

Connection.prototype.use = function(db) {
  if (typeof db !== 'string') throw new errors.ReqlDriverError('First argument of `use` must be a string');
  this.db = db;
};

Connection.prototype.server = function(callback) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var query = [protodef.Query.QueryType.SERVER_INFO];
    self._send(query, self._getToken(), resolve, reject, undefined, undefined, true);
  }).nodeify(callback);
};

/**
 * Return the next token and update it.
 */
Connection.prototype._getToken = function() {
  return this.token++;
};

Connection.prototype.close = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var self = this;
  var promise = new Promise(function(resolve, reject) {
    if (!helper.isPlainObject(options)) options = {};
    if (options.noreplyWait === true) {
      self.noreplyWait()
        .then(function(r) {
          self.open = false;
          self.connection.end();
          resolve(r);
        })
        .error(function(e) {
          reject(e);
        });
    } else {
      self.open = false;
      self.connection.end();
      resolve();
    }
  });

  return promise.nodeify(callback);
};

Connection.prototype.noReplyWait = function() {
  throw new errors.ReqlDriverError('Did you mean to use `noreplyWait` instead of `noReplyWait`?');
};

Connection.prototype.noreplyWait = function(callback) {
  var self = this;
  var token = self._getToken();
  var promise = new Promise(function(resolve, reject) {
    var query = [protodef.Query.QueryType.NOREPLY_WAIT];
    self._send(query, token, resolve, reject);
  });

  return promise.nodeify(callback);
};

Connection.prototype._isConnection = function() {
  return true;
};

Connection.prototype._isOpen = function() {
  return this.open;
};

Connection.prototype._flush = function() {
  helper.loopKeys(this.metadata, function(metadata, key) {
    if (typeof metadata[key].reject === 'function') {
      metadata[key].reject(new errors.ReqlServerError(
          'The connection was closed before the query could be completed.',
          metadata[key].query));
    }

    if (typeof metadata[key].endReject === 'function') {
      metadata[key].endReject(new errors.ReqlServerError(
          'The connection was closed before the query could be completed.',
          metadata[key].query));
    }
  });

  this.metadata = {};
};

module.exports = Connection;
