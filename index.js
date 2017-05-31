var restify = require('restify');
var emptygif = require('emptygif');
var ogs = require('open-graph-scraper');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/test";

const server = restify.createServer({
  name: 'node-sample',
  version: '1.0.0'
});
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());

server.get('/tracking/track.gif', trackEndpoint);

function trackEndpoint(req, res, next) {
    var options = {'url': req.headers.referer, 'headers': { 'cookie': req.headers.cookie }, 'timeout': 10000};
    ogs(options, function (err, results) {
      // we don't die on error
      if ( err ) {
        console.log("Failed to get tracking data for "+req.headers.referer);
      } else {
        MongoClient.connect(url, function(err, db) {
          // we don't die on error
          if (err) console.log("Failed to connect to db, tracking data for "+req.headers.referer + "Data:"+results.data);
          // assuming we are behind the proxy
          var ip = req.headers['x-forwarded-for'];
          // object to save
          var toSave = {
            url: req.headers.referer,
            userAgent: req.headers['user-agent'],
            host:req.headers.host,
            ip:ip,
            acceptLanguage: req.headers['accept-language'],
            ogData: results.data };
          // save to tracking collection
          db.collection("tracking").insertOne(toSave, function(err, res) {
            // we don't die on error
            if (err) console.log("Failed to save to db, tracking data for "+req.headers.referer + "Data:"+results.data);
            db.close();
          });
        });
      }
    });
    emptygif.sendEmptyGif(req, res, {
  		'Content-Type' : 'image/gif',
  		'Content-Length' : emptygif.emptyGifBufferLength,
  		'Cache-Control' : 'public, max-age=0'
  	});
    return next();
}


server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});
