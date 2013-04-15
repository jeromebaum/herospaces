(function (root, factory) {
  if (typeof exports === "object" && exports) {
    module.exports = factory(); // CommonJS
  } else if (typeof define === "function" && define.amd) {
    define(factory); // AMD (RequireJS and family)
  } else {
    root.HeroClient = factory(); // Browser <script>
  }
}(this, (function () {

    var exports = {};

    exports.name = 'HeroClient';
    exports.version = '0.2.0';

    /* Utility methods {{{ */
    function doRequest (method, url, data, cb) {
        function useXhr (xhr) {
            xhr.onreadystatechange = function onXHRResponse () {
                if (xhr.readyState != 4) { return; };
                var err = null;
                var code = xhr.status;
                if (code < 200 || code >= 400) {
                    err = new Error(code);
                };
                async(cb, [err, xhr.responseText, xhr]);
            };
            xhr.open(method, url, /* async: */ true);
            xhr.send(data);
        };
        var global = (function () { return this; })();
        if (global.XMLHttpRequest) {
            useXhr(new XMLHttpRequest());
        } else if (global.ActiveXObject) {
            useXhr(new ActiveXObject("Msxml2.XMLHTTP"));
        } else {
            var http = require('http');
            var urlM = require('url');
            var options = urlM.parse(url);
            options.method = method;
            var req = http.request(options, function handle (res) {
                var err = null;
                var code = res.statusCode;
                if (code < 200 || code >= 400) {
                    err = new Error(code);
                };
                var resData = '';
                res.on('data', function readData (chunk) {
                    resData += chunk;
                });
                res.on('end', function doCallback () {
                    async(cb, [err, resData, res]);
                });
            });
            req.on('error', function (err) { cb(err); });
            if (data) {
                req.write(data);
            };
            req.end();
        };
    };

    function join (base, name) {
        var sep = (base && name) ? '/' : '';
        return base + sep + name;
    };

    function async (cb, args) {
        function doCall () {
            cb.apply(null, args);
        };
        setTimeout(doCall, 0);
    };

    function forEach (obj, cb) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                cb(key, obj[key]);
            };
        };
    };

    function map (obj, cb) {
        var results = [];
        forEach(obj, function each (i, value) {
            results.push(cb(value));
        });
        return results;
    };

    function max (list, cmp, cb) {
        if (list.length === 0) {
            throw new Error("Need at least one value for max()");
        };
        var max = list[0];
        forEach(list, function each (i, value) {
            if (cmp(max, value) < 0) {
                max = value;
            };
        });
        return max;
    };
    /* }}} */
    /* File interface {{{ */
    function get (fileurl, cb) {
        doRequest('GET', fileurl, null, cb);
    };
    exports.get = get;

    function put (fileurl, content, cb) {
        doRequest('PUT', fileurl, content, cb);
    };
    exports.put = put;

    function ls (dirurl, cb) {
        function handleContent (err, content) {
            if (err) { cb(err); return; };
            var info = JSON.parse(content);
            async(cb, [null, info]);
        };
        doRequest('GET', dirurl + '?&listing=1&', null, handleContent);
    };
    exports.ls = ls;

    function rawFind (dirurl, prefix, cb, doneCb) {
        function handleLs (err, ls) {
            if (err) { cb(err); return; };
            if (ls.files) {
                forEach(ls.files, function handleFile (i, file) {
                    var relName = join(prefix, file);
                    async(cb, [null, relName, 'file']);
                });
            };
            var branchCount = 0;
            function handleDone () {
                branchCount--;
                if (branchCount === 0) {
                    async(doneCb, []);
                };
            };
            if (ls.dirs && ls.dirs.length > 0) {
                branchCount += ls.dirs.length;
                forEach(ls.dirs, function handleDir (i, dir) {
                    var relName = join(prefix, dir);
                    var absName = join(dirurl, dir);
                    async(cb, [null, relName, 'dir']);
                    async(rawFind, [absName, relName, cb, handleDone]);
                });
            } else {
                branchCount++;
                handleDone();
            };
        };
        ls(dirurl, handleLs);
    };

    function find (dirurl, cb) {
        rawFind(dirurl, '', cb, function fullyDone () {
            async(cb, [null, null, 'done']);
        });
    };
    exports.find = find;

    function mkdir (dirurl, cb) {
        doRequest('POST', dirurl, null, cb);
    };
    exports.mkdir = mkdir;
    /* }}} */
    /* Package repository client {{{ */
    /* Usage examples:
     *
     *     repository.atHeroSpaces('amber').package('foo').
     *         version(1, 2, 3).get('code.js', function (err, data) { ... });
     */
    var repository = (function () {
        function packageVersion (package, major, minor, patch) {
            var that = {};

            var versionString = [major, minor, patch].join('.');
            var packageUrl = package.url();
            var sep = (packageUrl.slice(packageUrl.length-1) === '/') ?
                '' : '/';
            var versionUrl = packageUrl + sep + versionString;

            that.major = function () { return major; };
            that.minor = function () { return minor; };
            that.patch = function () { return patch; };
            that.url = function () { return versionUrl; };

            that.cmp = function (other) {
                if (that.major < other.major) { return -1; };
                if (that.major > other.major) { return  1; };
                if (that.minor < other.minor) { return -1; };
                if (that.minor > other.minor) { return  1; };
                if (that.patch < other.patch) { return -1; };
                if (that.patch > other.patch) { return  1; };
                return 0;
            };
            that.create = function (cb) {
                mkdir(versionUrl + '?&init=1&', cb);
            };
            that.freeze = function (cb) {
                var freezeOptions = {keys: {
                    get: 0,
                    put: [], // No PUT e.g. on _options.
                    ls: 0,
                    admin: 0, // Allow reads of _options. PUT disabled above.
                    mkdir: []
                }};
                var freezeString = JSON.stringify(freezeOptions);
                put(versionUrl + '/_options', freezeString, cb);
            };
            that.put = function (path, data, cb) {
                put(versionUrl + '/' + path, data, cb);
            };
            that.get = function (path, cb) {
                get(versionUrl + '/' + path, cb);
            };

            return that;
        };

        function package (repository, name) {
            var that = {};

            var repoRoot = repository.url();
            var sep = (repoRoot.slice(repoRoot.length-1) === '/') ? '' : '/';
            var packageUrl = repoRoot + sep + name;

            function versionFromString (versionString) {
                var parts = versionString.split('.');
                if (parts.length !== 3) {
                    throw new Error("A version should have three parts");
                };
                var numbers = map(parts, parseInt);
                var major = numbers[0];
                var minor = numbers[1];
                var patch = numbers[2];
                return packageVersion(that, major, minor, patch);
            };

            that.url = function () { return packageUrl; };

            that.version = function (major, minor, patch) {
                return packageVersion(that, major, minor, patch);
            };
            that.create = function (cb) {
                mkdir(packageUrl + '?&init=1&', cb);
            };
            that.allVersions = function (cb) {
                ls(packageUrl, function handleInfo (err, info) {
                    if (err) { cb(err); return; };
                    var versionStrings = info.dirs || [];
                    var versions = map(versionStrings, versionFromString);
                    cb(null, versions);
                });
            };
            that.latestVersion = function (cb) {
                that.allVersions(function handleVersions (err, versions) {
                    if (err) { cb(err); return; };
                    var maxVersion = max(versions, function cmp (a, b) {
                        return a.cmp(b);
                    });
                    cb(null, maxVersion);
                });
            };

            return that;
        };

        function repository (url) {
            var that = {};

            that.url = function () { return url; };

            that.package = function (name) {
                return package(that, name);
            };

            return that;
        };

        function repositoryFactory () {
            var that = {};

            that.atUrl = function (url) {
                return repository(url);
            };

            that.atHeroSpaces = function (area) {
                return repository('http://www.herospaces.com/repo/' + area);
            };
            that.atHeroSpace = that.atHeroSpaces; // Backwards-compatibility.

            return that;
        };

        return repositoryFactory();
    })();
    exports.repository = repository;
    /* }}} */

    return exports;
})));
/* vim600: sw=4 ts=4 fdm=marker
 * vim<600: sw=4 ts=4
 */
