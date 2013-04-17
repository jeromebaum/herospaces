/* ```                                                                      */
/* <!-- }}} -->                                                             */
/*                                                                          */
/* Module definition                                                        */
/* ----                                                                     */
/*                                                                          */
/* <!-- {{{ -->                                                             */
/* ```javascript                                                            */
/*                                                                          */
/* <*>=                                                                     */
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

    /* HeroSpaces Client                                                        */
    /* ====                                                                     */
    /*                                                                          */
    /* This is the HeroSpaces client library in JavaScript. You can use it to   */
    /* interact with the HeroSpaces.com website at http://www.herospaces.com or */
    /* with any compatible web service.                                         */
    /*                                                                          */
    /* ```javascript                                                            */
    /*                                                                          */
    /* <Library name and version>=                                              */
    exports.name = 'HeroClient';
    exports.version = '0.2.1';
    /* ```                                                                      */
    /*                                                                          */
    /* Utility methods                                                          */
    /* ----                                                                     */
    /*                                                                          */
    /* We need various functionality to support our library that isn't offered  */
    /* in plain JavaScript. Instead of importing bulky libraries we create a    */
    /* few lightweight functions by hand.                                       */
    /*                                                                          */
    /* These methods are not exported.                                          */
    /*                                                                          */
    /* <!-- {{{ -->                                                            */
    /* ```js                                                                    */
    /*                                                                          */
    /* <Utility methods>=                                                       */

    /* ```                                                                      */
    /* <!-- }}} -->                                                             */
    /*                                                                          */
    /* ### Utility: doRequest                                                   */
    /*                                                                          */
    /* If we can make our code runnable both in a browser and inside Node.js    */
    /* then that increases its value a lot. So let's abstract away the details  */
    /* of making a HTTP request in a function `doRequest` that tries to use an  */
    /* `XMLHttpRequest` and falls back on node's `http` and `url` modules.      */
    /* While we're at it we can handle IE's `ActiveXObject` quirkiness.         */
    /*                                                                          */
    /* <!-- {{{ -->                                                            */
    /* ```js                                                                    */
    /*                                                                          */
    /* <Utility: doRequest>=                                                    */
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
    /* ```                                                                      */
    /* <!-- }}} -->                                                             */
    /*                                                                          */
    /* ### Utility: join                                                        */
    /*                                                                          */
    /* We sometimes base path and a file/directory name. Now say we want to     */
    /* join these together. But sometimes the base path will be falsy. The same */
    /* goes for the name. So we only want to add a separator (`/`) if both are  */
    /* true-ish. That's what `join` does.                                       */
    /*                                                                          */
    /* <!-- {{{ -->                                                            */
    /* ```js                                                                    */
    /*                                                                          */
    /* <Utility: join>=                                                         */
    function join (base, name) {
        var sep = (base && name) ? '/' : '';
        return base + sep + name;
    };
    /* ```                                                                      */
    /* <!-- }}} -->                                                             */
    /*                                                                          */
    /* ### Utility: async                                                       */
    /*                                                                          */
    /* We sometimes want to run several callbacks in succession. Instead of     */
    /* calling each one in turn and waiting for it to return we can also run it */
    /* asynchronously. As a nice side effect this will stop any errors from     */
    /* bubbling up into our code. We simply use `setTimeout` which works in     */
    /* Node.js and in the browser.                                              */
    /*                                                                          */
    /* <!-- {{{ -->                                                            */
    /* ```js                                                                    */
    /*                                                                          */
    /* <Utility: async>=                                                        */
    function async (cb, args) {
        function doCall () {
            cb.apply(null, args);
        };
        setTimeout(doCall, 0);
    };
    /* ```                                                                      */
    /* <!-- }}} -->                                                             */
    /*                                                                          */
    /* ### Utility: array handling                                              */
    /*                                                                          */
    /* Browsers do not reliably provide a `forEach` on arrays. So we provide    */
    /* our own. Note that we shouldn't modify `Array.prototype`.                */
    /*                                                                          */
    /* We also provide a `map` function.                                        */
    /*                                                                          */
    /* <!-- {{{ -->                                                            */
    /* ```js                                                                    */
    /*                                                                          */
    /* <Utility: array handling>=                                               */
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
    /* ```                                                                      */
    /* <!-- }}} -->                                                             */
    /*                                                                          */
    /* ### Utility: max                                                         */
    /*                                                                          */
    /* When dealing with an array or ordered or partially ordered objects that  */
    /* aren't `Number`s we cannot use `Math.max` but may want to find the       */
    /* maximum object. For this we can pass in a `cmp` function that is given   */
    /* two objects. The output should follow these rules:                       */
    /*                                                                          */
    /*  * `cmp(a, b) < 0` iff `a < b`                                           */
    /*  * `cmp(a, b) > 0` iff `a > b`                                           */
    /*  * `cmp(a, b) == 0` otherwise                                            */
    /*                                                                          */
    /* Note that `cmp(a, b) == 0` does not imply `a == b`. This accounts for    */
    /* partially ordered sets.                                                  */
    /*                                                                          */
    /* <!-- {{{ -->                                                            */
    /* ```js                                                                    */
    /*                                                                          */
    /* <Utility: max>=                                                          */
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
    /* ```                                                                      */
    /* <!-- }}} -->                                                             */
    /*                                                                          */
    /* File interface                                                           */
    /* ----                                                                     */
    /*                                                                          */
    /* We define a simple file level interface that you can use to upload and   */
    /* download files as well as manipulate directories.                        */
    /*                                                                          */
    /* <!-- {{{ -->                                                             */
    /* ```javascript                                                            */
    /*                                                                          */
    /* <File interface>=                                                        */

    /* ```                                                                      */
    /* <!-- }}} -->                                                             */
    /*                                                                          */
    /* ### File interface: get                                                  */
    /*                                                                          */
    /* To download a file call `HeroClient.get('http://...', cb)`. We will call */
    /* the callback with two arguments `error` and `data`. `error` will be      */
    /* falsy if the request succeeded and set to error information otherwise.   */
    /* `data` will have the contents of the file.                               */
    /*                                                                          */
    /* Here is an example of how you could call this:                           */
    /*                                                                          */
    /* ```js                                                                    */
    /* HeroClient.get('http://www.herospaces.com/', function (error, data) {    */
    /*     if (error) {                                                         */
    /*         console.error('Error: ' + error);                                */
    /*         return;                                                          */
    /*     }                                                                    */
    /*     console.log(data);                                                   */
    /* });                                                                      */
    /* ```                                                                      */
    /*                                                                          */
    /* <!-- {{{ -->                                                            */
    /* ```js                                                                    */
    /*                                                                          */
    /* <File interface: get>=                                                   */
    function get (fileurl, cb) {
        doRequest('GET', fileurl, null, cb);
    };
    exports.get = get;
    /* ```                                                                      */
    /* <!-- }}} -->                                                             */
    /*                                                                          */
    /* ### File interface: put                                                  */
    /*                                                                          */
    /* To upload a file call `HeroClient.put('http://...', data, cb)`. We will  */
    /* create the file if necessary and upload the data into it. If the file    */
    /* exists we will replace its contents. We will call the callback with a    */
    /* single argument `error`. `error` will be falsy if the request succeeded  */
    /* and set to error information otherwise.                                  */
    /*                                                                          */
    /* Here is an example of how you could call this:                           */
    /*                                                                          */
    /* ```js                                                                    */
    /* var url = 'http://www.herospaces.com/spaces/example/test.txt';           */
    /*                                                                          */
    /* HeroClient.put(url, 'world', function (error) {                          */
    /*     if (error) {                                                         */
    /*         console.error('Error: ' + error);                                */
    /*         return;                                                          */
    /*     }                                                                    */
    /*     HeroClient.get(url, function (error, data) {                         */
    /*         if (error) {                                                     */
    /*             console.error('Error: ' + error);                            */
    /*             return;                                                      */
    /*         }                                                                */
    /*         // Will output: Hello, world!                                    */
    /*         console.log('Hello, ' + data + '!');                             */
    /*     });                                                                  */
    /* });                                                                      */
    /* ```                                                                      */
    /*                                                                          */
    /* <!-- {{{ -->                                                            */
    /* ```js                                                                    */
    /*                                                                          */
    /* <File interface: put>=                                                   */
    function put (fileurl, content, cb) {
        doRequest('PUT', fileurl, content, cb);
    };
    exports.put = put;
    /* ```                                                                      */
    /* <!-- }}} -->                                                             */
    /*                                                                          */
    /* ### File interface: ls                                                   */
    /*                                                                          */
    /* You can list directories by calling `HeroClient.ls('http://...', cb)`.   */
    /* We will call the callback with two arguments `error` and `info`. `error` */
    /* behaves as with `get` and `put`. `info` is a dictionary with two keys    */
    /* `files` and `dirs` which are arrays containing a list of file names and  */
    /* directory names.                                                         */
    /*                                                                          */
    /* Here are examples for what `info` could look like:                       */
    /*                                                                          */
    /* ```js                                                                    */
    /* {"files":["_options"],"dirs":["foo"]}                                    */
    /*                                                                          */
    /* {"files":["_options"],"dirs":[]} // No sub-directories.                  */
    /*                                                                          */
    /* {"files":[],"dirs":[]} // Empty directory.                               */
    /* ```                                                                      */
    /*                                                                          */
    /* Here is an example of how you could call this:                           */
    /*                                                                          */
    /* ```js                                                                    */
    /* var url = 'http://www.herospaces.com/templates/';                        */
    /*                                                                          */
    /* HeroClient.ls(url, function (error, info) {                              */
    /*     if (error) {                                                         */
    /*         console.error('Error: ' + error);                                */
    /*         return;                                                          */
    /*     }                                                                    */
    /*     console.log('Directories:\n' + info.dirs.join('\n'));                */
    /* });                                                                      */
    /* ```                                                                      */
    /*                                                                          */
    /* <!-- {{{ -->                                                            */
    /* ```js                                                                    */
    /*                                                                          */
    /* <File interface: ls>=                                                    */
    function ls (dirurl, cb) {
        function handleContent (err, content) {
            if (err) { cb(err); return; };
            var info = JSON.parse(content);
            async(cb, [null, info]);
        };
        doRequest('GET', dirurl + '?&listing=1&', null, handleContent);
    };
    exports.ls = ls;
    /* ```                                                                      */
    /* <!-- }}} -->                                                             */
    /*                                                                          */
    /* ### File interface: find                                                 */
    /*                                                                          */
    /* If you want to handle all sub-directories of a root directory and all    */
    /* the files in all those sub-directories then using `HeroClient.ls` is     */
    /* needlessly tedious. So we provide a utility function                     */
    /* `HeroClient.find('http://...', cb)`. We will call the callback many      */
    /* times with three arguments `error`, `name` and `type`. `error` behaves   */
    /* as with `get` and `put`. `name` is a file or directory name relative to  */
    /* the root you provided. `type` is one of `'file', 'dir', 'done'`. We send */
    /* `'done'` last. `name` is unspecified when `type == 'done'`.              */
    /*                                                                          */
    /* <!-- {{{ -->                                                            */
    /* ```js                                                                    */
    /*                                                                          */
    /* <File interface: find>=                                                  */
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
    /* ```                                                                      */
    /* <!-- }}} -->                                                             */
    /*                                                                          */
    /* ### File interface: mkdir                                                */
    /*                                                                          */
    /* You can create new directories by calling                                */
    /* `HeroClient.mkdir('http://...', cb)`. We will call the callback with a   */
    /* single argument `error` that behaves as with `get` and `put`.            */
    /*                                                                          */
    /* If you append a querystring parameter `?init=1` to the url then the new  */
    /* directory will be world-writable and world-administerable.               */
    /*                                                                          */
    /* <!-- {{{ -->                                                            */
    /* ```js                                                                    */
    /*                                                                          */
    /* <File interface: mkdir>=                                                 */
    function mkdir (dirurl, cb) {
        doRequest('POST', dirurl, null, cb);
    };
    exports.mkdir = mkdir;
    /* ```                                                                      */
    /* <!-- }}} -->                                                             */
    /*                                                                          */
    /* Package repository client                                                */
    /* ----                                                                     */
    /*                                                                          */
    /* Usage examples:                                                          */
    /*                                                                          */
    /* ```js                                                                    */
    /* repository.atHeroSpaces('amber').package('foo').                         */
    /*     version(1, 2, 3).get('code.js', function (err, data) { ... });       */
    /* ```                                                                      */
    /*                                                                          */
    /* <!-- {{{ -->                                                             */
    /* ```javascript                                                            */
    /*                                                                          */
    /* <Package repository client>=                                             */
    var repository = (function () {
        /* ```                                                                      */
        /* <!-- }}} -->                                                             */
        /*                                                                          */
        /* ### Repository client: PackageVersion                                    */
        /*                                                                          */
        /* <!-- {{{ -->                                                             */
        /* ```js                                                                    */
        /*                                                                          */
        /* <Repository client: PackageVersion>=                                     */
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
        /* <!-- }}} -->                                                             */
        /*                                                                          */
        /* ### Repository client: Package                                           */
        /*                                                                          */
        /* <!-- {{{ -->                                                             */
        /* ```js                                                                    */
        /*                                                                          */
        /* <Repository client: Package>=                                            */
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
        /* ```                                                                      */
        /* <!-- }}} -->                                                             */
        /*                                                                          */
        /* ### Repository client: Repository                                        */
        /*                                                                          */
        /* <!-- {{{ -->                                                             */
        /* ```js                                                                    */
        /*                                                                          */
        /* <Repository client: Repository>=                                         */
        function repository (url) {
            var that = {};

            that.url = function () { return url; };

            that.package = function (name) {
                return package(that, name);
            };

            return that;
        };
        /* ```                                                                      */
        /* <!-- }}} -->                                                             */
        /*                                                                          */
        /* ### Repository client: Repository factory                                */
        /*                                                                          */
        /* <!-- {{{ -->                                                             */
        /* ```js                                                                    */
        /*                                                                          */
        /* <Repository client: Repository factory>=                                 */
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

    return exports;
})));
