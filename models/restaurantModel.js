const mongoose = require('mongoose');

// Define the schema for Restaurant without setting any field as immutable
const restaurantSchema = new mongoose.Schema({
    name: { type: String,},
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    rating: { type: Number },
    description: { type: String },
    logo: { type: String } 
});

// Create the model
module.exports = mongoose.model('Restaurant', restaurantSchema);
