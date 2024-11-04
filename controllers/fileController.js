require('dotenv').config();
// const restaurants = require('../models/restaurantModel')
const { MongoClient } = require('mongodb');

// MongoDB connection URI
const uri = 'mongodb+srv://hungrx001:Os4GO3Iajie9lvGr@hungrx.8wv0t.mongodb.net/hungerX';

const getRestaurantNames = async (req, res) => {
    const client = new MongoClient(uri);

    try {
        // Connect to MongoDB
        await client.connect();
        console.log("Connected to MongoDB");

        // Access the database and collection
        const db = client.db('hungerX');
        const collection = db.collection('restaurants');

        // Query to get only the 'name' and 'logo' fields
        const restaurantNameAndLogo = await collection.find({}, { projection: { name: 1, logo: 1, _id: 0 } }).toArray();

        // Send the response
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
 module.exports = {getRestaurantNames}