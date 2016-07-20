'use strict';

require('mocha');
var assert = require('assert');
var define = require('define-property');
var use = require('./');
var extend = require('extend-shallow');

describe('use', function() {
  it('should export a function', function() {
    assert.strictEqual(typeof use, 'function');
  });

  it('should throw TypeError `app` not a function or object', function() {
    function fixture() {
      use(123);
    }
    assert.throws(fixture, TypeError);
    assert.throws(fixture, /expect `app` be an object or function/);
  });

  it('should throw TypeError if not a function passed to `.use` method', function() {
    function fixture() {
      use({}).use(123);
    }
    assert.throws(fixture, TypeError);
    assert.throws(fixture, /use expects `fn` be a function/);
  });

  it('should allow passing `opts.fn` to merge options from each plugin to app options', function() {
    var limon = {options: {
      foo: 'bar'
    }};
    use(limon, {
      fn: function(app, options) {
        assert.strictEqual(this.options.foo, 'bar');
        this.options = extend(this.options, options);
        this.options.qux = 123;
      }
    });

    limon
      .use(function() {
        assert.strictEqual(this.options.foo, 'bar');
        assert.strictEqual(this.options.xxx, 'yyy');
        assert.strictEqual(this.options.qux, 123);
      }, { xxx: 'yyy' })
      .use(function() {
        assert.strictEqual(this.options.foo, 'bar');
        assert.strictEqual(this.options.xxx, 'yyy');
        assert.strictEqual(this.options.qux, 123);
        assert.strictEqual(this.options.ccc, 'ddd');
      }, { ccc: 'ddd' });
  });

  it('should not extend options if `opts.fn` not given (#3)', function() {
    var limon = {options: {
      foo: 'bar'
    }};
    use(limon);

    limon
      .use(function() {
        assert.strictEqual(this.options.foo, 'bar');
        assert.strictEqual(this.options.xxx, undefined);
        assert.strictEqual(this.options.qux, undefined);
      }, { xxx: 'yyy' })
      .use(function() {
        assert.strictEqual(this.options.foo, 'bar');
        assert.strictEqual(this.options.xxx, undefined);
        assert.strictEqual(this.options.qux, undefined);
        assert.strictEqual(this.options.ccc, undefined);
      }, { ccc: 'ddd' });
  });

  it('should be able to pass `opts.params` for top plugin', function () {
    var limon = { foo: 'bar' };
    use(limon, {
      params: [111, 222, limon]
    });

    // these arguments comes from `opts.params`
    limon.use(function (one, two, app) {
      assert.strictEqual(one, 111);
      assert.strictEqual(two, 222);
      assert.strictEqual(app.foo, 'bar');
      assert.strictEqual(this.foo, 'bar');
      this.one = one

      // these arguments comes from `.run`
      return function (aa, bb, cc) {
        assert.strictEqual(aa, 'aaa');
        assert.strictEqual(bb, 'bbb');
        assert.strictEqual(cc, 333);
        assert.strictEqual(this.foo, 'bar');
        this.aa = aa
      }
    })
    limon.run('aaa', 'bbb', 333);
    assert.strictEqual(limon.one, 111);
    assert.strictEqual(limon.aa, 'aaa');
  });

  it('should decorate "use" onto the given object', function() {
    var app = {};
    use(app);
    assert.strictEqual(typeof app.use, 'function');
  });

  it('should decorate "fns" onto the given object', function() {
    var app = {};
    use(app);
    assert(Array.isArray(app.fns));
  });

  it('should not re-add decorate methods onto the given object', function() {
    var app = {};
    use(app);
    assert(Array.isArray(app.fns));
    assert(app.fns.length === 0);
    app.use(function() {
      return function(ctx) {
        ctx.foo = 'bar';
      };
    });
    assert(app.fns.length === 1);
    use(app);
    assert(app.fns.length === 1);
  });

  it('should allow passing custom property to be used for plugins stack', function() {
    var app = {};
    use(app, { prop: 'plugins' });
    assert.strictEqual(Array.isArray(app.fns), false);
    assert.strictEqual(Array.isArray(app.plugins), true);
    assert(app.plugins.length === 0);

  });

  it('should immediately invoke a plugin function', function() {
    var app = {};
    use(app);
    var called = false;
    app.use(function(ctx) {
      called = true;
    });
    assert(called);
  });

  it('should push returned functions onto `fns`', function() {
    var app = {};
    use(app);
    app.use(function(ctx) {
      return function() {};
    });
    app.use(function(ctx) {
      return function() {};
    });
    app.use(function(ctx) {
      return function() {};
    });
    assert(app.fns.length === 3);
  });

  it('should not call functions from `fns` immediately, only when `.run` is called', function() {
    var app = {};
    var count = 0;
    use(app);
    app.use(function(ctx) {
      count++;
      return function() {
        count++;
      };
    });
    app.use(function(ctx) {
      count++;
      return function() {
        count++;
      };
    });
    app.use(function(ctx) {
      count++
      return function() {
        count++;
      };
    });
    assert.strictEqual(app.fns.length, 3);
    assert.strictEqual(count, 3);
    app.run(123);
    assert.strictEqual(count, 6);
  });

  it.skip('should work with infinite nesting', function() {
    var app = {};
    var count = 0;
    use(app);

    app.use(function (app) {
      count++;
      return function fn (abc) {
        count++;
        return function alpha (abc) {
          count++;
          return function beta (abc) {
            count++;
            return function plugin (abc) {
              count++;
            };
          };
        };
      };
    });
    var foo = {};
    app.run(foo);
    assert.strictEqual(count, 5);
  });
});

describe('.run', function() {
  it('should decorate "run" onto the given object', function() {
    var app = {};
    use(app);
    assert.strictEqual(typeof app.run, 'function');
  });

  it('should return app', function() {
    var app = {};
    assert.strictEqual(typeof use(app), 'object');
  });

  it('should run all plugins on "fns"', function() {
    var app = {};
    use(app);
    app.use(function(ctx) {
      return function(foo) {
        foo.a = 'b';
      }
    });
    app.use(function(ctx) {
      return function(foo) {
        foo.c = 'd';
      }
    });
    app.use(function(ctx) {
      return function(foo) {
        foo.e = 'f';
      }
    });
    var foo = {};
    app.run(foo);
    assert.deepEqual(foo,  { a: 'b', c: 'd', e: 'f' });
  });

  it('should run all plugins on "fns" and decorate ctx', function() {
    var app = {};
    use(app);
    app.use(function(ctx) {
      return function(foo) {
        foo.a = 'b';
      }
    });
    app.use(function(ctx) {
      return function(foo) {
        foo.c = 'd';
      }
    });
    app.use(function(ctx) {
      return function(foo) {
        foo.e = 'f';
      }
    });
    var foo = {};
    app.run(foo);
    assert.deepEqual(foo,  { a: 'b', c: 'd', e: 'f' });
    assert.strictEqual(typeof foo.use, 'function');
    assert.strictEqual(typeof foo.run, 'function');
    assert(Array.isArray(foo.fns));
  });

  it('should run all plugins on "fns" and decorate ctx when .use is defined but .run is not', function() {
    var app = {};
    use(app);
    app.use(function(ctx) {
      return function(foo) {
        foo.a = 'b';
      }
    });
    app.use(function(ctx) {
      return function(foo) {
        foo.c = 'd';
      }
    });
    app.use(function(ctx) {
      return function(foo) {
        foo.e = 'f';
      }
    });
    var foo = {};
    define(foo, 'use', function() {});
    app.run(foo);
    assert.deepEqual(foo,  { a: 'b', c: 'd', e: 'f' });
    assert.strictEqual(typeof foo.use, 'function');
    assert.strictEqual(typeof foo.run, 'function');
    assert(Array.isArray(foo.fns));
  });

  it('should run all plugins on "fns" and decorate ctx when .run is defined but .use is not', function() {
    var app = {};
    use(app);
    app.use(function(ctx) {
      return function(foo) {
        foo.a = 'b';
      }
    });
    app.use(function(ctx) {
      return function(foo) {
        foo.c = 'd';
      }
    });
    app.use(function(ctx) {
      return function(foo) {
        foo.e = 'f';
      }
    });
    var foo = {};
    define(foo, 'run', function() {});
    app.run(foo);
    assert.deepEqual(foo,  { a: 'b', c: 'd', e: 'f' });
    assert.strictEqual(typeof foo.use, 'function');
    assert.strictEqual(typeof foo.run, 'function');
    assert(Array.isArray(foo.fns));
  });

  it('should run all plugins on "fns" and not decorate ctx when .use and .run are already defined', function() {
    var app = {};
    use(app);
    app.use(function(ctx) {
      return function(foo) {
        foo.a = 'b';
      }
    });
    app.use(function(ctx) {
      return function(foo) {
        foo.c = 'd';
      }
    });
    app.use(function(ctx) {
      return function(foo) {
        foo.e = 'f';
      }
    });
    var foo = {};
    define(foo, 'use', function(fn) {
      return fn.call(this, this);
    });
    define(foo, 'run', function() {});
    app.run(foo);
    assert.deepEqual(foo,  { a: 'b', c: 'd', e: 'f' });
    assert.strictEqual(typeof foo.use, 'function');
    assert.strictEqual(typeof foo.run, 'function');
    assert.strictEqual(typeof foo.fns, 'undefined');
  });

  it('should accept different number and type of arguments', function() {
    var app = {};
    use(app);
    app
      .use(function(app) {
        this.a = 'a';
        app.b = 'b';

        // these args comes from `.run`
        return function(str, obj, num) {
          this.str = str;
          app.obj = obj;
          app.num = num;
        }
      })
      .use(function(app) {
        assert.strictEqual(this.a, 'a');
        assert.strictEqual(app.b, 'b');

        assert.strictEqual(this.str, undefined);
        assert.strictEqual(app.str, undefined);

        // these args comes from `.run`
        return function(str, obj, num) {
          assert.strictEqual(this.a, 'a');
          assert.strictEqual(app.b, 'b');

          assert.strictEqual(this.str, 'foo');
          assert.strictEqual(app.str, 'foo');
          assert.deepEqual(app.obj, { bar: 'qux' });

          this.str = str + 'bar';
          this.obj.fez = 444;
          this.num = num - 23;
        }
      });

    app.run('foo', { bar: 'qux' }, 123);
    assert.strictEqual(app.a, 'a');
    assert.strictEqual(app.b, 'b');
    assert.strictEqual(app.str, 'foobar');
    assert.strictEqual(app.num, 100);
    assert.deepEqual(app.obj, { bar: 'qux', fez: 444 });
  });
});
