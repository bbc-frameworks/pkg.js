
pkg.define('pkg_node', ['fs-promise', 'promise'], function (fs, promise) {
    var ns = {};

    ns.setupNodePaths = function () {
        require.paths.push('/usr/lib/node/modules');
        require.paths.push('/usr/share/node/modules');
    }

    var Project = function (pathResolver, name, root) {
        this._name = name;
        this._pathResolver = pathResolver;
        this._root = root;
    };

    Project.prototype.addPaths = function () {
        var ns = this._config.libraryNamespace || this._config.name;
        if (! ns) {
            throw new Error('no "name" or "librayNamespace" property in ' + this._root + '/project.json');
        }
        this._pathResolver.loader.lib(this.libPath(), ns);
    };

    Project.prototype._readConfig = function () {
        var filename = this._root + '/project.json',
            project  = this;
        return fs.readFile(filename, 'utf8').then(
            function (config) {
                try {
                    config = JSON.parse(config);
                }
                catch (e) {
                    throw new Error('could not parse JSON in "' + filename + '": ' + e);
                }
                return project._config = config;
            },
            function (err) {
                throw new Error('could not read project config file: ' + err.message);
            }
        );
    };

    Project.prototype.libPath = function () {
        return this._root + '/lib';
    };

    Project.prototype.rootDir = function () {
        return this._root;
    };

    Project.prototype._setupDependencies = function (done) {
        var project = this;
        return this._readConfig().then(function (config) {
            project.addPaths();
            var depends = [];
            for (var i in config.depends) {
                depends.push(i);
            }
            return promise.all(depends.map(function (projectName) {
                return project._pathResolver.setupProjectPaths(projectName);
            })).then(function (res) {
                for (var i = 0, l = res.length; i < l; i++) {
                    if (res[i] instanceof Error) {
                        return done.reject(res[i]);
                    }
                }
                done.resolve(res);
            });
        });
    };

    Project.prototype.setupPaths = function () {
        if (this._pathsSetup) {
            return this._pathsSetup;
        }
        var pathsSetup = this._pathsSetup = new promise.Promise();
        if (! this._root) {
            var project = this;
            return this._pathResolver.getProjectRoot(this._name).then(function (root) {
                project._root = root;
                return project._setupDependencies(pathsSetup);
            });
        }
        this._setupDependencies(pathsSetup);
        return this._pathsSetup;
    };

    var PathResolver = function (loader, installedRoot, workspaceRoot) {
        this.loader = loader;
        this.installedRoot = installedRoot;
        this.workspaceRoot = workspaceRoot;
        this._projects = {};
    };

    PathResolver.prototype.getInstalledProjectRoot = function (project) {
        var path = this.installedRoot + '/' + project;
        return fs.stat(path).then(
            function (stats) {
                return path;
            },
            function (err) {
                throw new Error('could not find project "' + project + '": ' + err);
            }
        );
    };

    PathResolver.prototype.getProjectRoot = function (project) {
        if (! this.workspaceRoot) {
            return this.getInstalledProjectRoot(project);
        }

        var done     = new promise.Promise(),
            resolver = this,
            path     = this.workspaceRoot + '/' + project;
 
       fs.stat(path).then(
            function (stats) {
                return done.resolve(path);
            },
            function (err) {
                resolver.getInstalledProjectRoot(project).then(function (path) {
                    done.resolve(path);
                });
            }
        );
 
        return done;
    };

    PathResolver.prototype.project = function (name) {
        return this._projects[name];
    };

    PathResolver.prototype.setupProjectPaths = function (name, root) {
        if (this._projects[name]) {
            return;
        }
        var project = this._projects[name] = new Project(this, name, root);
        return project.setupPaths();
    };

    ns.createPathResolver = function (loader, installedRoot, workspaceRoot) {
        return new PathResolver(
            loader,
            installedRoot || '/usr/share',
            workspaceRoot || process.env.PKG_WORKSPACE
        );
    };

    return ns;
});

