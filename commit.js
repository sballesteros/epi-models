var epi = require('./index')
  , path = require('path')
  , fs = require('fs')
  , async = require('async')
  , commit = require('plom-commit');

var pathDotPlom = path.join(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.plom.json');
var conf = require(pathDotPlom);
conf.HOST =  "localhost";
conf.PORT =  5000;

[epi.createModelOneSpecies(), epi.createModelTwoSpecies()].forEach(function(m){

  (function(m){
    async.eachSeries(Object.keys(m), function(key, cb){
      commit({process:m[key]}, conf, cb);
    }, function(err){
      if(err) console.log(err);
      console.log('commited');
    });
  })(m);

});
