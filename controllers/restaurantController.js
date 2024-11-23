const mongoose = require('mongoose');
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const Category = require('../models/categoryModel')
const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({}, { strict: false }));
const upload = require('../middlewares/multer')

const uri = 'mongodb+srv://hungrx001:b19cQlcRApahiWUD@cluster0.ynchc4e.mongodb.net/hungerX';
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

const addRestaurantCategory = async (req, res) => {
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

const getRestaurantMenu = async (req, res) => {
    const { restaurantId } = req.body
    try {
        const restaurant = await Restaurant.findById({ _id: restaurantId });
        console.log(restaurant);

        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        res.status(200).json({
            status: true,
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

const createMenuCategory = async (req, res) => {
    const { name, restaurantId } = req.body;
    let client;

    try {
        if (!name || !restaurantId) {
            return res.status(400).json({
                status: false,
                error: 'Category name and restaurant ID are required'
            });
        }

        // Validate if the ID is a valid ObjectId
        if (!ObjectId.isValid(restaurantId)) {
            return res.status(400).json({
                status: false,
                error: 'Invalid restaurant ID format'
            });
        }

        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('hungerX');
        const restaurantsCollection = db.collection('restaurants');

        // Log the current state of the search
        console.log('Searching for restaurant with ID:', restaurantId);
        
        // Find restaurant with properly constructed ObjectId
        const restaurant = await restaurantsCollection.findOne({
            _id: new ObjectId(restaurantId)
        });


        // Log the result
        console.log('Found restaurant:', restaurant);

        if (!restaurant) {
            return res.status(404).json({
                status: false,
                error: 'Restaurant not found'
            });
        }

        // Initialize menuCategories if it doesn't exist
        const menuCategories = restaurant.menuCategories || [];

        // Check if category already exists
        if (menuCategories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
            return res.status(400).json({
                status: false,
                error: 'Category already exists in this restaurant'
            });
        }

        // Create category document
        const categoryDoc = {
            _id: new ObjectId(),
            name,
            subcategories: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Add category to restaurant
        const result = await restaurantsCollection.updateOne(
            { _id: ObjectId.createFromHexString(restaurantId) },
            {
                $push: { menuCategories: categoryDoc },
                $set: { updatedAt: new Date() }
            }
        );

        console.log('Update result:', result);

        if (result.modifiedCount > 0) {
            return res.status(201).json({
                status: true,
                message: 'Category created successfully',
                data: {
                    category: categoryDoc
                }
            });
        } else {
            throw new Error('Failed to update restaurant with new category');
        }

    } catch (error) {
        console.error('Error creating category:', error);
        return res.status(500).json({
            status: false,
            error: 'Error creating category',
            details: error.message
        });
    } finally {
        if (client) {
            await client.close();
        }
    }
};



const editmenuCategory = async (req, res) => {
    const { categoryId, restaurantId, name } = req.body

    try {
        if (!categoryId || !restaurantId || !name) {
            return res.status(400).json({
                status: false,
                error: 'Category ID, restaurant ID, and new name are required'
            })
        }
        const client = new MongoClient(uri)
        await client.connect();

        const db = client.db('hungerX')
        const restaurantCollection = db.collection('restaurants')

        const restaurant = await restaurantCollection.findOne({
            _id: new ObjectId(restaurantId)
        })
        if (!restaurant) {
            await client.close();
            return res.status(404).json({
                status: false,
                error: 'Restarant not found'
            })
        }
        const existingCategory = restaurant.menuCategories?.find(
            cat => cat._id.toString() === categoryId
        );
        if (!existingCategory) {
            await client.close;
            return res.status(404).json({
                status: false,
                error: 'Category not found'
            })
        }

        const nameConflict = restaurant.menuCategories.some(
            cat => cat._id.toString() !== categoryId &&
                cat.name.toLowerCase() === name.toLowerCase()
        );
        if (nameConflict) {
            await client.close()
            return res.status(400).json({
                status: false,
                error: 'Another category with this name already exists'
            })
        }

        const result = await restaurantCollection.updateOne(
            {
                _id: new ObjectId(restaurantId),
                'menuCategories._id': new ObjectId(categoryId)
            },
            {
                $set: {
                    'menuCategories.$.name': name,
                    'menuCategories.$.updatedAt': new Date(),
                    updatedAt: new Date()
                }
            }
        );

        await client.close()

        if (result.modifiedCount > 0) {
            res.status(200).json({
                status: true,
                message: 'Category updated successfully',
                category: {
                    _id: categoryId,
                    name,
                    updatedAt: new Date()
                }
            })
        } else {
            throw new Error('Failed to updating category')
        }
    } catch (error) {
        console.log('Error updating categoty:', error);
        res.status(500).json({
            status: false,
            error: 'Error updating category',
            details: error.message
        })

    }
}


const createMenuSubcategory = async (req, res) => {
    const { categoryId, name, restaurantId } = req.body;

    try {
        if (!categoryId || !name || !restaurantId) {
            return res.status(400).json({
                status: false,
                error: 'Category ID, subcategory name, and restaurant ID are required'
            });
        }

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

        // Find the category using MongoDB ObjectId
        const category = restaurant.menuCategories?.find(cat => cat._id.toString() === categoryId);

        if (!category) {
            await client.close();
            return res.status(404).json({
                status: false,
                error: 'Category not found in this restaurant'
            });
        }

        // Check if subcategory already exists
        if (category.subcategories.some(sub => sub.name.toLowerCase() === name.toLowerCase())) {
            await client.close();
            return res.status(400).json({
                status: false,
                error: 'Subcategory already exists in this category'
            });
        }

        // Create subcategory document with MongoDB ObjectId
        const subcategoryDoc = {
            _id: new ObjectId(), // Using MongoDB ObjectId
            name,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Add subcategory to the category in the restaurant
        const result = await restaurantsCollection.updateOne(
            {
                _id: new ObjectId(restaurantId),
                "menuCategories._id": new ObjectId(categoryId)  // Fixed field name
            },
            {
                $push: { "menuCategories.$.subcategories": subcategoryDoc },  // Fixed field name
                $set: {
                    "menuCategories.$.updatedAt": new Date(),  // Fixed field name
                    updatedAt: new Date()
                }
            }
        );

        await client.close();

        if (result.modifiedCount > 0) {
            res.status(201).json({
                status: true,
                message: 'Subcategory created successfully',
                subcategory: subcategoryDoc
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

const searchMenuSuggestions = async (req, res) => {
    const { query, restaurantId } = req.body;

    try {
        if (!restaurantId) {
            return res.status(400).json({
                status: false,
                error: 'Restaurant ID is required'
            });
        }

        // If query is empty, return recent or popular dishes
        if (!query || query.trim() === '') {
            const restaurant = await Restaurant.findById(restaurantId);
            if (!restaurant || !restaurant.menus) {
                return res.status(404).json({
                    status: false,
                    error: 'Restaurant or menus not found'
                });
            }

            const popularDishes = restaurant.menus.reduce((dishes, menu) => {
                return dishes.concat(
                    menu.dishes
                        .slice(0, 5)
                        .map(dish => ({
                            id: dish.id,
                            name: dish.name,
                            image: dish.image,
                            price: dish.price,
                            menuName: menu.name,
                            category: dish.categoryInfo?.categoryName || null,
                            subcategory: dish.categoryInfo?.subcategoryName || null,
                            type: 'popular'
                        }))
                );
            }, []);

            return res.status(200).json({
                status: true,
                data: {
                    suggestions: popularDishes,
                    type: 'popular_items'
                }
            });
        }

        const restaurant = await Restaurant.findById(restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                status: false,
                error: 'Restaurant not found'
            });
        }

        // Get all matching dishes with different match types
        const suggestions = restaurant.menus.reduce((results, menu) => {
            if (!menu.dishes) return results; // Skip if no dishes

            menu.dishes.forEach(dish => {
                const dishName = dish.name.toLowerCase();
                const searchQuery = query.toLowerCase();

                // Exact match at start
                if (dishName.startsWith(searchQuery)) {
                    results.push({
                        id: dish.id,
                        name: dish.name,
                        image: dish.image,
                        price: dish.price,
                        menuName: menu.name,
                        matchType: 'starts_with',
                        category: dish.categoryInfo?.categoryName || null,
                        subcategory: dish.categoryInfo?.subcategoryName || null,
                        type: 'dish'
                    });
                }
                // Contains match
                else if (dishName.includes(searchQuery)) {
                    results.push({
                        id: dish.id,
                        name: dish.name,
                        image: dish.image,
                        price: dish.price,
                        menuName: menu.name,
                        matchType: 'contains',
                        category: dish.categoryInfo?.categoryName || null,
                        subcategory: dish.categoryInfo?.subcategoryName || null,
                        type: 'dish'
                    });
                }
                // Word match
                else if (dish.name.toLowerCase().split(' ').some(word => word.startsWith(searchQuery))) {
                    results.push({
                        id: dish.id,
                        name: dish.name,
                        image: dish.image,
                        price: dish.price,
                        menuName: menu.name,
                        matchType: 'word_match',
                        category: dish.categoryInfo?.categoryName || null,
                        subcategory: dish.categoryInfo?.subcategoryName || null,
                        type: 'dish'
                    });
                }
            });
            return results;
        }, []);

        // Handle category suggestions - check if menuCategories exists
        let categorySuggestions = [];
        if (restaurant.menuCategories && Array.isArray(restaurant.menuCategories)) {
            categorySuggestions = restaurant.menuCategories
                .filter(category =>
                    category.name.toLowerCase().includes(query.toLowerCase())
                )
                .map(category => ({
                    id: category._id,
                    name: category.name,
                    type: 'category',
                    matchType: 'category',
                    dishCount: category.dishes ? category.dishes.length : 0
                }));
        }

        // Sort suggestions by relevance
        const sortedSuggestions = [
            ...suggestions.sort((a, b) => {
                const matchTypeOrder = {
                    'starts_with': 0,
                    'contains': 1,
                    'word_match': 2
                };
                return matchTypeOrder[a.matchType] - matchTypeOrder[b.matchType];
            }).slice(0, 8),
            ...categorySuggestions.slice(0, 3)
        ];

        // Group similar items
        const groupedSuggestions = sortedSuggestions.reduce((groups, item) => {
            const key = item.type;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        }, {});

        return res.status(200).json({
            status: true,
            data: {
                query: query,
                suggestions: groupedSuggestions,
                restaurant: {
                    _id: restaurant._id,
                    name: restaurant.name,
                    logo: restaurant.logo
                },
                totalResults: sortedSuggestions.length
            }
        });

    } catch (error) {
        console.error("Error getting search suggestions:", error);
        return res.status(500).json({
            status: false,
            error: 'Failed to get search suggestions'
        });
    }
};

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


// const getRestaurantCategories = async (req, res) => {
//     const { restaurantId } = req.body; // or req.body depending on how you send the data

//     try {
//         const client = new MongoClient(uri);
//         await client.connect();

//         const db = client.db('hungerX');
//         const restaurantsCollection = db.collection('restaurants');
//         const categoriesCollection = db.collection('menucategories');

//         // First, find the restaurant and get its menus
//         const restaurant = await restaurantsCollection.findOne({
//             _id: new ObjectId(restaurantId)
//         });

//         if (!restaurant) {
//             await client.close();
//             return res.status(404).json({
//                 status: false,
//                 error: 'Restaurant not found'
//             });
//         }

//         // Get unique category IDs from all dishes in all menus
//         const categoryIds = new Set();
//         restaurant.menus.forEach(menu => {
//             if (menu.dishes && Array.isArray(menu.dishes)) {
//                 menu.dishes.forEach(dish => {
//                     if (dish.category && dish.category._id) {
//                         categoryIds.add(dish.category._id.toString());
//                     }
//                 });
//             }
//         });

//         // Fetch only the categories that are used in this restaurant
//         const categories = await categoriesCollection.find({
//             _id: { 
//                 $in: Array.from(categoryIds).map(id => new ObjectId(id)) 
//             }
//         }).sort({ name: 1 }).toArray();

//         // Format the response
//         const formattedCategories = categories.map(category => {
//             // Count dishes in this category
//             let dishCount = 0;
//             restaurant.menus.forEach(menu => {
//                 if (menu.dishes && Array.isArray(menu.dishes)) {
//                     dishCount += menu.dishes.filter(dish => 
//                         dish.category && 
//                         dish.category._id && 
//                         dish.category._id.toString() === category._id.toString()
//                     ).length;
//                 }
//             });

//             return {
//                 _id: category._id,
//                 name: category.name,
//                 subcategories: category.subcategories.map(sub => ({
//                     _id: sub._id,
//                     name: sub.name,
//                     dishCount: countDishesInSubcategory(restaurant.menus, sub._id)
//                 })).sort((a, b) => a.name.localeCompare(b.name)),
//                 totalSubcategories: category.subcategories.length,
//                 dishCount,
//                 createdAt: category.createdAt,
//                 updatedAt: category.updatedAt
//             };
//         });

//         await client.close();

//         res.status(200).json({
//             status: true,
//             data: {
//                 restaurant: {
//                     _id: restaurant._id,
//                     name: restaurant.name,
//                     logo: restaurant.logo
//                 },
//                 categories: formattedCategories
//             }
//         });

//     } catch (error) {
//         console.error('Error fetching restaurant categories:', error);
//         res.status(500).json({
//             status: false,
//             error: 'Error fetching restaurant categories',
//             details: error.message
//         });
//     }
// };

// Helper function to count dishes in a subcategory
// const countDishesInSubcategory = (menus, subcategoryId) => {
//     let count = 0;
//     menus.forEach(menu => {
//         if (menu.dishes && Array.isArray(menu.dishes)) {
//             count += menu.dishes.filter(dish => 
//                 dish.category && 
//                 dish.subcategory && 
//                 dish.subcategory._id && 
//                 dish.subcategory._id.toString() === subcategoryId.toString()
//             ).length;
//         }
//     });
//     return count;
// };


// const getAllMenuCategoriesAndSubcategories = async (req, res) => {
//     try {
//         const client = new MongoClient(uri);
//         await client.connect();

//         const db = client.db('hungerX');
//         const categoriesCollection = db.collection('menucategories');

//         // Fetch all categories from menucategories collection
//         const categories = await categoriesCollection.find({})
//             .sort({ name: 1 }) // Sort categories alphabetically
//             .toArray();

//         // Format the response
//         const formattedCategories = categories.map(category => ({
//             _id: category._id,
//             name: category.name,
//             subcategories: (category.subcategories || []).map(sub => ({
//                 _id: sub._id,
//                 name: sub.name,
//                 createdAt: sub.createdAt || null,
//                 updatedAt: sub.updatedAt || null
//             })).sort((a, b) => a.name.localeCompare(b.name)), // Sort subcategories alphabetically
//             totalSubcategories: (category.subcategories || []).length,
//             createdAt: category.createdAt || null,
//             updatedAt: category.updatedAt || null
//         }));

//         // Optional: Group categories by first letter
//         const categoriesByLetter = formattedCategories.reduce((acc, category) => {
//             const firstLetter = category.name.charAt(0).toUpperCase();
//             if (!acc[firstLetter]) {
//                 acc[firstLetter] = [];
//             }
//             acc[firstLetter].push(category);
//             return acc;
//         }, {});

//         // Convert to array and sort alphabetically
//         const groupedCategories = Object.entries(categoriesByLetter)
//             .sort(([a], [b]) => a.localeCompare(b))
//             .map(([letter, categories]) => ({
//                 letter,
//                 categories
//             }));

//         await client.close();

//         res.status(200).json({
//             status: true,
//             data: {
//                 totalCategories: formattedCategories.length,
//                 totalSubcategories: formattedCategories.reduce(
//                     (sum, cat) => sum + cat.totalSubcategories, 0
//                 ),
//                 // You can choose to return either or both formats
//                 categories: formattedCategories,          // Flat list
//                 categoriesGrouped: groupedCategories      // Grouped by letter
//             }
//         });

//     } catch (error) {
//         console.error('Error fetching categories:', error);
//         res.status(500).json({
//             status: false,
//             error: 'Error fetching categories',
//             details: error.message
//         });
//     }
// };


const addDishToCategory = async (req, res) => {
    const {
        restaurantId,
        menuId,
        categoryId,
        subcategoryId,
        dishId
    } = req.body;

    try {
        if (!restaurantId || !menuId || !categoryId || !dishId) {
            return res.status(400).json({
                status: false,
                error: 'Restaurant ID, menu ID, category ID, and dish ID are required'
            });
        }

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

        // Find the category
        const category = restaurant.menuCategories?.find(
            cat => cat._id.toString() === categoryId
        );
        if (!category) {
            await client.close();
            return res.status(404).json({
                status: false,
                error: 'Category not found in restaurant'
            });
        }

        // Find subcategory if provided
        let subcategory;
        if (subcategoryId) {
            subcategory = category.subcategories?.find(
                sub => sub._id.toString() === subcategoryId
            );
            if (!subcategory) {
                await client.close();
                return res.status(404).json({
                    status: false,
                    error: 'Subcategory not found in category'
                });
            }
        }

        // Add category info to the dish in menus array
        const result = await restaurantsCollection.updateOne(
            {
                _id: new ObjectId(restaurantId),
                'menus.id': menuId,
                'menus.dishes.id': dishId
            },
            {
                $set: {
                    'menus.$[menu].dishes.$[dish].categoryInfo': {
                        categoryId: new ObjectId(categoryId),
                        categoryName: category.name,
                        subcategoryId: subcategoryId ? new ObjectId(subcategoryId) : undefined,
                        subcategoryName: subcategory ? subcategory.name : undefined
                    },
                    'menus.$[menu].dishes.$[dish].updatedAt': new Date()
                }
            },
            {
                arrayFilters: [
                    { 'menu.id': menuId },
                    { 'dish.id': dishId }
                ]
            }
        );

        await client.close();

        if (result.modifiedCount > 0) {
            res.status(200).json({
                status: true,
                message: 'Category information added to dish successfully'
            });
        } else {
            throw new Error('Failed to add category information to dish');
        }

    } catch (error) {
        console.error('Error adding category information to dish:', error);
        res.status(500).json({
            status: false,
            error: 'Error adding category information to dish',
            details: error.message
        });
    }
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
        restaurantId,    
        menuId          
    } = req.body;

    try {
        // Required field validation
        if (!name || !price || !restaurantId || !menuId) {
            return res.status(400).json({
                status: false,
                error: 'Name, price, restaurantId, and menuId are required'
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

        // Validate menuId format
        if (!menuId.startsWith('bk-menu-')) {
            return res.status(400).json({
                status: false,
                error: 'Invalid Menu ID format - must start with "bk-menu-"'
            });
        }

        const client = new MongoClient(uri);
        await client.connect();

        const db = client.db('hungerX');
        const restaurantsCollection = db.collection('restaurants');

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

        // Find maximum dish number with safer logic
        let maxDishNumber = 0;
        if (restaurant.menus && Array.isArray(restaurant.menus)) {
            restaurant.menus.forEach(menu => {
                if (menu.dishes && Array.isArray(menu.dishes)) {
                    menu.dishes.forEach(dish => {
                        if (dish.id) {
                            const match = dish.id.match(/bk-dish-(\d+)/);
                            if (match) {
                                const num = parseInt(match[1]);
                                if (!isNaN(num)) {
                                    maxDishNumber = Math.max(maxDishNumber, num);
                                }
                            }
                        }
                    });
                }
            });
        }

        const newDishId = `bk-dish-${(maxDishNumber + 1).toString().padStart(3, '0')}`;

        // Create new dish document
        const now = new Date();
        const newDish = {
            id: newDishId,
            name,
            ...(req.file?.location && { image: req.file.location }),
            price: parseFloat(price),
            ...(rating && { rating: parseFloat(rating) }),
            ...(description && { description }),
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
} 

const editDish = async (req, res) => {
    try {
        const {
            dishId,        // Custom format: bk-dish-XXX
            restaurantId,  // MongoDB ObjectId
            menuId,        // Custom format: bk-menu-XXX
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

        // Prepare update fields
        const updateFields = {
            ...(updateData.name && { "menus.$[menu].dishes.$[dish].name": updateData.name }),
            ...(updateData.price && { "menus.$[menu].dishes.$[dish].price": parseFloat(updateData.price) }),
            ...(updateData.description && { "menus.$[menu].dishes.$[dish].description": updateData.description }),
            ...(updateData.rating && { "menus.$[menu].dishes.$[dish].rating": parseFloat(updateData.rating) }),
            
            // Handle servingInfo
            ...(updateData.servingSize && updateData.servingUnit && {
                "menus.$[menu].dishes.$[dish].servingInfo": {
                    size: parseFloat(updateData.servingSize),
                    unit: updateData.servingUnit,
                    equivalentTo: `${updateData.servingSize} ${updateData.servingUnit} ${updateData.name || 'of dish'}`
                }
            }),

            // Handle nutritionFacts
            ...((updateData.calories || updateData.carbs || updateData.protein || updateData.fats) && {
                "menus.$[menu].dishes.$[dish].nutritionFacts": {
                    ...(updateData.calories && { calories: parseInt(updateData.calories) }),
                    ...(updateData.carbs && { totalCarbohydrates: { value: parseFloat(updateData.carbs) } }),
                    ...(updateData.protein && { protein: { value: parseFloat(updateData.protein) } }),
                    ...(updateData.fats && { totalFat: { value: parseFloat(updateData.fats) } })
                }
            }),
            
            "menus.$[menu].dishes.$[dish].updatedAt": new Date()
        };

        // Handle image upload if provided
        if (req.file?.location) {
            updateFields["menus.$[menu].dishes.$[dish].image"] = req.file.location;
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


const getAllMenuCategories = async (req, res) => {
    const { restaurantId } = req.body; // Get restaurantId from URL params

    try {
        if (!restaurantId || !ObjectId.isValid(restaurantId)) {
            return res.status(400).json({
                status: false,
                error: 'Valid restaurant ID is required'
            });
        }

        const client = new MongoClient(uri);
        await client.connect();

        const db = client.db('hungerX');
        const restaurantsCollection = db.collection('restaurants');

        // Find the restaurant and project only menuCategories with _id and name
        const restaurant = await restaurantsCollection.findOne(
            { _id: new ObjectId(restaurantId) },
            { projection: { 'menuCategories._id': 1, 'menuCategories.name': 1 } }
        );

        await client.close();

        if (!restaurant) {
            return res.status(404).json({
                status: false,
                error: 'Restaurant not found'
            });
        }

        // Extract and format menu categories
        const menuCategories = restaurant.menuCategories?.map(category => ({
            _id: category._id,
            name: category.name
        })) || [];

        return res.status(200).json({
            status: true,
            menuCategories
        });

    } catch (error) {
        console.error('Error fetching menu categories:', error);
        res.status(500).json({
            status: false,
            error: 'Error fetching menu categories',
            details: error.message
        });
    }
};


const showAllMenuAndSubCategories = async (req, res) => {
    const { restaurantId } = req.body
    try {
        if (!restaurantId && !ObjectId.isValid(restaurantId)) {
            return res.status(400).json({
                status: false,
                error: 'Valid restaurant ID is required'
            })
        }
        const client = new MongoClient(uri)
        await client.connect()

        const db = client.db('hungerX')
        const restaurantsCollection = db.collection('restaurants')

        const restaurant = await restaurantsCollection.findOne(
            { _id: new ObjectId(restaurantId) },
            {
                projection: {
                    'menuCategories._id': 1,
                    'menuCategories.name': 1,
                    'menuCategories.subcategories': 1
                }
            }
        )
        await client.close();

        if (!restaurant) {
            return res.status(404).json({
                status: false,
                error: 'Restaurant not found'
            })
        }
        return res.status(200).json({
            status: true,
            restaurant
        })
    } catch (error) {
        console.error('Error fetching menu categories:', error);
        res.status(500).json({
            status: false,
            error: 'Error fetching menu categories',
            details: error.message
        });
    }
}

const getRestaurantDishesByCategory = async (req, res) => {
    const { categoryId, subcategoryId, restaurantId } = req.body;

    try {
        if (!restaurantId || !categoryId) {
            return res.status(400).json({
                status: false,
                error: 'Restaurant ID and Category ID are required'
            });
        }

        const client = new MongoClient(uri);
        await client.connect();

        const db = client.db('hungerX');
        const restaurantsCollection = db.collection('restaurants');

        // Build the match conditions for filtering dishes
        const dishMatchCondition = {
            'menus.dishes.categoryInfo.categoryId': new ObjectId(categoryId)
        };

        if (subcategoryId) {
            dishMatchCondition['menus.dishes.categoryInfo.subcategoryId'] = new ObjectId(subcategoryId);
        }

        // Find restaurant and filter dishes by category
        const restaurant = await restaurantsCollection.aggregate([
            // Match the specific restaurant
            {
                $match: {
                    _id: new ObjectId(restaurantId)
                }
            },

            // Unwind the menus array
            { $unwind: '$menus' },

            // Unwind the dishes array
            { $unwind: '$menus.dishes' },

            // Match dishes with the specified category
            {
                $match: dishMatchCondition
            },

            // Group back to restaurant structure
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    logo: { $first: '$logo' },
                    menuId: { $first: '$menus.id' },
                    menuName: { $first: '$menus.name' },
                    dishes: {
                        $push: {
                            id: '$menus.dishes.id',
                            name: '$menus.dishes.name',
                            image: '$menus.dishes.image',
                            description: '$menus.dishes.description',
                            price: '$menus.dishes.price',
                            servingInfo: '$menus.dishes.servingInfo',
                            nutritionFacts: '$menus.dishes.nutritionFacts',
                            categoryInfo: '$menus.dishes.categoryInfo',
                            updatedAt: '$menus.dishes.updatedAt'
                        }
                    }
                }
            }
        ]).toArray();

        await client.close();

        if (restaurant.length === 0) {
            return res.status(404).json({
                status: false,
                message: 'No dishes found for the specified category in this restaurant',
                data: null
            });
        }

        // Get the category name from menuCategories
        const categoryName = restaurant[0].dishes[0]?.categoryInfo?.categoryName || 'Unknown Category';
        const subcategoryName = restaurant[0].dishes[0]?.categoryInfo?.subcategoryName;

        // Format the response
        const response = {
            restaurantInfo: {
                id: restaurant[0]._id,
                name: restaurant[0].name,
                logo: restaurant[0].logo
            },
            menuInfo: {
                id: restaurant[0].menuId,
                name: restaurant[0].menuName
            },
            categoryInfo: {
                id: categoryId,
                name: categoryName,
                subcategory: subcategoryId ? {
                    id: subcategoryId,
                    name: subcategoryName
                } : null
            },
            dishes: restaurant[0].dishes.map(dish => ({
                id: dish.id,
                name: dish.name,
                image: dish.image,
                description: dish.description,
                price: dish.price,
                servingInfo: dish.servingInfo,
                nutritionFacts: dish.nutritionFacts,
                updatedAt: dish.updatedAt
            }))
        };

        res.status(200).json({
            status: true,
            message: 'Dishes retrieved successfully',
            count: response.dishes.length,
            data: response
        });

    } catch (error) {
        console.error('Error getting restaurant dishes by category:', error);
        res.status(500).json({
            status: false,
            error: 'Error retrieving dishes',
            details: error.message
        });
    }
};

module.exports = {
    getRestaurantNames, addRestaurantCategory, getAllcategories, addRestaurant, editRestaurant, searchRestaurant,
    getRestaurantMenu, searchMenuSuggestions, editDish, addDish, filterMenuByCategory, createMenuCategory, createMenuSubcategory
    , addDishToCategory, getAllMenuCategories, showAllMenuAndSubCategories, getRestaurantDishesByCategory, editmenuCategory
}