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
        const restaurantNameAndLogo = await collection.find({}, { projection: { name: 1, logo: 1 } }).toArray();
        return res.status(200).json({
            restaurantNameAndLogo
        });
    } catch (error) {
        console.error("Error fetching restaurant names:", error);
        return res.status(500).json({ error: "Failed to fetch restaurant names" });
    } finally {
        // Close the MongoDB connection
        await client.close();
    }
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


const addRestaurant = async (req, res) => {
    const { category: categoryId, rating, description, name } = req.body;

    try {
        // Check if we have a file
        if (!req.file) {
            return res.status(400).json({ 
                status: false,
                error: 'No logo file provided' 
            });
        }

        // Get the file location from S3/DigitalOcean Spaces
        const logo = req.file.location;
        
        if (!logo) {
            return res.status(400).json({ 
                status: false,
                error: 'Logo upload failed' 
            });
        }

        // Connect to MongoDB directly to insert into existing collection
        const client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db('hungerX');
        const collection = db.collection('restaurants');

        // Create restaurant document
        const restaurantDoc = {
            name,
            logo,
            category: categoryId,
            rating: parseFloat(rating),
            description,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Insert the restaurant
        const result = await collection.insertOne(restaurantDoc);

        // Close the connection
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
        // Log the entire req.body to debug
        console.log('Request body:', req.body);
        
        // Get restaurantId from form-data
        const restaurantId = req.body.restaurantId;
        console.log('Received restaurantId:', restaurantId);

        if (!restaurantId) {
            return res.status(400).json({
                status: false,
                error: 'Restaurant ID is required'
            });
        }

        // Connect to MongoDB directly
        const client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db('hungerX');
        const collection = db.collection('restaurants');

        // Check if restaurant exists
        const existingRestaurant = await collection.findOne({ 
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

        // Prepare update fields
        const updateFields = {
            updatedAt: new Date()
        };

        // Get other fields from form-data
        if (req.body.name) updateFields.name = req.body.name;
        if (req.body.category) updateFields.category = req.body.category;
        if (req.body.rating) updateFields.rating = parseFloat(req.body.rating);
        if (req.body.description) updateFields.description = req.body.description;

        // Handle logo upload if file is provided
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

        // Update the restaurant
        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(restaurantId) },
            { $set: updateFields },
            { returnDocument: 'after' }
        );

        // Close the connection
        await client.close();

        // Changed the result checking logic
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
        }).select('name logo _id'); // Add 'logo' and '_id' to the select fields
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


module.exports = { getRestaurantNames, addCategory, getAllcategories,addRestaurant,editRestaurant,searchRestaurant,
    getRestaurantMenu,createmenuCategory,createMenuSubcategory
 }