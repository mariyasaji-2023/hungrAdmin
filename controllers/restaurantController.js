const mongoose = require('mongoose');
require('dotenv').config();
const { MongoClient,ObjectId } = require('mongodb');
const Category = require('../models/categoryModel')
const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({}, { strict: false }));
const upload = require('../middlewares/multer')

const uri = 'mongodb+srv://hungrx001:Os4GO3Iajie9lvGr@hungrx.8wv0t.mongodb.net/hungerX';
const getRestaurantNames = async (req, res) => {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        const db = client.db('hungerX');
        const collection = db.collection('restaurants');
        const restaurants = await collection.find({}, { 
            projection: { 
                name: 1, 
                logo: 1,
                rating: 1,
                description: 1,
                category: 1,
                createdAt: 1,
                updatedAt: 1 
            } 
        }).toArray();

        // Format dates for each restaurant
        const formattedRestaurants = restaurants.map(restaurant => ({
            ...restaurant,
            createdAt: formatDateTime(restaurant.createdAt),
            updatedAt: formatDateTime(restaurant.updatedAt)
        }));

        return res.status(200).json({
            restaurants: formattedRestaurants
        });
    } catch (error) {
        console.error("Error fetching restaurant names:", error);
        return res.status(500).json({ error: "Failed to fetch restaurant names" });
    } finally {
        await client.close();
    }
}

// Helper function to format date and time
const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    
    // Format date as DD-MM-YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    // Format time as HH.MM
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}-${month}-${year}, ${hours}.${minutes}`;
}

const addCategory = async (req, res) => {
    const { name } = req.body
    try {
        const category = new Category({ name })
        await category.save()
        res.status(201).json({
            status: true,
            data: {
                message: 'category added successfully', 
                category: {
                    id: category._id,
                    name: category.name
                }
            }
        })
    } catch (error) {
        res.status(500).json({
            status: false,
            data: {
                error: 'Error adding category'
            }
        })
    }
}

const getAllcategories = async (req, res) => {
    const client = new MongoClient(uri)
    try {
        await client.connect()
        console.log('getAllcategories conneced to MongoDB');
        const db = client.db('hungerX');
        const collection = db.collection('categories');
        const categories = await collection.find({}).toArray();
        return res.status(200).json({
            status: true,
            data: {
                categories
            }
        })
    } catch (error) {
        console.error("Error fetching categories:", error);
        return res.status(500).json({
            status: false,
            data: {
                error: "Failed to fetch categories"
            }
        })
    } finally {
        await client.close()
    }
}
// Helper function to format date
const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(date);
};

const addRestaurant = async (req, res) => {
    const { category: categoryId, rating, description, name } = req.body;

    try {
        if (!req.file) {
            return res.status(400).json({ 
                status: false,
                error: 'No logo file provided' 
            });
        }

        const logo = req.file.location;
        
        if (!logo) {
            return res.status(400).json({ 
                status: false,
                error: 'Logo upload failed' 
            });
        }

        const client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db('hungerX');
        const restaurantsCollection = db.collection('restaurants');
        const categoriesCollection = db.collection('categories');

        const categoryDoc = await categoriesCollection.findOne({ 
            _id: new ObjectId(categoryId) 
        });

        if (!categoryDoc) {
            await client.close();
            return res.status(400).json({
                status: false,
                error: 'Invalid category ID'
            });
        }

        const now = new Date();
        const restaurantDoc = {
            name,
            logo,
            category: {
                _id: categoryId,
                name: categoryDoc.name
            },
            rating: parseFloat(rating),
            description,
            createdAt: formatDate(now),
            updatedAt: formatDate(now)
        };

        const result = await restaurantsCollection.insertOne(restaurantDoc);
        await client.close();

        if (result.insertedId) {
            res.status(201).json({
                status: true,
                message: 'Restaurant added successfully',
                restaurant: {
                    _id: result.insertedId,
                    ...restaurantDoc
                }
            });
        } else {
            throw new Error('Failed to insert restaurant');
        }

    } catch (error) {
        console.error('Error adding restaurant:', error);
        res.status(500).json({ 
            status: false,
            error: 'Error adding restaurant',
            details: error.message 
        });
    }
};

const editRestaurant = async (req, res) => {
    try {
        console.log('Request body:', req.body);
        
        const restaurantId = req.body.restaurantId;
        console.log('Received restaurantId:', restaurantId);

        if (!restaurantId) {
            return res.status(400).json({
                status: false,
                error: 'Restaurant ID is required'
            });
        }

        const client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db('hungerX');
        const restaurantsCollection = db.collection('restaurants');
        const categoriesCollection = db.collection('categories');

        const existingRestaurant = await restaurantsCollection.findOne({ 
            _id: new ObjectId(restaurantId) 
        });

        console.log('Found restaurant:', existingRestaurant);

        if (!existingRestaurant) {
            await client.close();
            return res.status(404).json({ 
                status: false,
                error: 'Restaurant not found' 
            });
        }

        const updateFields = {
            updatedAt: formatDate(new Date())
        };

        if (req.body.category) {
            const categoryDoc = await categoriesCollection.findOne({ 
                _id: new ObjectId(req.body.category) 
            });

            if (!categoryDoc) {
                await client.close();
                return res.status(400).json({
                    status: false,
                    error: 'Invalid category ID'
                });
            }

            updateFields.category = {
                _id: req.body.category,
                name: categoryDoc.name
            };
        }

        if (req.body.name) updateFields.name = req.body.name;
        if (req.body.rating) updateFields.rating = parseFloat(req.body.rating);
        if (req.body.description) updateFields.description = req.body.description;

        if (req.file) {
            const logo = req.file.location;
            if (!logo) {
                await client.close();
                return res.status(400).json({ 
                    status: false,
                    error: 'Logo upload failed' 
                });
            }
            updateFields.logo = logo;
        }

        console.log('Update fields:', updateFields);

        const result = await restaurantsCollection.findOneAndUpdate(
            { _id: new ObjectId(restaurantId) },
            { $set: updateFields },
            { returnDocument: 'after' }
        );

        await client.close();

        if (result) {
            res.status(200).json({
                status: true,
                message: 'Restaurant updated successfully',
                restaurant: result
            });
        } else {
            res.status(404).json({
                status: false,
                error: 'Restaurant update failed'
            });
        }

    } catch (error) {
        console.error('Error updating restaurant:', error);
        res.status(500).json({ 
            status: false,
            error: 'Error updating restaurant',
            details: error.message 
        });
    }
};

const searchRestaurant = async (req, res) => {
    const { name } = req.body;
    try {
        const restaurants = await Restaurant.find({
            name: { $regex: name, $options: 'i' }
        }).select('name logo _id category rating description createdAt updatedAt'); // Add 'logo' and '_id' to the select fields
        res.status(200).json({
            message: 'Restaurants fetched successfully',
            restaurants
        });
    } catch (error) {
        console.error('Error searching for restaurants:', error);
        res.status(500).json({ error: 'Failed to search for restaurants' });
    }
}

const getRestaurantMenu = async(req,res)=>{
    const {restaurantId} = req.body
    try {
        const restaurant = await Restaurant.findById({_id:restaurantId});
        console.log(restaurant);
        
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        res.status(200).json({
            status:true,
            data: {
                name: restaurant.name,
                menu: restaurant.menus 
            }
        })
    } catch (error) {
        console.error("Error fetching restaurant menu:", error);
        res.status(500).json({ error: 'Failed to fetch restaurant menu' });
    }
}

const createmenuCategory = async (req, res) => {
    const { name } = req.body;

    try {
        // Input validation
        if (!name) {
            return res.status(400).json({
                status: false,
                error: 'Category name is required'
            });
        }

        const client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db('hungerX');
        const collection = db.collection('menucategories');

        // Check if category already exists
        const existingCategory = await collection.findOne({ name: name });
        if (existingCategory) {
            await client.close();
            return res.status(400).json({
                status: false,
                error: 'Category already exists'
            });
        }

        // Create category document
        const categoryDoc = {
            name,
            subcategories: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Insert the category
        const result = await collection.insertOne(categoryDoc);
        await client.close();

        if (result.insertedId) {
            res.status(201).json({
                status: true,
                message: 'Category created successfully',
                category: {
                    _id: result.insertedId,
                    ...categoryDoc
                }
            });
        } else {
            throw new Error('Failed to create category');
        }

    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            status: false,
            error: 'Error creating category',
            details: error.message
        });
    }
};

// Create Subcategory
const createMenuSubcategory = async (req, res) => {
    const { categoryId, name } = req.body;

    try {
        // Input validation
        if (!categoryId || !name) {
            return res.status(400).json({
                status: false,
                error: 'Category ID and subcategory name are required'
            });
        }

        const client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db('hungerX');
        const collection = db.collection('menucategories');

        // Check if category exists
        const category = await collection.findOne({ 
            _id: new ObjectId(categoryId)
        });

        if (!category) {
            await client.close();
            return res.status(404).json({
                status: false,
                error: 'Category not found'
            });
        }

        // Check if subcategory already exists
        const subcategoryExists = category.subcategories.some(
            sub => sub.name.toLowerCase() === name.toLowerCase()
        );

        if (subcategoryExists) {
            await client.close();
            return res.status(400).json({
                status: false,
                error: 'Subcategory already exists in this category'
            });
        }

        // Create subcategory document
        const subcategoryDoc = {
            _id: new ObjectId(),
            name,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Add subcategory to category
        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(categoryId) },
            { 
                $push: { subcategories: subcategoryDoc },
                $set: { updatedAt: new Date() }
            },
            { returnDocument: 'after' }
        );

        await client.close();

        if (result) {
            res.status(201).json({
                status: true,
                message: 'Subcategory created successfully',
                category: result
            });
        } else {
            throw new Error('Failed to create subcategory');
        }

    } catch (error) {
        console.error('Error creating subcategory:', error);
        res.status(500).json({
            status: false,
            error: 'Error creating subcategory',
            details: error.message
        });
    }
};

const searchMenu = async (req, res) => {
    const { query, restaurantId } = req.body;

    if (!query) {
        return res.status(400).json({
            status: false,
            error: 'Search query is required'
        });
    }

    try {
        const restaurant = await Restaurant.findById(restaurantId);
        
        if (!restaurant) {
            return res.status(404).json({
                status: false,
                error: 'Restaurant not found'
            });
        }

        // Create a case-insensitive search through all menus and dishes
        const searchResults = restaurant.menus.reduce((results, menu) => {
            const matchingDishes = menu.dishes.filter(dish => 
                dish.name.toLowerCase().includes(query.toLowerCase())
            );

            if (matchingDishes.length > 0) {
                results.push({
                    menuName: menu.name,
                    dishes: matchingDishes
                });
            }

            return results;
        }, []);

        return res.status(200).json({
            status: true,
            data: {
                restaurant: {
                    _id: restaurant._id,
                    name: restaurant.name,
                    logo: restaurant.logo,
                    category: restaurant.category,
                    rating: restaurant.rating,
                    createdAt: restaurant.createdAt,
                    updatedAt: restaurant.updatedAt
                },
                results: searchResults,
                totalResults: searchResults.reduce((total, menu) => 
                    total + menu.dishes.length, 0
                )
            }
        });

    } catch (error) {
        console.error("Error searching menu:", error);
        return res.status(500).json({
            status: false,
            error: 'Failed to search menu'
        });
    }
}

const addDish = async (req, res) => {
    const { 
        name, 
        price, 
        rating, 
        description, 
        calories, 
        carbs, 
        protein, 
        fats,
        servingSize,
        servingUnit,
        categoryId,
        restaurantId,
        menuId
    } = req.body;

    try {
        if (!req.file) {
            return res.status(400).json({ 
                status: false,
                error: 'No dish image provided' 
            });
        }

        const image = req.file.location;
        
        if (!image) {
            return res.status(400).json({ 
                status: false,
                error: 'Image upload failed' 
            });
        }

        const client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db('hungerX');
        const dishesCollection = db.collection('dishes');
        const categoriesCollection = db.collection('categories');

        // Fetch category details
        const categoryDoc = await categoriesCollection.findOne({ 
            _id: new ObjectId(categoryId) 
        });

        if (!categoryDoc) {
            await client.close();
            return res.status(400).json({
                status: false,
                error: 'Invalid category ID'
            });
        }

        const now = new Date();
        const dishDoc = {
            name,
            image,
            price: parseFloat(price),
            rating: parseFloat(rating),
            description,
            restaurantId,
            menuId,
            category: {
                _id: categoryId,
                name: categoryDoc.name
            },
            servingInfo: {
                size: parseFloat(servingSize),
                unit: servingUnit,
                equivalentTo: `${servingSize} ${servingUnit} of ${name}`
            },
            nutritionFacts: {
                calories: parseInt(calories),
                totalCarbohydrates: {
                    value: parseFloat(carbs)
                },
                protein: {
                    value: parseFloat(protein)
                },
                totalFat: {
                    value: parseFloat(fats)
                }
            },
            createdAt: formatDate(now),
            updatedAt: formatDate(now)
        };

        const result = await dishesCollection.insertOne(dishDoc);
        await client.close();

        if (result.insertedId) {
            res.status(201).json({
                status: true,
                message: 'Dish added successfully',
                dish: {
                    _id: result.insertedId,
                    ...dishDoc
                }
            });
        } else {
            throw new Error('Failed to insert dish');
        }

    } catch (error) {
        console.error('Error adding dish:', error);
        res.status(500).json({ 
            status: false,
            error: 'Error adding dish',
            details: error.message 
        });
    }
};

const editDish = async (req, res) => {
    try {
        const dishId = req.body.dishId;

        if (!dishId) {
            return res.status(400).json({
                status: false,
                error: 'Dish ID is required'
            });
        }

        const client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db('hungerX');
        const dishesCollection = db.collection('dishes');
        const categoriesCollection = db.collection('categories');

        const existingDish = await dishesCollection.findOne({ 
            _id: new ObjectId(dishId) 
        });

        if (!existingDish) {
            await client.close();
            return res.status(404).json({ 
                status: false,
                error: 'Dish not found' 
            });
        }

        const updateFields = {
            updatedAt: formatDate(new Date())
        };

        // Handle category update
        if (req.body.categoryId) {
            const categoryDoc = await categoriesCollection.findOne({ 
                _id: new ObjectId(req.body.categoryId) 
            });

            if (!categoryDoc) {
                await client.close();
                return res.status(400).json({
                    status: false,
                    error: 'Invalid category ID'
                });
            }

            updateFields.category = {
                _id: req.body.categoryId,
                name: categoryDoc.name
            };
        }

        // Update basic fields
        if (req.body.name) updateFields.name = req.body.name;
        if (req.body.price) updateFields.price = parseFloat(req.body.price);
        if (req.body.rating) updateFields.rating = parseFloat(req.body.rating);
        if (req.body.description) updateFields.description = req.body.description;

        // Update serving info
        if (req.body.servingSize || req.body.servingUnit) {
            updateFields.servingInfo = {
                ...existingDish.servingInfo,
                ...(req.body.servingSize && { size: parseFloat(req.body.servingSize) }),
                ...(req.body.servingUnit && { unit: req.body.servingUnit }),
                equivalentTo: `${req.body.servingSize || existingDish.servingInfo.size} ${req.body.servingUnit || existingDish.servingInfo.unit} of ${req.body.name || existingDish.name}`
            };
        }

        // Update nutrition facts
        if (req.body.calories || req.body.carbs || req.body.protein || req.body.fats) {
            updateFields.nutritionFacts = {
                ...existingDish.nutritionFacts,
                ...(req.body.calories && { calories: parseInt(req.body.calories) }),
                ...(req.body.carbs && { totalCarbohydrates: { value: parseFloat(req.body.carbs) } }),
                ...(req.body.protein && { protein: { value: parseFloat(req.body.protein) } }),
                ...(req.body.fats && { totalFat: { value: parseFloat(req.body.fats) } })
            };
        }

        // Handle image upload
        if (req.file) {
            const image = req.file.location;
            if (!image) {
                await client.close();
                return res.status(400).json({ 
                    status: false,
                    error: 'Image upload failed' 
                });
            }
            updateFields.image = image;
        }

        const result = await dishesCollection.findOneAndUpdate(
            { _id: new ObjectId(dishId) },
            { $set: updateFields },
            { returnDocument: 'after' }
        );

        await client.close();

        if (result) {
            res.status(200).json({
                status: true,
                message: 'Dish updated successfully',
                dish: result
            });
        } else {
            res.status(404).json({
                status: false,
                error: 'Dish update failed'
            });
        }

    } catch (error) {
        console.error('Error updating dish:', error);
        res.status(500).json({ 
            status: false,
            error: 'Error updating dish',
            details: error.message 
        });
    }
};

module.exports = { getRestaurantNames, addCategory, getAllcategories,addRestaurant,editRestaurant,searchRestaurant,
    getRestaurantMenu,createmenuCategory,createMenuSubcategory,searchMenu,editDish,addDish
 }