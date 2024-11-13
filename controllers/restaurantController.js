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


const filterMenuByCategory = async (req, res) => {
    const { restaurantId, categoryId } = req.body;

    try {
        const client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db('hungerX');
        const restaurantsCollection = db.collection('restaurants');

        // Find the restaurant
        const restaurant = await restaurantsCollection.findOne({
            _id: new ObjectId(restaurantId)
        });

        if (!restaurant) {
            await client.close();
            return res.status(404).json({
                status: false,
                error: 'Restaurant not found'
            });
        }

        // If categoryId is provided, filter by category
        if (categoryId) {
            // Filter dishes by category across all menus with null checks
            const filteredMenus = restaurant.menus.map(menu => ({
                ...menu,
                dishes: (menu.dishes || []).filter(dish => 
                    dish?.category?._id?.toString() === categoryId.toString()
                )
            })).filter(menu => menu.dishes && menu.dishes.length > 0);

            await client.close();
            return res.status(200).json({
                status: true,
                data: {
                    restaurant: {
                        _id: restaurant._id,
                        name: restaurant.name,
                        logo: restaurant.logo
                    },
                    menus: filteredMenus
                }
            });
        }

        // If no categoryId provided, group all dishes by category with null checks
        const categorizedDishes = restaurant.menus.reduce((acc, menu) => {
            if (!menu.dishes) return acc;

            menu.dishes.forEach(dish => {
                if (!dish?.category?._id || !dish?.category?.name) return;

                const categoryId = dish.category._id.toString();
                const categoryName = dish.category.name;
                
                if (!acc[categoryId]) {
                    acc[categoryId] = {
                        categoryId,
                        categoryName,
                        dishes: []
                    };
                }
                
                acc[categoryId].dishes.push({
                    ...dish,
                    menuName: menu.name || 'Unnamed Menu',
                    menuId: menu._id
                });
            });
            return acc;
        }, {});

        // Convert to array and sort by category name
        const sortedCategories = Object.values(categorizedDishes)
            .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

        await client.close();
        return res.status(200).json({
            status: true,
            data: {
                restaurant: {
                    _id: restaurant._id,
                    name: restaurant.name,
                    logo: restaurant.logo
                },
                categories: sortedCategories
            }
        });

    } catch (error) {
        console.error('Error fetching menu by category:', error);
        res.status(500).json({
            status: false,
            error: 'Error fetching menu by category',
            details: error.message
        });
    }
};
const getRestaurantCategories = async (req, res) => {
    const { restaurantId } = req.body; // or req.body depending on how you send the data

    try {
        const client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db('hungerX');
        const restaurantsCollection = db.collection('restaurants');
        const categoriesCollection = db.collection('menucategories');

        // First, find the restaurant and get its menus
        const restaurant = await restaurantsCollection.findOne({
            _id: new ObjectId(restaurantId)
        });

        if (!restaurant) {
            await client.close();
            return res.status(404).json({
                status: false,
                error: 'Restaurant not found'
            });
        }

        // Get unique category IDs from all dishes in all menus
        const categoryIds = new Set();
        restaurant.menus.forEach(menu => {
            if (menu.dishes && Array.isArray(menu.dishes)) {
                menu.dishes.forEach(dish => {
                    if (dish.category && dish.category._id) {
                        categoryIds.add(dish.category._id.toString());
                    }
                });
            }
        });

        // Fetch only the categories that are used in this restaurant
        const categories = await categoriesCollection.find({
            _id: { 
                $in: Array.from(categoryIds).map(id => new ObjectId(id)) 
            }
        }).sort({ name: 1 }).toArray();

        // Format the response
        const formattedCategories = categories.map(category => {
            // Count dishes in this category
            let dishCount = 0;
            restaurant.menus.forEach(menu => {
                if (menu.dishes && Array.isArray(menu.dishes)) {
                    dishCount += menu.dishes.filter(dish => 
                        dish.category && 
                        dish.category._id && 
                        dish.category._id.toString() === category._id.toString()
                    ).length;
                }
            });

            return {
                _id: category._id,
                name: category.name,
                subcategories: category.subcategories.map(sub => ({
                    _id: sub._id,
                    name: sub.name,
                    dishCount: countDishesInSubcategory(restaurant.menus, sub._id)
                })).sort((a, b) => a.name.localeCompare(b.name)),
                totalSubcategories: category.subcategories.length,
                dishCount,
                createdAt: category.createdAt,
                updatedAt: category.updatedAt
            };
        });

        await client.close();

        res.status(200).json({
            status: true,
            data: {
                restaurant: {
                    _id: restaurant._id,
                    name: restaurant.name,
                    logo: restaurant.logo
                },
                categories: formattedCategories
            }
        });

    } catch (error) {
        console.error('Error fetching restaurant categories:', error);
        res.status(500).json({
            status: false,
            error: 'Error fetching restaurant categories',
            details: error.message
        });
    }
};

// Helper function to count dishes in a subcategory
const countDishesInSubcategory = (menus, subcategoryId) => {
    let count = 0;
    menus.forEach(menu => {
        if (menu.dishes && Array.isArray(menu.dishes)) {
            count += menu.dishes.filter(dish => 
                dish.category && 
                dish.subcategory && 
                dish.subcategory._id && 
                dish.subcategory._id.toString() === subcategoryId.toString()
            ).length;
        }
    });
    return count;
};



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
        categoryId,      // MongoDB ObjectId
        subcategoryId,   // MongoDB ObjectId (Optional)
        restaurantId,    // MongoDB ObjectId
        menuId          // Custom format: bk-menu-XXX
    } = req.body;

    try {
        // Required field validation
        if (!name || !price || !categoryId || !restaurantId || !menuId) {
            return res.status(400).json({
                status: false,
                error: 'Name, price, categoryId, restaurantId, and menuId are required'
            });
        }

        // Validate MongoDB ObjectId format
        const isValidObjectId = (id) => {
            return ObjectId.isValid(id) && (new ObjectId(id)).toString() === id;
        };

        // Validate restaurantId
        if (!isValidObjectId(restaurantId)) {
            return res.status(400).json({
                status: false,
                error: 'Invalid Restaurant ID format - must be a valid MongoDB ObjectId'
            });
        }

        // Validate categoryId
        if (!isValidObjectId(categoryId)) {
            return res.status(400).json({
                status: false,
                error: 'Invalid Category ID format - must be a valid MongoDB ObjectId'
            });
        }

        // Validate menuId format
        if (!menuId.startsWith('bk-menu-')) {
            return res.status(400).json({
                status: false,
                error: 'Invalid Menu ID format - must start with "bk-menu-"'
            });
        }

        // Validate subcategoryId if provided
        if (subcategoryId && !isValidObjectId(subcategoryId)) {
            return res.status(400).json({
                status: false,
                error: 'Invalid Subcategory ID format - must be a valid MongoDB ObjectId'
            });
        }

        // Validate image
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
        const restaurantsCollection = db.collection('restaurants');
        const categoriesCollection = db.collection('menucategories');

        // Verify restaurant exists
        const restaurant = await restaurantsCollection.findOne({
            _id: new ObjectId(restaurantId)
        });

        if (!restaurant) {
            await client.close();
            return res.status(404).json({
                status: false,
                error: 'Restaurant not found'
            });
        }

        // Fetch category details
        const categoryDoc = await categoriesCollection.findOne({ 
            _id: new ObjectId(categoryId)
        });

        if (!categoryDoc) {
            await client.close();
            return res.status(400).json({
                status: false,
                error: 'Category not found'
            });
        }

        // Check subcategory if provided
        let subcategoryInfo = null;
        if (subcategoryId) {
            const subcategory = categoryDoc.subcategories.find(
                sub => sub._id.toString() === subcategoryId
            );

            if (!subcategory) {
                await client.close();
                return res.status(400).json({
                    status: false,
                    error: 'Subcategory not found in the specified category'
                });
            }

            subcategoryInfo = {
                _id: subcategoryId,
                name: subcategory.name
            };
        }

        // Find maximum dish number to generate new ID
        const dishCounter = restaurant.menus.reduce((max, menu) => {
            if (!menu.dishes) return max;
            const menuMax = menu.dishes.reduce((count, dish) => {
                if (!dish.id) return count;
                const num = parseInt(dish.id.split('-')[2]);
                return isNaN(num) ? count : Math.max(count, num);
            }, 0);
            return Math.max(max, menuMax);
        }, 0);

        const newDishId = `bk-dish-${(dishCounter + 1).toString().padStart(3, '0')}`;

        // Create new dish document
        const now = new Date();
        const newDish = {
            id: newDishId,
            name,
            image,
            price: parseFloat(price),
            ...(rating && { rating: parseFloat(rating) }),
            ...(description && { description }),
            category: {
                _id: categoryId,
                name: categoryDoc.name
            },
            ...(subcategoryInfo && { subcategory: subcategoryInfo }),
            ...(servingSize && servingUnit && {
                servingInfo: {
                    size: parseFloat(servingSize),
                    unit: servingUnit,
                    equivalentTo: `${servingSize} ${servingUnit} of ${name}`
                }
            }),
            nutritionFacts: {
                ...(calories && { calories: parseInt(calories) }),
                ...(carbs && { 
                    totalCarbohydrates: { value: parseFloat(carbs) }
                }),
                ...(protein && { 
                    protein: { value: parseFloat(protein) }
                }),
                ...(fats && { 
                    totalFat: { value: parseFloat(fats) }
                })
            },
            createdAt: now,
            updatedAt: now
        };

        // Add dish to menu
        const result = await restaurantsCollection.updateOne(
            { 
                _id: new ObjectId(restaurantId),
                "menus.id": menuId
            },
            { 
                $push: { 
                    "menus.$.dishes": newDish 
                } 
            }
        );

        await client.close();

        if (result.modifiedCount > 0) {
            res.status(201).json({
                status: true,
                message: 'Dish added successfully',
                dish: newDish
            });
        } else {
            throw new Error('Failed to add dish to menu');
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
        const { 
            dishId,        // Custom format: bk-dish-XXX
            restaurantId,  // MongoDB ObjectId
            menuId,        // Custom format: bk-menu-XXX
            categoryId,    // MongoDB ObjectId (optional)
            subcategoryId, // MongoDB ObjectId (optional)
            ...updateData 
        } = req.body;

        // Basic validation
        if (!dishId || !restaurantId || !menuId) {
            return res.status(400).json({
                status: false,
                error: 'Dish ID, Restaurant ID, and Menu ID are required'
            });
        }

        // Validate MongoDB ObjectId format for restaurantId
        const isValidObjectId = (id) => {
            return ObjectId.isValid(id) && (new ObjectId(id)).toString() === id;
        };

        if (!isValidObjectId(restaurantId)) {
            return res.status(400).json({
                status: false,
                error: 'Invalid Restaurant ID format - must be a valid MongoDB ObjectId'
            });
        }

        // Validate custom ID formats
        if (!menuId.startsWith('bk-menu-')) {
            return res.status(400).json({
                status: false,
                error: 'Invalid Menu ID format - must start with "bk-menu-"'
            });
        }

        if (!dishId.startsWith('bk-dish-')) {
            return res.status(400).json({
                status: false,
                error: 'Invalid Dish ID format - must start with "bk-dish-"'
            });
        }

        const client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db('hungerX');
        const restaurantsCollection = db.collection('restaurants');
        const categoriesCollection = db.collection('menucategories');

        // Find the restaurant first
        const restaurant = await restaurantsCollection.findOne({
            _id: new ObjectId(restaurantId)
        });

        if (!restaurant) {
            await client.close();
            return res.status(404).json({
                status: false,
                error: 'Restaurant not found'
            });
        }

        // Handle category and optional subcategory update
        if (categoryId) {
            if (!isValidObjectId(categoryId)) {
                await client.close();
                return res.status(400).json({
                    status: false,
                    error: 'Invalid Category ID format - must be a valid MongoDB ObjectId'
                });
            }

            const categoryDoc = await categoriesCollection.findOne({ 
                _id: new ObjectId(categoryId)
            });

            if (!categoryDoc) {
                await client.close();
                return res.status(400).json({
                    status: false,
                    error: 'Category not found'
                });
            }

            updateData.category = {
                _id: categoryId,
                name: categoryDoc.name
            };

            if (subcategoryId) {
                if (!isValidObjectId(subcategoryId)) {
                    await client.close();
                    return res.status(400).json({
                        status: false,
                        error: 'Invalid Subcategory ID format - must be a valid MongoDB ObjectId'
                    });
                }

                const subcategory = categoryDoc.subcategories.find(
                    sub => sub._id.toString() === subcategoryId
                );

                if (!subcategory) {
                    await client.close();
                    return res.status(400).json({
                        status: false,
                        error: 'Subcategory not found in the specified category'
                    });
                }

                updateData.subcategory = {
                    _id: subcategoryId,
                    name: subcategory.name
                };
            }
        }

        // Prepare update fields
        const updateFields = {
            ...(updateData.name && { "menus.$[menu].dishes.$[dish].name": updateData.name }),
            ...(updateData.price && { "menus.$[menu].dishes.$[dish].price": parseFloat(updateData.price) }),
            ...(updateData.description && { "menus.$[menu].dishes.$[dish].description": updateData.description }),
            ...(updateData.category && { "menus.$[menu].dishes.$[dish].category": updateData.category }),
            ...(updateData.subcategory !== undefined && { 
                "menus.$[menu].dishes.$[dish].subcategory": updateData.subcategory 
            }),
            "menus.$[menu].dishes.$[dish].updatedAt": new Date()
        };

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
            updateFields["menus.$[menu].dishes.$[dish].image"] = image;
        }

        // Update the dish
        const result = await restaurantsCollection.updateOne(
            { _id: new ObjectId(restaurantId) },
            { $set: updateFields },
            {
                arrayFilters: [
                    { "menu.id": menuId },
                    { "dish.id": dishId }
                ]
            }
        );

        await client.close();

        if (result.modifiedCount > 0) {
            res.status(200).json({
                status: true,
                message: 'Dish updated successfully'
            });
        } else {
            res.status(404).json({
                status: false,
                error: 'Dish not found or update failed'
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
    getRestaurantMenu,createmenuCategory,createMenuSubcategory,searchMenu,editDish,addDish, filterMenuByCategory,getRestaurantCategories
 }