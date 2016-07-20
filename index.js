/*!
 * use <https://github.com/jonschlinkert/use>
 *
 * Copyright (c) 2015, Jon Schlinkert.
 * Licensed under the MIT License.
 */

'use strict';

var utils = require('./utils');

module.exports = function base(app, opts) {
  if (!utils.isObject(app) && typeof app !== 'function') {
    throw new TypeError('use: expect `app` be an object or function');
  }

  if (!utils.isObject(opts)) {
    opts = {};
  }

  var prop = utils.isString(opts.prop) ? opts.prop : 'fns';
  if (!utils.isArray(app[prop])) {
    utils.define(app, prop, []);
  }

  /**
   * Define a plugin function to be passed to use. The only
   * parameter exposed to the plugin is `app`, the object or function.
   * passed to `use(app)`. `app` is also exposed as `this` in plugins.
   *
   * Additionally, **if a plugin returns a function, the function will
   * be pushed onto the `fns` array**, allowing the plugin to be
   * called at a later point by the `run` method.
   *
   * ```js
   * var use = require('use');
   *
   * // define a plugin
   * function foo(app) {
   *   // do stuff
   * }
   *
   * var app = function(){};
   * use(app);
   *
   * // register plugins
   * app.use(foo);
   * app.use(bar);
   * app.use(baz);
   * ```
   *
   * @name .use
   * @param {Function} `fn` plugin function to call
   * @api public
   */

  utils.define(app, 'use', use);

  /**
   * Run all plugins on `fns`. Any plugin that returns a function
   * when called by `use` is pushed onto the `fns` array.
   *
   * ```js
   * var config = {};
   * app.run(config);
   * ```
   *
   * @name .run
   * @param {Object} `value` Object to be modified by plugins.
   * @return {Object} Returns the object passed to `run`
   * @api public
   */

   utils.define(app, 'run', function run(val) {
    if (utils.isObject(val)) {
      decorate(arguments[0]);
    }

    var self = this || app;
    var len = self[prop].length;
    var i = 0;

    while (i < len) {
      var plugin = self[prop][i++];
      plugin.apply(self, arguments);
    }
    return self;
  });

  /**
   * Call plugin `fn`. If a function is returned push it into the
   * `fns` array to be called by the `run` method.
   */

  function use(fn, options) {
    if (typeof fn !== 'function') {
      throw new TypeError('.use expects `fn` be a function');
    }

    var self = this || app;
    var params = utils.arrayify(opts.params);
    params = params.length === 0 ? [self] : params;

    if (typeof opts.fn === 'function') {
      opts.fn.call(self, self, options);
    }

    var plugin = fn.apply(self, params);
    if (typeof plugin === 'function') {
      var fns = self[prop];
      fns.push(plugin);
    }
    return self;
  }

  /**
   * Ensure the `.use` method exists on `val`
   */

  function decorate(val) {
    if (!val.use || !val.run) {
      base(val, opts);
    }
  }

  return app;
};
