#%global debug_package %{nil}

Name: pkg.js
Version: %{version}
Release: %{release}
Group: Development/Languages/Other
Distribution: BBC
Packager: BBC OTG Frameworks Team
Vendor: BBC Future Media & Technology, Online Technology Group
License: Copyright 2010 British Broadcasting Corporation
Summary: Pkg.js
URL: https://github.com/bbc-frameworks/pkg.js
Requires: node.js >= 0.1.97
Conflicts: none
BuildRoot: %{_topdir}/BUILD/root
BuildArch: noarch

%description
Pkg.js - JavaScript package system

%install
mkdir -p %{buildroot}/usr/share/pkg.js/lib/pkg
cp %{_topdir}/src/pkg{,.debug}.js %{buildroot}/usr/share/pkg.js/
cp %{_topdir}/lib/fs-promise{,.debug}.js %{buildroot}/usr/share/pkg.js/lib/
cp %{_topdir}/lib/pkg/node{,.debug}.js %{buildroot}/usr/share/pkg.js/lib/pkg/

%files
%defattr(-,root,root)
/usr/share/pkg.js/pkg.js
/usr/share/pkg.js/pkg.debug.js
/usr/share/pkg.js/lib/pkg/node.js
/usr/share/pkg.js/lib/pkg/node.debug.js
/usr/share/pkg.js/lib/fs-promise.js
/usr/share/pkg.js/lib/fs-promise.debug.js

