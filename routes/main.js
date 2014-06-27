var ctrl = require('../app_server/controllers/main');

module.exports = function(router) {
  router.get('/about', ctrl.about);
  router.get('/signin', ctrl.signin);
}