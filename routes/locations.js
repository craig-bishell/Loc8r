var ctrl = require('../app_server/controllers/locations');

module.exports = function(router) {
  router.get('/', ctrl.homelist);
  router.get('/location', ctrl.locationInfo);
  router.get('/location/review/new', ctrl.addReview);   
}