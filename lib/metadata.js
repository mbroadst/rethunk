"use strict";
// Metadata we keep per query
function Metadata(resolve, reject, query, options) {
  this.resolve = this._wrapResolveForProfile(resolve);
  this.reject = reject;
  this.query = query; // The query in case we have to build a backtrace
  this.options = options || {};
  this.cursor = false;
}

Metadata.prototype.setCursor = function() {
  this.cursor = true;
};

Metadata.prototype.setEnd = function(resolve, reject) {
  this.endResolve = this._wrapResolveForProfile(resolve);
  this.endReject = reject;
};

Metadata.prototype.setCallbacks = function(resolve, reject) {
  var self = this;
  this.resolve = self._wrapResolveForProfile(resolve);
  this.reject = reject;
};

Metadata.prototype.removeCallbacks = function() {
  this.resolve = null;
  this.reject = null;
};

Metadata.prototype.removeEndCallbacks = function() {
  this.endResolve = null;
  this.endReject = null;
};

Metadata.prototype._wrapResolveForProfile = function(resolve) {
  var self = this;
  return function(result, response) {
    if (response && self.options.profile === true)
      return resolve({ profile: response.p, result: result });
    return resolve(result);
  };
};

module.exports = Metadata;
