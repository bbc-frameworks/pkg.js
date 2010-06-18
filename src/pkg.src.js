
var pkg = function () {
    var context = this;

    var promise = (function (exports) {
        // the following is promise.js from the node-promise project

        /* DO NOT MODIFY - node promise here - DO NOT MODIFY */

        return exports;
    })({});

    // taken from https://developer.mozilla.org/En/Core_JavaScript_1.5_Reference/Objects/Array/Map
    function map (fun) {
        var len = this.length >>> 0;
        if (typeof fun != "function") {
            throw new TypeError();
        }
        var res = new Array(len);
        var thisp = arguments[1];
        for (var i = 0; i < len; i++) {
             if (i in this) {
                  res[i] = fun.call(thisp, this[i], i, this);
             }
        }
        return res;
    }

    var Package = function (name) {
        this.name = name;
    };

    var Loader = function () {
        this.paths = [];
        var finished = new promise.Promise();
        finished.resolve(promise);
        this.packages = { promise: { ns: promise, finished: finished }  };
        if (! context.document) {
            this.lib(__dirname.replace(/\/src$/, '') + '/lib', 'pkg', 'fs-promise');
        }
        this._failedLoads = {};
    };

    Loader.prototype.promise = promise;

    if (! context.document) {
        (function () {
            var fromDirs  = __dirname.replace(/^\//, '').split(/\//);
            Loader.prototype._relativePath = function (dir) {
                var toDirs = dir.replace(/^\//, '').split(/\//),
                    result = '',
                    i = 0,
                    l = fromDirs.length;
                for (; i < l; i++) {
                    if (fromDirs[i] != toDirs[i]) {
                        break;
                    }
                }
                var from = i;
                for (; i < l; i++) {
                    result += '../';
                }
                l = toDirs.length;
                i = from;
                for (; i < l; i++) {
                    result += toDirs[i] + '/';
                }
                result = result.replace(/\/$/, '');
                return './' + result;
            };
        })();
    }

    Loader.prototype.lib = function (path) {
        var namespaces = arguments.length - 1;

/*        // TODO handle absolute paths on windows
        if (isNode && urlPrefix.indexOf('/') == 0) {
            urlPrefix = dirPath(fromPath, urlPrefix);
        }
*/

        if (! context.document) {
            if (! /^\//.test(path)) {
                path = process.cwd() + '/' + path;
            }
            path = this._relativePath(path);
        }

        if (namespaces == -1) {
            throw new Error('no path passed to pkg.lib');
        }
        else if (namespaces == 0) {
            this.paths.push([ /^/, path, 0 ]);
        }
        else {
            for (var i = 1; i <= namespaces; i++) {
                var prefix = arguments[i];
                var quoted = prefix.replace(/([^\w])/g, '\\$1');
                this.paths.push([
                    new RegExp('^' + prefix + '(?:_|$)'),
                    path,
                    prefix.length
                ]);
            }
        }
    };

    if (! context.document) {
        Loader.prototype.setupProjectPaths = function (name, root) {
            var loader = this;
            return this.load(['pkg_node']).thenAll(function (node) {
                node.setupNodePaths();
                loader._pathResolver = new node.createPathResolver(loader);
                return loader._pathResolver.setupProjectPaths(name, root);
            });
        };

        Loader.prototype.project = function (name) {
            return this._pathResolver.project(name);
        };

        Loader.prototype.pathResolver = function () {
            return this._pathResolver;
        };

        Loader.prototype.pkgDir = function () {
            return __dirname;
        };
    }

    Loader.prototype._nodePath = function (name) {
        return name;
    };

    Loader.prototype._path = function (name) {
        var matchedChars = -1,
            result;
        for (var i = 0, l = this.paths.length; i < l; i++) {
            if (this.paths[i][0].test(name) && this.paths[i][2] > matchedChars) {
                result = this.paths[i][1];
                matchedChars = this.paths[i][2];
            }
        }
        if (! result) {
            throw new Error("no lib configured for '" + name + "' package");
        }
        return result + '/' + name.replace(/_/g, '/') + (context.document ? '.js' : '');
    };

    Loader.prototype.definePackage = function (name, ns) {
        if (! (name in this.packages)) {
            this.packages[name] = {};
        }
        if (this.packages[name].ns) {
            throw new Error('the package "' + name + '" has already been defined');
        }
        this.packages[name].ns = ns;
        if ('finished' in this.packages[name]) {
            this.packages[name].finished.resolve(ns);
        }
    };

    Loader.prototype._initiateBrowserLoad = function (path, finished) {
        // TODO detect error, reject finished
        var scriptTag = document.createElement('script');
        scriptTag.setAttribute('type', 'text/javascript');
        scriptTag.setAttribute('src', path);
        document.getElementsByTagName('head')[0].appendChild(scriptTag);
    };

    Loader.prototype._initiateLoad = function (path, finished) {
        if (context.document) {
            this._initiateBrowserLoad(path, finished);
        }
        else {
            var called = false;
            require.async(path, function (err) {
                // work around weird node bug
                if (called) {
                    return;
                }
                called = true;
                if (err) {
                    finished.reject(err);
                }
            });
        }
    };

    Loader.prototype._nodeLoad = function (name, finished) {
        if (context.document) {
            throw new Error('attempt to load node.js package "' + name + ': in a browser');
        }
        var called = false;
        require.async(name, function (err, ns) {
            // work around weird node bug
            if (called) {
                return;
            }
            called = true;
            if (err) {
                throw new Error('could not load node package ' + name + ' - ' + err);
            }
            finished.resolve(ns);
        });
    };

    Loader.prototype.loadPackage = function (name) {
        if (name in this.packages) {
            return this.packages[name].finished;
        }

        var match = name.match(/^(\w+):(.+)$/),
            finished  = new promise.Promise();

        if (match && ! this['_' + match[1] + 'Load']) {
            throw new Error('unknown loader prefix "' + match[1] + ':" in module name "' + name + '"');
        }
        this.packages[name] = { finished: finished };
        if (match) {
            this['_' + match[1] + 'Load'].call(this, match[2], finished);
        }
        else {
            this._initiateLoad(this._path(name), finished);
        }
        return finished;
    };

    Loader.prototype.define = function (name) {
        var dependencies = (arguments.length > 2) ? arguments[1] : [],
            code         = (arguments.length > 2) ? arguments[2] : arguments[1],
            loader       = this;
        return this.load(dependencies, function () {
            return loader.definePackage(name, code ? code.apply(null, arguments) : null);
        });
    };

    Loader.prototype.load = function (mods, then) {
        var loader = this,
            loaded;
        if (mods instanceof Array) {
            loaded = new promise.Promise();
            if (mods.length == 0) {
                loaded.resolve([]);
            }
            else {
                promise.all(map.call(mods, function (name) {
                    return loader.loadPackage(name);
                })).then(function (res) {
                    var failed = [], succeeded = [];
                    for (var i = 0, l = res.length; i < l; i++) {
                        if (res[i] instanceof Error) {
                            failed.push(res[i]);
                        }
                        else {
                            succeeded.push(res[i]);
                        }
                    }
                    if (failed.length > 0) {
                        var err = new Error(map.call(failed, function (err) { return err.message; }).join(', '));
                        err.failed = failed;
                        err.succeeded = succeeded;
                        loaded.reject(err);
                    }
                    else {
                        loaded.resolve(res);
                    }
                });
            }
        }
        else {
            loaded = this.loadPackage(mods);
        }
        promise.when(loaded, function (mods) {
            if (! (mods instanceof Array)) {
                if (typeof(mods) == 'undefined') {
                    mods = [];
                }
                else {
                    mods = [mods]
                }
            }
            return then ? then.apply(null, mods) : null;
        });
        return loaded;
    };

    var loader = new Loader();
    if (! loader.__proto) {
        loader.__proto = Loader;
    }

    return loader;
}();

try {
    if (eval('global')) {
        global.pkg = pkg;
        exports.pkg = pkg;
    }
}
catch (e) {}

