var http = require('http');
var path = require('path');
var fs = require('fs');
var util = require('util');
var url = require('url');
var mime = require('mime');
var connect = require('connect');

var port = process.env.PORT || 4000;
var basePath = './';


function handleGET (req, res, next) {
    if (req.method !== 'GET') { next(); };
    var uri = url.parse(req.url).pathname;
    var filename = path.join(basePath, uri);
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
    if (req.method !== 'PUT') { next(); };
    var file = '.' + req.url;
    var stream = fs.createWriteStream(file);
    stream.on('error', function handlePUTError (error) {
        console.warn('Error creating WriteStream for file ' + file);
        console.warn('' + error);
        res.writeHead(500);
        res.end('500 Create Failed\n');
    });
    stream.on('close', function respond () {
        res.writeHead(201);
        res.end('201 Created\n');
    });
    req.setEncoding('utf8');
    req.on('data', function forwardData (data) {
        stream.write(data);
    });
    req.on('end', function handleEndOfData () {
        if (stream.writable) {
            stream.end();
        };
    });
};

function respondFile (filename, res) {
    var theFilename = filename;
    fs.stat(filename, function handleStat (stat) {
        if (stat && stat.isDirectory) {
            theFilename = filename + 'index.html';
        };
        fs.readFile(filename, function handleFile (exists, file) {
            if (!!exists) {
                console.log(filename + ' does not exist');
                res.writeHead(404);
                res.end('404 Not Found\n');
            } else {
                var type = mime.lookup(filename);
                if (type === 'application/javascript') {
                    type = type + ';charset=utf-8';
                };
                res.writeHead(200, { 'Content-Type': type });
                res.write(file, 'binary');
                res.end();
            };
        });
    });
};

var app = connect().use(handleGET).use(handlePUT);

http.createServer(app).listen(port);
