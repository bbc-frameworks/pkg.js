
pkg.define('pkg_cli', ['pkg_node', 'pkg_rpm', 'node:sys'], function (node, rpm, sys) {
    var ns = {};

    var commands = {};

    var Command = function (name, description, callback) {
        commands[name] = this;
        this.name = name;
        this.description = description;
        this.callback = callback;
    };

    function maxCommandNameLength () {
        var r = 0;
        for (var i in commands) {
            if (i.length > r) {
                r = i.length;
            }
        }
        return r;
    }

    function spaces (item, max) {
        var r = '';
        for (var i = item.length; i < max; i++) {
            r += ' ';
        }
        return r;
    }

    new Command(
        'help',
        'get help on pkg commands',
        function () {
            sys.puts('pkg help');
            sys.puts('  usage:');
            sys.puts('    pkg subcommand [ ARGS ]');
            sys.puts('  subcommands:');
            var maxLength = maxCommandNameLength();
            for (var i in commands) {
                sys.puts('    ' + i + spaces(i, maxLength) + ' - ' + commands[i].description);
            }
        }
    );

    new Command(
        'rpm',
        'create an rpm',
        function (version, release) {
            if (! release) {
                release = 1;
            }
            var rpmPackage = new rpm.Package(new node.Project(pkg.pathResolver(), undefined, process.cwd()));
            rpmPackage.create();
        }
    );

    Command.prototype.run = function (args, env) {
        this.callback(args, env);
    };

    ns.run = function (args, env) {
        var command = args.shift() || 'help';
        if (command in commands) {
            commands[command].run(args, env);
        }
        else {
            sys.puts('unknown command ' + command);
        }
    };

    return ns;
});


