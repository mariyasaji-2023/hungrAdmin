const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const upload = require('../middlewares/multer')

router.get('/getRestaurant', restaurantController.getRestaurantNames);
router.post('/addCategory',restaurantController.addRestaurantCategory)
router.get('/getAllcategories',restaurantController.getAllcategories)
router.post('/addRestaurant', upload.single('logo'),restaurantController.addRestaurant)
router.put('/editRestaurant', upload.single('logo'),restaurantController.editRestaurant)
router.post('/searchRestuarant',restaurantController.searchRestaurant)
router.post('/getMenu',restaurantController.getRestaurantMenu)
router.put('/editMenuCategory',restaurantController.editMenuCategoryandSub)
router.post('/addMenuCategory',restaurantController.createMenuCategory)
router.post('/addMenuSubcategory',restaurantController.createMenuSubcategory)
router.post('/searchMenu',restaurantController.searchMenuSuggestions)
router.post('/filterMenu',restaurantController.filterMenuByCategory)
router.post('/addDish',upload.single('image'),restaurantController.addDish)
router.put('/editDish',upload.single('image'),restaurantController.editDish)
router.post('/addDishToCategory',restaurantController.addDishToCategory)
router.post('/DropDownMenuategory',restaurantController.getAllMenuCategories)
router.post('/getMenuAndSubCategory',restaurantController.showAllMenuAndSubCategories)
router.post('/getRestaurantsByCategory',restaurantController.getRestaurantDishesByCategory)


module.exports = router;

