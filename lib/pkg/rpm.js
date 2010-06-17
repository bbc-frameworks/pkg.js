
pkg.define('pkg_rpm', ['pkg_util', 'spectrum', 'promise', 'fs-promise', 'node:sys'], function (util, Spectrum, promise, fs, sys) {
    var ns = {};

    var Package = ns.Package = function (project) {
        this._project = project;
        this._files = [];
    };

    var counter = 0;

    Package.prototype._createTmpDir = function () {
        if (! this._tmpDir) {
            var rpm = this,
                dir = '/tmp/pkg-' + process.pid + '-' + (counter++);
            this._tmpDir = fs.mkdir(dir, 0777).then(function () {
                rpm.tmpDir = dir;
                return dir;
            });
        }
        return this._tmpDir;
    };

    Package.prototype.params = function () {
        var depends = [];
	var name = this._project.name();
        return {
            'name'        : name,
            'description' : this._project.description(),
            'requires'    : this._project.dependencies().join(', '),
            'files'       : '/usr/share/' + name + '\n' + this._files.join('\n') + '\n',
            'vendor'      : this._project.vendor(),
            'install'     : ''
        };
    };

    var spectrum = new Spectrum(__dirname + '/../../views');
 
    Package.prototype._readProjectConfig = function () {
	return this._project.readConfig();
    };

    Package.prototype._writeSpecFile = function () {
        var rpm = this;
        return spectrum.render('/spec.spv', rpm.params()).then(function (spec) {
            return fs.writeFile(rpm.tmpDir + '/project.spec', spec);
        });
    };

    Package.prototype._createBuildFolders = function () {
        var rpm = this;
        return util.all(
            util.mkdir(rpm.tmpDir + '/BUILD/target/usr/share/' + this._project.name()).then(function (dir) {
                return util.all(
                    util.copy('project.json', dir + '/project.json'),
                    util.copyTreeIfExists('lib',      dir + '/lib',   /[\w-]+\.js$/),
                    util.copyTreeIfExists('src',      dir + '/src',   /\/[\w-]+\.js$/),
                    util.copyTreeIfExists('static',   dir + '/static',   /\/[\w-]+\.\w+$/),
                    util.copyTreeIfExists('testdata', dir + '/testdata',   /\.xml$/),
                    util.copyTreeIfExists('views',    dir + '/views', /[\w-]+\.spv$/),
                    util.copyTreeIfExists('bin',      dir + '/bin',   /\/[\w-]+$/)
                );
            }),
            util.mkdir(rpm.tmpDir + '/RPMS')
        );
    };

    Package.prototype._copyNodeModules = function () {
        var rpm = this;
        return util.mkdir(rpm.tmpDir + '/BUILD/target/usr/share/node/modules').then(function (dir) {
            var nodeModules = rpm._project.nodeModules();
            if (nodeModules.length > 0) {
                return util.all(
                    nodeModules.map(function (mod) {
                        rpm._files.push('/usr/share/node/modules/' + mod + '.js');
                        return util.copy('src/' + mod + '.js', rpm.tmpDir + '/BUILD/target/usr/share/node/modules');
                    })
                );
            }
            else {
                var done = new promise.Promise();
                done.resolve();
                return done;
            }
        });
    };

    Package.prototype._eventParams = function (executable) {
        return {
            description : this._project.description(),
            author      : this._project.vendor(),
            executable  : '/usr/share/' + this._project.name() + '/bin/' + executable
        };
    };

    Package.prototype._addDaemons = function () {
        // TODO
        return;
        var daemons = this._project.daemons(),
            rpm     = this;
        if (daemons.length > 0) {
            return util.all(daemons.map(function (daemon) {
                return spectrum.render('/event.spv', rpm._eventParams(daemon)).then(function (eventScript) {
                    this._files.push('/etc/init.d/' + daemon);
                });
            }));
        }
    };

/*    Package.prototype._createExecutableSymlinks = function () {
        return fs.readdir('bin').then(function (entries) {
            
        });
    };
*/

    Package.prototype._runBuild = function () {
        var build = this._project.build();
        if (build) {
            return util.run(build);
        }
        else {
            var done = new promise.Promise();
            done.resolve();
            return done;
        }
    };

    Package.prototype._createRpm = function () {
        return util.run('rpmbuild', [
            '--define', '_topdir ' + this.tmpDir,
            '--define', 'version ' + this._project.version(),
            '--define', 'release 1',
            '-bb',      this.tmpDir + '/project.spec'
        ]).then(function (res) {
            var match = res.output.match(/Wrote: (\S+\/([^\/]+\.rpm))\s*$/s);
            if (! match) {
                throw new Error('could not extract rpm location from output: ' + res.output);
            }
            return util.copy(match[1], match[2]).then(function () {
                return match[2];
            });
        }, function (res) {
            throw new Error('error running rpmbuild:\n' + res.combined);
        });
    };

    Package.prototype.create = function () {
        var step = util.step;
        return this._createTmpDir()
	    .then(step(this._readProjectConfig, this))
            .then(step(this._runBuild, this))
            .then(step(this._createBuildFolders, this))
            //.then(step(this._createExecutableSymlinks, this))
            .then(step(this._copyNodeModules, this))
            .then(step(this._addDaemons, this))
            .then(step(this._writeSpecFile, this))
            .then(step(this._createRpm, this))
            .then(
                function (filename) {
                    sys.puts('created ' + filename);
                },
                function (err) {
                    sys.puts('could not create rpm: ' + err);
                }
            );
    };

    return ns;
});

