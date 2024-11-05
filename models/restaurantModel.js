// models/Restaurant.js
const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        // required: true
    },
    categoryType: { // stores the ID of the logo file in GridFS
        type: String,
        // required: true
    },
    rating: {
        type: String
    },
    discription:{
        type :String
    },
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
module.exports = Restaurant;
