module.exports = function(app) {
  require('./locations')(app);
  require('./main')(app);
}