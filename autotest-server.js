var http = require('http');
var path = require('path');
var fs = require('fs');

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

var server = http.createServer(function(req,res) {
  var filePath = '.' + req.url;
  if (filePath === './') filePath = './SpecRunner.html';
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
