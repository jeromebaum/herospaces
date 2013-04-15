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
    exports.version = '0.0.0';

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

    return exports;
})));