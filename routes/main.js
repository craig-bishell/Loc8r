var express = require('express');
var router = express.Router();

var ctrl = require('../app_server/controllers/main');

router.get('/', function(req, res) {
  ctrl.index(req, res);
});

module.exports = function(app) {
    app.use('/', router);
}