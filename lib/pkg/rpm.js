
pkg.define('pkg_rpm', ['pkg_util', 'spectrum', 'promise', 'fs-promise', 'node:sys'], function (util, Spectrum, promise, fs, sys) {
    var ns = {};

    var Package = ns.Package = function (project) {
        this._project = project;
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

    Package.prototype.params = function (config) {
        var depends = [];
        for (var i in config.depends) {
            depends.push(i + ' ' + config.depends[i][0] + ' ' + config.depends[i][1]);
        }
        for (var i in config.platformDepends) {
            depends.push(i + ' ' + config.platformDepends[i][0] + ' ' + config.platformDepends[i][1]);
        }
        return {
            'name'        : config.name,
            'description' : config.description,
            'requires'    : depends.join(', '),
            'files'       : '/usr/share/' + config.name + '\n',
            'vendor'      : config.vendor,
            'install'     : ''
        };
    };

    var spectrum = new Spectrum(__dirname + '/../../views');

    Package.prototype._writeSpecFile = function () {
        var rpm = this;
        return this._project.readConfig().then(function (config) {
            return spectrum.render('/spec.spv', rpm.params(config)).then(function (spec) {
                return fs.writeFile(rpm.tmpDir + '/project.spec', spec);
            });
        });
    };

    Package.prototype._createBuildFolders = function () {
        var rpm = this;
        return util.allOrNothing(promise.all(
            util.mkdir(rpm.tmpDir + '/BUILD/target/usr/share/' + this._project.name()).then(function (dir) {
                return util.allOrNothing(promise.all(
                    util.copy('project.json', dir + '/project.json'),
                    util.copyTreeIfExists('lib',   dir + '/lib',   /\w+\.js$/),
                    util.copyTreeIfExists('views', dir + '/views', /\w+\.spv$/),
                    util.copyTreeIfExists('bin',   dir + '/bin',   /\/\w+$/)
                ));
            }),
            util.mkdir(rpm.tmpDir + '/RPMS')
        ));
    };
/*
    Package.prototype._copyNodeModules = function () {
        return util.mkdir(rpm.tmpDir + '/BUILD/target/usr/share/node/modules').then(function (dir) {
            var nodeModules = rpm.nodeModules();
            if (nodeModules.length > 0) {
                return util.allOrNothing(promise.all(
                    nodeModules.map(function (mod) {
                        return util.copy('src/' + mod + '.js', rpm.tmpDir + '/BUILD/target/usr/share/node/modules');
                    })
                ));
            }
            else {
                return (new promise.Promise()).resolve();
            }
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
            .then(step(this._writeSpecFile, this))
            .then(step(this._runBuild, this))
            .then(step(this._createBuildFolders, this))
//            .then(step(this._copyNodeModules, this))
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

