
VERSION=dev
BUILD=1

src/pkg.js: src/pkg.src.js ext/node-promise/promise.js
	perl -e 'undef $$/; $$_ = <>; $$promise = <STDIN>; s/\/\* (DO NOT MODIFY).*\1 \*\//$$promise/ && print' src/pkg.src.js < ext/node-promise/promise.js > src/pkg.js

ext/node-promise/promise.js:
	git submodule init && \
	git submodule update

RPMS/noarch/pkg.js-$(VERSION)-$(BUILD).noarch.rpm: src/pkg.js src/fs/fs-promise.js
	mkdir -p {BUILD,RPMS,SRPMS} && \
	mkdir -p BUILD/usr/share/pkg.js/fs
	cp src/pkg.js BUILD/usr/share/pkg.js/ && \
	cp src/fs/fs-promise.js BUILD/usr/share/pkg.js/fs/ && \
	rpmbuild --define '_topdir $(CURDIR)' --define 'version $(VERSION)' -bb SPECS/pkg.js.spec

dist: RPMS/noarch/pkg.js-$(VERSION)-$(BUILD).noarch.rpm

clean:
	rm -rf BUILD RPMS filelist
