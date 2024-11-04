// const Restaurant = require('../models/restaurantModel')
// const  {initializeGridFSBucket} = require('../gridfsServices')
// require('dotenv').config();
// // const { Readable } = require('stream');

// const validateJSON = (data) => {
//     try {
//         JSON.parse(data);
//         return true;
//     } catch (error) {
//         console.error("JSON Validation Error:", error.message);
//         return false;
//     }
// };


// const getRestaurantNames = async (req, res) => {
//     try {
//         const bucket = await initializeGridFSBucket();
//         const file = await bucket.find({ filename: 'nutritionix_restaurant.json' }).toArray();
        
//         if (file.length === 0) {
//             return res.status(404).json({ message: 'File not found' });
//         }

//         const downloadStream = bucket.openDownloadStream(file[0]._id);
//         const chunks = [];  // Array to store each chunk of data

//         downloadStream.on('data', chunk => {
//             chunks.push(chunk);  // Store each chunk in the array
//         });

//         downloadStream.on('end', () => {
//             const data = Buffer.concat(chunks).toString();  // Combine all chunks and convert to string
            
//             if (validateJSON(data)) {  // Validate the JSON data
//                 const restaurantData = JSON.parse(data);  // Parse JSON data safely
//                 const restaurantNames = restaurantData.restaurants.map(restaurant => restaurant.name);  // Extract names
//                 res.status(200).json(restaurantNames);  // Send response with names
//             } else {
//                 res.status(500).json({ message: 'Invalid JSON format' });  // Send error response
//             }
//         });

//         downloadStream.on('error', error => {
//             console.error('Error reading from GridFS:', error);
//             res.status(500).json({ message: 'Error reading restaurant data' });
//         });
//     } catch (error) {
//         console.error('Error fetching restaurant names:', error);
//         res.status(500).json({ message: 'Error fetching restaurant names' });
//     }
// };

// module.exports = { getRestaurantNames };