var ctrl = require('../controllers/locations');

module.exports = function(app) {
  // locations
  app.get('/api/locations', ctrl.locationsListByDistance);
  app.post('/api/locations', ctrl.locationsCreate);
  app.get('/api/locations/:locationid', ctrl.locationsRead);
  app.put('/api/locations/:locationid', ctrl.locationsUpdate);
  app.delete('/api/locations/:locationid', ctrl.locationsDelete);
  
  // reviews
  app.post('/api/locations/:locationid/reviews', ctrl.reviewsCreate);
  app.get('/api/locations/:locationid/reviews/:reviewid', ctrl.reviewsRead);
  app.put('/api/locations/:locationid/reviews/:reviewid', ctrl.reviewsUpdate);
  app.delete('/api/locations/:locationid/reviews/:reviewid', ctrl.reviewsDelete);
}