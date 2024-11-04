const express = require('express');
const dotenv = require('dotenv');
const {connectDB }= require('./config/db');
const fileRoutes = require('./routes/fileRoutes');
const adminRoutes = require('./routes/adminRoutes');
// const restaurantRoutes = require('./routes/restaurantRoutes')
const cors = require('cors');
// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

app.use(cors());
// Middleware to parse JSON
app.use(express.json());

// Routes
app.use('/admin', adminRoutes);
app.use('/files', fileRoutes); 
// app.use('/restaurant',restaurantRoutes)

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
