const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');

router.get('/getRestaurant', restaurantController.getRestaurantNames);
router.post('/addCategory',restaurantController.addCategory)
router.get('/getAllcategories',restaurantController.getAllcategories)
router.post('/addRestaurant',restaurantController.addRestaurant)
router.put('/editRestaurant',restaurantController.editRestaurant)
router.get('/searchRestuarant',restaurantController.searchRestuarant)

module.exports = router;
