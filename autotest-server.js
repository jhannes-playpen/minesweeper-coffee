var http = require('http');
var path = require('path');
var url = require('url');
var fs = require('fs');
var timers = require("timers");
var coffee = require('./build/coffee-script');

var contentType = function(filePath) {
  if (filePath.match(/\.html?$/)) {
    return "text/html";
  } else if (filePath.match(/\.css$/)) {
    return "text/css";
  } else if (filePath.match(/\.js$/)) {
    return "text/javascript";
  } else if (filePath.match(/\.coffee$/)) {
    return "text/coffeescript";
  } else if (filePath.match(/\.png$/)) {
    return "image/png";
  }
};

var clients_waiting_for_code_change = [];

var server = http.createServer(function(req,res) {
  var filePath = '.' + url.parse(req.url).pathname;
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


var fileTree = function(root, filenameFilter) {
  var files = fs.readdirSync(root);
  var result = [];
  for (var i=0; i<files.length; i++) {
    if (files[i].match(/^\./)) {
      continue;
    }
    var filename = root + "/" + files[i];
    var stat = fs.statSync(filename);
    if (stat.isFile() && filename.match(filenameFilter)) {
      result[filename] = stat.mtime;
    } else if (stat.isDirectory()) {
      var subfiles = fileTree(filename, filenameFilter);
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

var compileCoffee = function(coffee_file, status_reporting) {
  var js_file = coffee_file.replace(/\.coffee$/, ".js")
  var jsFilePresent = path.existsSync(js_file);
  if (jsFilePresent && fs.statSync(coffee_file).mtime <= fs.statSync(js_file).mtime) return;
  console.log("compiling", coffee_file);
  fs.unlink(js_file, function() {
    try {
      var js_src = coffee.CoffeeScript.compile(fs.readFileSync(coffee_file, "utf8"));
      fs.writeFileSync(js_file, js_src, "utf8");
    } catch (err) {
      console.log(coffee_file + ": " + err.message);
      var failed_compile_source = 'describe("' + coffee_file + '", function() {' +
        'it("fails to compile", function() {' +
        'expect("' +  err.message.replace('"', "'") + '").toBeUndefined(); }); });';
      fs.writeFileSync(js_file, failed_compile_source, "utf8");
    }
  });
}


var periodicScan = function(files, filenameFilter, listener) {
  var newFiles = fileTree(".", filenameFilter);
  var notification = {
    created: findMissing(files, newFiles),
    deleted: findMissing(newFiles, files),
    modified: findModified(files, newFiles)
  };
  var changes = notification.created + notification.deleted + notification.modified;
  if (changes.length > 0) {
    listener(notification);
    timers.setTimeout(periodicScan, 10, newFiles, filenameFilter, listener);
  } else {
    timers.setTimeout(periodicScan, 400, newFiles, filenameFilter, listener);
  }
};

periodicScan(fileTree(".", /\.js$/), /\.js$/, function(changes) {
  clients_waiting_for_code_change.forEach(function(res) {
    res.writeHead(200);
    res.end();
  });
  clients_waiting_for_code_change = [];
});

periodicScan(fileTree(".", /\.coffee$/), /\.coffee$/, function(changes) {
  changes.created.forEach(function(file) { compileCoffee(file); });
  changes.modified.forEach(function(file) { compileCoffee(file); });
  changes.deleted.forEach(function(original) {
    console.log("Missing " + original);
    var js_file = original.replace(/\.coffee$/, ".js")
    console.log("deleting", js_file);
    fs.unlink(js_file);
  });
  clients_waiting_for_code_change.forEach(function(res) {
    res.writeHead(200);
    res.end();
  });
  clients_waiting_for_code_change = [];
});
