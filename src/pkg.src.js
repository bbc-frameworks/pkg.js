
var pkg = function () {
    var context = this;

    var promise = (function (exports) {
        // the following is promise.js from the node-promise project

        /* DO NOT MODIFY - node promise here - DO NOT MODIFY */

        return exports;
    })({});

    var Package = function (name) {
        this.name = name;
    };

    var Loader = function () {
        this.paths = [];
        var finished = new promise.Promise();
        finished.resolve(promise);
        this.packages = { promise: { ns: promise, finished: finished }  };
        if (! context.document) {
            this.lib(__dirname + '/fs', 'fs-promise');
        }
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
                /*if (! /^\w+(?:_\w+)*$/.test(prefix)) {
                    throw new Error('invalid namespace prefix "' + prefix + '" passed to pkg.lib');
                }
                */
                var quoted = prefix.replace(/([^\w])/g, '\\$1');
                this.paths.push([
                    new RegExp('^' + prefix + '(?:_|$)'),
                    path,
                    prefix.length
                ]);
            }
        }
    };

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
        this.packages[name].ns = ns;
        if ('finished' in this.packages[name]) {
            this.packages[name].finished.resolve(ns);
        }
    };

    Loader.prototype._initiateBrowserLoad = function (path) {
        var scriptTag = document.createElement('script');
        scriptTag.setAttribute('type', 'text/javascript');
        scriptTag.setAttribute('src', path);
        document.getElementsByTagName('head')[0].appendChild(scriptTag);
    };

    Loader.prototype._initiateLoad = function (path) {
        if (context.document) {
            this._initiateBrowserLoad(path);
        }
        else {
            require.async(path);
        }
    };

    Loader.prototype._nodeLoad = function (name, finished) {
        if (context.document) {
            throw new Error('attempt to load node.js package "' + name + ': in a browser');
        }
        require.async(name, function (err, ns) {
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
    
        if (match) {
            if (! this['_' + match[1] + 'Load']) {
                throw new Error('unknown loader prefix "' + match[1] + ':" in module name "' + name + '"');
            }
            this['_' + match[1] + 'Load'].call(this, match[2], finished);
        }
        else {
            this._initiateLoad(this._path(name));
        }
        this.packages[name] = { finished: finished };
        return finished;
    };

    Loader.prototype.define = function (name) {
        var dependencies = (arguments.length > 2) ? arguments[1] : [],
            code         = (arguments.length > 2) ? arguments[2] : arguments[1],
            loader       = this;
        return this.load(dependencies, function () {
            loader.definePackage(name, code ? code.apply(null, arguments) : null);
        });
    };

    Loader.prototype.load = function (mods, then) {
        var loader = this,
            loaded;
        if (mods instanceof Array) {
            if (mods.length == 0) {
                loaded = new promise.Promise();
                loaded.resolve([]);
            }
            else {
                loaded = promise.all(mods.map(function (name) {
                    return loader.loadPackage(name);
                }));
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

