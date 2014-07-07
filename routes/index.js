var express = require('express');
var router = express.Router();

require('./main')(router);
require('./locations')(router);

module.exports = router;