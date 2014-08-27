var mongoose = require('mongoose');
var Location = mongoose.model('Location');

var theEarth = (function() {
  var earthRadius = 6371; // km
  var getDistanceFromRads = function(rads) {
    return parseFloat(rads * earthRadius);
  };
  var getRadsFromDistance = function(distance) {
    return parseFloat(distance / earthRadius);
  };
  return {
    getDistanceFromRads : getDistanceFromRads,
    getRadsFromDistance : getRadsFromDistance
  };
})();

// locations
module.exports.locationsListByDistance = function(req, res) {
  var lng = parseFloat(req.query.lng);
  var lat = parseFloat(req.query.lat);
  var within = parseFloat(req.query.within);
  if (lng && lat && within) {
    var point = {
      type: "Point",
      coordinates: [lng, lat]
    };
    var geoOptions = {
      spherical: true,
      maxDistance: theEarth.getRadsFromDistance(within),
      num: 10
    };
    Location.geoNear(point, geoOptions, function (err, results, stats) {
      var locations = [];
      if (err) {
        sendJSONresponse(res, 404, err);
        
      } else {
        locationsFromGeoNearData(results, locations);
        sendJSONresponse(res, 200, locations);
      }
    });
    
  } else {
    sendJSONresponse(res, 404, {
      "message": "lng, lat and within query parameters are required"
    });
  }
};

var locationsFromGeoNearData = function(results, locations) {
  results.forEach(function(doc) {
    locations.push({
      distance: theEarth.getDistanceFromRads(doc.dis),
      name: doc.obj.name,
      address: doc.obj.address,
      rating: doc.obj.rating,
      facilities: doc.obj.facilities,
      _id: doc.obj._id
    });
  });
};

module.exports.locationsCreate = function (req, res) {
  var facilities = [];
  var openingTimes = [];
  readFacilitiesAndTimesFromRequest(req, facilities, openingTimes);
  Location.create({
    name: req.body.name,
    address: req.body.address,
    facilities: facilities,
    coords: [parseFloat(req.body.lng), parseFloat(req.body.lat)],
    openingTimes: openingTimes,
  }, function(err, location) {
    if (err) {
      sendJSONresponse(res, 400, err);
    } else {
      sendJSONresponse(res, 201, location);
    }
  });
};

var readFacilitiesAndTimesFromRequest = function(req, fac, times) {
  var i;
  if (req.body.facilities) {
    req.body.facilities.forEach(function(facility) {
      fac.push(facility);
    });
  }
  if (req.body.days) {
    for (i = 0; i < req.body.days.length; i++) {
      times.push({
        days: req.body.days[i],
        opening: req.body.opening[i],
        closing: req.body.closing[i],
        closed: req.body.closed[i],
      });
    }
  }
};

module.exports.locationsRead = function (req, res) {
  if (req.params && req.params.locationid) {
    Location
      .findById(req.params.locationid)
      .exec(function(err, location) {
        if (!location) {
          sendJSONresponse(res, 404, {
            "message": "locationid not found"
          });
          return;
          
        } else if (err) {
          sendJSONresponse(res, 404, err);
          return;
        }

        sendJSONresponse(res, 200, location);
      });
  
  } else {
    sendJSONresponse(res, 404, {
      "message": "Not found, locationid required"
    });
  }
};

module.exports.locationsUpdate = function (req, res) {
  var facilities = [];
  var openingTimes = [];
  if (req.params && req.params.locationid) {
    Location
      .findById(req.params.locationid)
      .select('-reviews -rating')
      .exec(function(err, location) {
        if (!location) {
          sendJSONresponse(res, 404, {
            "message": "locationid not found"
          });
          return;
          
        } else if (err) {
          sendJSONresponse(res, 400, err);
          return;
          
        } else {
          readFacilitiesAndTimesFromRequest(req, facilities, openingTimes);
          location.name = req.body.name;
          location.address = req.body.address;
          location.facilities = facilities;
          location.coords = [parseFloat(req.body.lng), parseFloat(req.body.lat)];
          location.openingTimes = openingTimes;
          location.save(function(err, location) {
            if (err) {
              sendJSONresponse(res, 404, err);
            } else {
              sendJSONresponse(res, 200, location);
            }
          });
        }
      });
      
  } else {
    sendJSONresponse(res, 404, {
      "message": "Not found, locationid required"
    });
  }
};

module.exports.locationsDelete = function (req, res) {
  if (req.params && req.params.locationid) {
    // can separately Location.findById and Location.remove if needed...
    Location
      .findByIdAndRemove(req.params.locationid)
      .exec(
        function(err, location) {
          if (err) {
            sendJSONresponse(res, 404, err);
            return;
          }
          sendJSONresponse(res, 204, null);
        });
      
  } else {
    sendJSONresponse(res, 404, {
      "message": "No locationid"
    });
  }
};

// reviews
module.exports.reviewsCreate = function(req, res) {
  if (req.params && req.params.locationid) {
    Location
      .findById(req.params.locationid)
      .select('reviews')
      .exec(function(err, location) {
        if (err) {
          sendJSONresponse(res, 400, err);
        } else {
          doAddReview(req, res, location);
        }
      });
      
  } else {
    sendJSONresponse(res, 404, {
      "message": "Not found, locationid required"
    });
  }
};

var doAddReview = function(req, res, location) {
  if (!location) {
    sendJSONresponse(res, 404, "locationid not found");
    
  } else {
    location.reviews.push({
      author: {
        displayName: req.body.author
      },
      rating: req.body.rating,
      reviewText: req.body.reviewText
    });
    
    location.save(function(err, location) {
      var thisReview;
      if (err) {
        sendJSONresponse(res, 400, err);
        
      } else {
        updateAverageRating(location._id);
        thisReview = location.reviews[location.reviews.length - 1];
        sendJSONresponse(res, 201, thisReview);
      }
    });
  }
};

var updateAverageRating = function(locationid) {
  Location
    .findById(locationid)
    .select('rating reviews')
    .exec(function(err, location) {
      if (err) {
        console.log(err);
      } else {
        calcAndSaveAverageRating(location);
      }
    });
};

var calcAndSaveAverageRating = function(location) {
  var i, reviewCount, ratingAverage, ratingTotal;
  if (location.reviews && location.reviews.length > 0) {
    reviewCount = location.reviews.length;
    ratingTotal = 0;
    for (i = 0; i < reviewCount; i++) {
      ratingTotal = ratingTotal + location.reviews[i].rating;
    }
    ratingAverage = parseInt(ratingTotal / reviewCount, 10);
    location.rating = ratingAverage;
    location.save(function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Average rating updated to", ratingAverage);
      }
    });
  }
};

module.exports.reviewsRead = function (req, res) {
  if (req.params && req.params.locationid && req.params.reviewid) {
    Location
      .findById(req.params.locationid)
      .select('name reviews')
      .exec(function(err, location) {
        var response, review;
        if (!location) {
          sendJSONresponse(res, 404, {
            "message": "locationid not found"
          });
          return;
          
        } else if (err) {
          sendJSONresponse(res, 404, err);
          return;
        }

        if (location.reviews && location.reviews.length > 0) {
          review = location.reviews.id(req.params.reviewid);
          if (!review) {
            sendJSONresponse(res, 404, {
              "message": "reviewid not found"
            });
            
          } else {
            response = {
              location : {
                name : location.name,
                _id : req.params.locationid
              },
              review : review
            };
            sendJSONresponse(res, 200, response);
          }
          
        } else {
          sendJSONresponse(res, 404, {
            "message": "No reviews found"
          });
        }
      });
  
  } else {
    sendJSONresponse(res, 404, {
      "message": "Not found, locationid and reviewid are both required"
    });
  }
};

module.exports.reviewsUpdate = function (req, res) {
  if (req.params && req.params.locationid && req.params.reviewid) {
    Location
      .findById(req.params.locationid)
      .select('reviews')
      .exec(function(err, location) {
        var thisReview;
        if (!location) {
          sendJSONresponse(res, 404, {
            "message": "locationid not found"
          });
          return;
          
        } else if (err) {
          sendJSONresponse(res, 400, err);
          return;
          
        } else if (location.reviews && location.reviews.length > 0) {
          thisReview = location.reviews.id(req.params.reviewid);
          if (!thisReview) {
            sendJSONresponse(res, 404, {
              "message": "reviewid not found"
            });
          
          } else {
            thisReview.author.displayName = req.body.author;
            thisReview.rating = req.body.rating;
            thisReview.reviewText = req.body.reviewText;
            location.save(function(err, location) {
              if (err) {
                sendJSONresponse(res, 404, err);
              } else {
                updateAverageRating(location._id);
                sendJSONresponse(res, 200, thisReview);
              }
            });
          }
          
        } else {
          sendJSONresponse(res, 404, {
            "message": "No review to update"
          });
        }
      });
      
  } else {
    sendJSONresponse(res, 404, {
      "message": "Not found, locationid and reviewid are both required"
    });
  }
};

module.exports.reviewsDelete = function (req, res) {
  if (req.params && req.params.locationid && req.params.reviewid) {
    Location
      .findById(req.params.locationid)
      .select('reviews')
      .exec(function(err, location) {
        var thisReview;
        if (!location) {
          sendJSONresponse(res, 404, {
            "message": "locationid not found"
          });
          return;
          
        } else if (err) {
          sendJSONresponse(res, 400, err);
          return;
          
        } else if (location.reviews && location.reviews.length > 0) {
          if (!location.reviews.id(req.params.reviewid)) {
            sendJSONresponse(res, 404, {
              "message": "reviewid not found"
            });
          
          } else {
            location.reviews.id(req.params.reviewid).remove();
            location.save(function(err, location) {
              if (err) {
                sendJSONresponse(res, 404, err);
              } else {
                updateAverageRating(location._id);
                sendJSONresponse(res, 204, null);
              }
            });
          }
          
        } else {
          sendJSONresponse(res, 404, {
            "message": "No review to delete"
          });
        }
      });
      
  } else {
    sendJSONresponse(res, 404, {
      "message": "Not found, locationid and reviewid are both required"
    });
  }
};

var sendJSONresponse = function(res, status, content) {
  res.status(status);
  res.json(content);
};