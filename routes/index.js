var express = require('express');
var router = express.Router();

module.exports = function(app) {
  require('./main')(router);
  require('./locations')(router);
   
  app.use('/', router);
}