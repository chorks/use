'use strict';

var utils = require('lazy-cache')(require);
var fn = require;
require = utils; // eslint-disable-line

/**
 * Lazily required module dependencies
 */

require('define-property', 'define');
require('isarray', 'isArray');
require('isobject', 'isObject');
require = fn; // eslint-disable-line

utils.isString = function isString(val) {
  return val && typeof val === 'string';
};

utils.arrayify = function arrayify(val) {
  if (!val) return [];
  if (!utils.isArray(val)) return [val];
  return val;
};

/**
 * Expose `utils` modules
 */

module.exports = utils;
