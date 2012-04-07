var http = require('http');
var path = require('path');
var fs = require('fs');
var timers = require("timers");

var contentType = function(filePath) {
  if (filePath.match("\.html?$")) {
    return "text/html";
  } else if (filePath.match("\.css$")) {
    return "text/css";
  } else if (filePath.match("\.js$")) {
    return "text/javascript";
  } else if (filePath.match("\.png")) {
    return "image/png";
  }
};

var clients_waiting_for_code_change = [];

var server = http.createServer(function(req,res) {
  var filePath = '.' + req.url;
  if (filePath === './') filePath = './SpecRunner.html';
  if (filePath === './code_change.json') {
    clients_waiting_for_code_change.push(res);
    return;
  };
  path.exists(filePath, function(exists) {
    if (exists) {
      fs.readFile(filePath, function(error, content) {
        if (error) {
          console.log("error " + filePath + ": " + error);
          res.writeHead(500);
          res.end();
        } else {
          console.log("serving " + filePath);
          res.writeHead(200, { 'Content-Type': contentType(filePath) });
          res.end(content, 'utf-8');
        }
      });
    } else {
      console.log("Not found " + filePath);
      res.writeHead(404);
      res.end();    
    }
  });
});
server.listen(10000);
console.log("Server running at http://localhost:10000");


var fileTree = function(root) {
  var files = fs.readdirSync(root);
  var result = [];
  for (var i=0; i<files.length; i++) {
    if (files[i].match(/^\./)) {
      continue;
    }
    var filename = root + "/" + files[i];
    var stat = fs.statSync(filename);
    if (stat.isFile()) {
      result[filename] = stat.mtime;
    } else if (stat.isDirectory()) {
      var subfiles = fileTree(filename);
      for (file in subfiles) {
        result[file] = subfiles[file];
      }
    }
  }
  return result;
};


var findMissing = function(newFileTree, oldFileTree) {
  var missing = [];
  for (var file in oldFileTree) {
    if (!newFileTree[file]) missing.push(file);
  }
  return missing;
};

var findModified = function(oldFileTree, newFileTree) {
  var result = [];
  for (var file in oldFileTree) {
    if (newFileTree[file] > oldFileTree[file]) result.push(file);
  }
  return result;
};

var periodicScan = function(files, listener) {
  var newFiles = fileTree(".");
  var changes = findMissing(files, newFiles)
    + findMissing(newFiles, files)
    + findModified(files, newFiles);
  if (changes.length > 0) {
    listener(changes);
    timers.setTimeout(periodicScan, 10, newFiles, listener);
  } else {
    timers.setTimeout(periodicScan, 400, newFiles, listener);
  }
};

var files = fileTree(".");
periodicScan(files, function(changes) {
  clients_waiting_for_code_change.forEach(function(res) {
    res.writeHead(200);
    res.end();
  });
});
