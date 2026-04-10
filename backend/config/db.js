// Import mongoose library to connect MongoDB
const mongoose = require("mongoose");

// Function to connect database
const connectDB = async () => {
    try {
        // Connect to MongoDB using connection string from .env
        const conn = await mongoose.connect(process.env.MONGO_URI);

        // Success message
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        // Error message
        console.error(`MongoDB Connection Error: ${error.message}`);

        // Exit process with failure
        process.exit(1);
    }
};

// Export function
module.exports = connectDB;
