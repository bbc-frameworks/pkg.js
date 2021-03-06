
pkg.define('pkg_util', ['promise', 'fs-promise', 'node:child_process', 'node:sys'], function (promise, fs, child_process, sys) {
    var ns = {};

    ns.run = function (command, args) {
        var proc = child_process.spawn(command, args),
            output = '',
            errors = '',
            combined = '',
            exitStatus,
            done = new promise.Promise();

        proc.stdout.addListener('data', function (data) {
            output += data;
            combined += data;
        });

        proc.stderr.addListener('data', function (data) {
            errors += data;
            combined += data;
        });

        proc.addListener('exit', function (status) {
            done[status === 0 ? 'resolve' : 'reject']({
                status:   status,
                output:   output,
                errors:   errors,
                combined: combined
            });
        });

        return done;
    };

    ns.step = function (func, invocant) {
        return function () {
            return func.apply(invocant, arguments);
        };
    };

    ns.stepAll = function (funcs, invocant) {
        return function () {
            var args = arguments;
            return ns.all(
                funcs.map(function (func) {
                    return func.apply(invocant, args);
                })
            );
        };
    };

    // TODO shouldn't node-promise's all do this by default
    ns.all = function () {
        var done = new promise.Promise();
        return promise.all.apply(promise, arguments).then(function (res) {
            for (var i = 0, l = res.length; i < l; i++) {
                if (res[i] && (res[i] instanceof Error)) {
                    return done.reject(res[i]);
                }
            }
            done.resolve(res);
        });
        return done;        
    };

    ns.copy = function (from, to) {
        return ns.run('cp', [from, to]);
        // for some reason this craps out on rpms (maybe files of a certain size?)
/*
        var done = new promise.Promise();
        fs.readFile(from).then(
            function (contents) {
                return fs.writeFile(to, contents).then(
                    function () {
                        done.resolve();
                    },
                    function (err) {
                        done.reject(new Error('could not write file ' + to + ': ' + err));
                    }
                );
            },
            function (err) {
                done.reject(new Error('could not read ' + from + ': ' + err));
            }
        );
        return done;
*/
    };

    var exclude = /(?:^|\/)\.(?:svn|git)(?:$|\/)/;

    ns.copyTree = function (from, to, include) {
        var recurse = arguments.callee;
        return fs.stat(from).then(function (stats) {
            if (stats.isFile()) {
                if (! include || include.test(to)) {
                    return ns.copy(from, to);
                }
            }
            else {
                if (! exclude.test(from)) {
                    return fs.mkdir(to, 0777).then(function () {
                        return fs.readdir(from).then(function (items) {
                            return ns.all(items.map(function (item) {
                                return recurse(from + '/' + item, to + '/' + item, include);
                            }));
                        });
                    });
                }
            }
        });
    };

    function mkdir (dir) {
        var done = new promise.Promise();
        fs.stat(dir).then(
            function () {
                done.resolve(dir);
            },
            function () {
                fs.mkdir(dir, 0777).then(
                    function () {
                        done.resolve(dir);
                    },
                    function (err) {
                        done.reject(err);
                    }
                );
            }
        );
        return done;
    }

    ns.copyTreeIfExists = function (from, to, include) {
        return ns.ifDirExists(from, function () {
            return ns.copyTree(from, to, include);
        });
    };

    function mkdirs (base, dirs) {
        var dir = base + '/' + dirs.shift();
        return mkdir(dir).then(function () {
            if (dirs.length > 0) {
                return mkdirs(dir, dirs);
            }
            return dir;
        });
    }

    ns.mkdir = function (dir) {
        var dirs = dir.split(/\//),
            base = dirs.shift();
        return mkdirs(base, dirs);
    };

    ns.ifDirExists = function (dir, then) {
        var done = new promise.Promise();
        fs.stat(dir).then(
            function () {
                var res = then();
                if (res && res.then) {
                    res.then(function (res) {
                        done.resolve(res);
                    });
                }
                else {
                    done.resolve(res);
                }
            },
            function () {
                done.resolve();
            }
        );
        return done;
    };

    return ns;
});
