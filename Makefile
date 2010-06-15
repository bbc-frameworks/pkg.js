
src/pkg.js: src/pkg.src.js ext/node-promise/promise.js
	perl -e 'undef $$/; $$_ = <>; $$promise = <STDIN>; s/\/\* (DO NOT MODIFY).*\1 \*\//$$promise/ && print' src/pkg.src.js < ext/node-promise/promise.js > src/pkg.js

ext/node-promise/promise.js:
	git submodule init && \
	git submodule update

clean:
	rm -rf src/pkg.js
