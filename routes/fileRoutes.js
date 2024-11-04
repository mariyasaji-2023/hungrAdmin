const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

router.get('/getRestaurant', fileController.getRestaurantNames);

module.exports = router;
