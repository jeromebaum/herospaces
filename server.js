var http = require('http');
var path = require('path');
var fs = require('fs');
var util = require('util');
var url = require('url');
var querystring = require('querystring');
var mime = require('mime');
var connect = require('connect');

var port = process.env.PORT || 4000;
var basePath = './';
var optionsFile = '_options';


function handleGET (req, res, next) {
    if (req.method !== 'GET') { next(); return; };
    var uri = url.parse(req.url).pathname;
    var filename = path.join(basePath, uri);
    var basename = path.basename(uri);
    if (basename === optionsFile) {
        isAuthed('admin', filename, req, function handleAuth (authed) {
            if (!authed) {
                res.writeHead(403);
                res.end('403 No Thanks\n');
            } else {
                respondFile(filename, res);
            };
        });
        return;
    };
    var qs = url.parse(req.url).query;
    var options = querystring.parse(qs);
    if (options && options.listing) {
        isAuthed('ls', filename, req, function handleAuth (authed) {
            if (!authed) {
                res.writeHead(403);
                res.end('403 No Thanks\n');
            } else {
                respondDir(filename, res);
            };
        });
        return;
    };
    fs.exists(filename, function respond (response) {
        if (!!response) {
            respondFile(filename, res);
        } else {
            res.writeHead(404);
            res.end('404 Not Found\n');
        };
    });
};

function handlePUT (req, res, next) {
    if (req.method !== 'PUT') { next(); return; };
    var uri = url.parse(req.url).pathname;
    var filename = path.join(basePath, uri);
    req.pause();
    isAuthed('put', filename, req, function handleAuth (authed) {
        if (!authed) {
            res.writeHead(403);
            res.end('403 No Thanks\n');
        } else {
            handleFileUpload(req, res, filename);
        };
    });
};

function handleMKDIR (req, res, next) {
    if (req.method !== 'POST') { next(); return; };
    var uri = url.parse(req.url).pathname;
    var filename = path.join(basePath, uri);
    isAuthed('mkdir', filename, req, function handleAuth (authed) {
        if (!authed) {
            res.writeHead(403);
            res.end('403 No Thanks\n');
        } else {
            fs.mkdir(filename, function handleMkdir (error) {
                if (!!error) {
                    console.warn('Error with mkdir for file ' + filename);
                    console.warn('' + error);
                    res.writeHead(500);
                    res.end('500 Create Failed\n');
                } else {
                    res.writeHead(201);
                    res.end('201 Created\n');
                };
            });
        };
    });
};

function errorOut (req, res) {
    res.writeHead(500);
    res.end('500 Problem\n');
};

function handleFileUpload (req, res, filename, buffer) {
    var stream = fs.createWriteStream(filename);
    stream.on('error', function handlePUTError (error) {
        console.warn('Error creating WriteStream for file ' + filename);
        console.warn('' + error);
        res.writeHead(500);
        res.end('500 Create Failed\n');
    });
    req.resume();
    req.on('end', function respond () {
        res.writeHead(201);
        res.end('201 Created\n');
    });
    req.pipe(stream);
};

function respondDir (filename, res) {
    fs.readdir(filename, function handleDir (err, files) {
        if (!!err) {
            res.writeHead(500);
            res.end('500 Read Failed\n');
        } else {
            var obj = { files: files };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(obj));
        };
    });
};

function respondFile (filename, res) {
    var theFilename = filename;
    fs.stat(theFilename, function handleStat (err, stat) {
        if (stat && stat.isDirectory()) {
            theFilename = path.join(filename, 'index.html');
        };
        fs.exists(theFilename, function handleStat (exists) {
            if (!exists) {
                res.writeHead(404);
                res.end('404 Not Found\n');
            } else {
                var type = mime.lookup(theFilename);
                if (type === 'application/javascript') {
                    type = type + ';charset=utf-8';
                };
                res.writeHead(200, { 'Content-Type': type });
                fs.createReadStream(theFilename).pipe(res);
            };
        });
    });
};

function isAuthed (permission, filename, req, cb) {
    var qs = url.parse(req.url).query;
    var options = querystring.parse(qs);
    var providedKey = options.key;
    optionsFor(filename, function checkPerms (options) {
        var allKeys = options && options.keys;
        var relevantKeys = allKeys && allKeys[permission];
        var matchIndex = relevantKeys && relevantKeys.indexOf(providedKey);
        cb(matchIndex >= 0 || !relevantKeys);
    });
};

function findOptionsFile (filename, cb) {
    var candidate = path.join(filename, optionsFile);
    fs.exists(candidate, function handleStat (exists) {
        if (exists) {
            cb(candidate);
        } else {
            var oneLevelUp = path.resolve(filename, '..');
            var relative = path.relative(basePath, filename);
            if (oneLevelUp === filename || relative == '..') {
                cb();
                return;
            };
            findOptionsFile(oneLevelUp, cb);
        };
    });
};

function optionsFor (filename, cb) {
    findOptionsFile(filename, function (optionsFilename) {
        if (!optionsFilename) {
            cb();
            return;
        }
        fs.readFile(optionsFilename, function handleOptionsFile (exists, file) {
            var obj = JSON.parse(file);
            cb(obj);
        });
    });
};

var app = connect().
        use(handleGET).
        use(handlePUT).
        use(handleMKDIR).
        use(errorOut);

http.createServer(app).listen(port);
