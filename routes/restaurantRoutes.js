const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const upload = require('../middlewares/multer')

router.get('/getRestaurant', restaurantController.getRestaurantNames);
router.post('/addCategory',restaurantController.addCategory)
router.get('/getAllcategories',restaurantController.getAllcategories)
router.post('/addRestaurant', upload.single('logo'),restaurantController.addRestaurant)
router.put('/editRestaurant',restaurantController.editRestaurant)
router.post('/searchRestuarant',restaurantController.searchRestaurant)
router.get('/getMenu',restaurantController.getRestaurantMenu)

module.exports = router;
