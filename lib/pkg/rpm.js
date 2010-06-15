
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
            sys.debug('creating tmp dir ' + dir);
            this._tmpDir = fs.mkdir(dir, 0777).then(function () {
                sys.debug('setting tmp dir to ' + dir);
                rpm.tmpDir = dir;
                return dir;
            });
        }
        return this._tmpDir;
    };

    Package.prototype.params = function (config) {
        var depends = [];
        for (var i in config.depends) {
            depends.push(i + ' ' + config.depends[i][0] + ' ' + config.depends[i][0]);
        }
        for (var i in config.platformDepends) {
            depends.push(i + ' ' + config.platformDepends[i][0] + ' ' + config.platformDepends[i][0]);
        }
        return {
            'name'        : config.name,
            'description' : config.description,
            'depends'     : depends.join(', '),
            'files'       : '/usr/share/' + config.name + '\n',
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
        sys.debug('creating build folders');
        return util.allOrNothing(promise.all(
            util.mkdir(rpm.tmpDir + '/BUILD/target/usr/share/' + this._project.name()).then(function (dir) {
                return util.allOrNothing(promise.all(
                    util.copy('project.json', dir + '/project.json'),
                    util.ifDirExists('lib', function () {
                        return util.copyTree('lib', dir + '/lib', /\w+\.js$/);
                    }),
                    util.ifDirExists('src', function () {
                        return util.copyTree('src', dir + '/src', /\w+\.js$/);
                    }),
                    util.ifDirExists('views', function () {
                        return util.copyTree('views', dir + '/views', /\w+\.spv$/)
                    }),
                    util.ifDirExists('bin', function () {
                        return util.copyTree('bin', dir + '/bin', /\/\w+$/)
                    })
                ));
            }),
            util.mkdir(rpm.tmpDir + '/RPMS')
        ));
    };

    Package.prototype._createRpm = function () {
        sys.debug('creating rpm...');
        return util.run('rpmbuild', [
            '--define', '_topdir ' + this.tmpDir,
            '--define', 'version ' + this._project.version(),
            '--define', 'release 1',
            '-bb',      this.tmpDir + '/project.spec'
        ]).then(function (res) {
            sys.debug('res is: ' + res.combined);
            return res;
        }, function (res) {
            sys.debug('error running rpmbuild:\n' + res.combined);
        });
    };

    Package.prototype.create = function () {
        var step = util.step;
        return this._createTmpDir()
            .then(step(this._writeSpecFile, this))
            .then(step(this._createBuildFolders, this))
            .then(step(this._createRpm, this));
    };

    return ns;
});
