const mongoose = require('mongoose');
require('dotenv').config();
const { MongoClient } = require('mongodb');
const Category = require('../models/categoryModel')


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

const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({}, { strict: false }));

const addRestaurant = async(req,res)=>{
    const {category: categoryId, rating, description} = req.body
    try {
        // Check if the category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                 status : false,
                 data:{
                    error: 'Category not found' 
                 }
            });
        }

        // Create and save the restaurant
        const restaurant = new Restaurant({
            logo,
            category: categoryId,  // Linking to Category ID
            rating,
            description,
            // date: new Date(),       // Optionally add the current date
            // time: new Date().toTimeString().split(' ')[0] // Optional: add current time in HH:MM:SS format
        });

        await restaurant.save();

        res.status(201).json({
            message: 'Restaurant added successfully',
            restaurant
        });
    } catch (error) {
        res.status(500).json({ error: 'Error adding restaurant' });
    }
}


const editRestaurant = async (req, res) => {
    const { name, category,restaurantId, rating, description } = req.body;

    try {
        // Check if the restaurant exists
        const restaurant = await Restaurant.findById({_id:restaurantId});
        console.log(restaurant);
        
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }

        // Optional: Check if the category exists
        if (category) {
            const categoryExists = await Category.findById(category);
            if (!categoryExists) {
                return res.status(404).json({ error: 'Category not found' });
            }
        }

        const updateFields = {};
        if (name) updateFields.name = name;
        if (category) updateFields.category = category;
        if (rating) updateFields.rating = rating;
        if (description) updateFields.description = description;

        // Update the restaurant using restaurantId
        const updatedRestaurant = await Restaurant.findByIdAndUpdate(
            restaurantId,
            { $set: updateFields },
            { new: true }  // `new: true` ensures it returns the updated document
        );
        console.log(updatedRestaurant);
        

        if (!updatedRestaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }

        res.status(200).json({
            message: 'Restaurant updated successfully',
            restaurant: updatedRestaurant
        });
    } catch (error) {
        res.status(500).json({ error: 'Error updating restaurant' });
    }
};

const searchRestuarant = async(req,res)=>{
    const {name} = req.body
    try {
        const  restaurants = await Restaurant.find({
            name: { $regex: name, $options: 'i' }
        }).select('name')
        res.status(200).json({
            message: 'Restaurants fetched successfully',
            restaurants
        });
    } catch (error) {
        console.error('Error searching for restaurants:', error);
        res.status(500).json({ error: 'Failed to search for restaurants' });
    }
}

module.exports = { getRestaurantNames, addCategory, getAllcategories,addRestaurant,editRestaurant,searchRestuarant }