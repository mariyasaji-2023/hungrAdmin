// models/Restaurant.js
const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        // required: true
    },
    logo: { // stores the ID of the logo file in GridFS
        type: String,
        // required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
module.exports = Restaurant;
