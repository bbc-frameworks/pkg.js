
// this package is based on fs-promise, which is part of the node-promise project by Kris Zyp (http://github.com/kriszyp/node-promise), which is licensed under the
// MIT license. See the node-promise readme file under the ext folder of this project.

pkg.define('fs-promise', ['promise', 'node:fs'], function (promise, fs) {
    var ns = {};

    // convert all the non-sync functions
    for (var i in fs) {
      if (!(i.match(/Sync$/))) {
        ns[i] = promise.convertNodeAsyncFunction(fs[i]);
      }
    }

    // convert the functions that don't have a declared callback
    ns.writeFile = promise.convertNodeAsyncFunction(fs.writeFile, true);
    ns.readFile = promise.convertNodeAsyncFunction(fs.readFile, true);

    return ns;
});


