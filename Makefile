
VERSION=dev
RELEASE=1

src/pkg.debug.js: src/pkg.src.js ext/node-promise/promise.js
	perl -e 'undef $$/; $$_ = <>; $$promise = <STDIN>; s/\/\* (DO NOT MODIFY).*\1 \*\//$$promise/ && print' src/pkg.src.js < ext/node-promise/promise.js > src/pkg.debug.js

src/pkg.js: src/pkg.debug.js
	java -jar ext/yuicompressor.jar --type js src/pkg.debug.js > src/pkg.js

lib/pkg/node.js: lib/pkg/node.debug.js
	java -jar ext/yuicompressor.jar --type js lib/pkg/node.debug.js > lib/pkg/node.js

lib/fs-promise.js: lib/fs-promise.debug.js
	java -jar ext/yuicompressor.jar --type js lib/fs-promise.js > lib/fs-promise.js

ext/node-promise/promise.js:
	git submodule init && \
	git submodule update

RPMS/noarch/pkg.js-$(VERSION)-$(RELEASE).noarch.rpm: src/pkg.js src/pkg.debug.js lib/pkg/node.js lib/pkg/node.debug.js lib/fs-promise.js lib/fs-promise.debug.js
	mkdir -p {BUILD,RPMS,SRPMS} && \
	rpmbuild --define '_topdir $(CURDIR)' --define 'version $(VERSION)' --define 'release $(RELEASE)' -bb SPECS/pkg.js.spec

dist: RPMS/noarch/pkg.js-$(VERSION)-$(RELEASE).noarch.rpm

clean:
	rm -rf BUILD RPMS SRPMS
