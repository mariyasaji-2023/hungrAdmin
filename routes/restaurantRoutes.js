const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');

router.get('/getRestaurant', restaurantController.getRestaurantNames);
router.post('/addCategory',restaurantController.addCategory)
router.get('/getAllcategories',restaurantController.getAllcategories)

module.exports = router;
