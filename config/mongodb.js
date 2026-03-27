const mongoose = require('mongoose');
require('dotenv').config();

const connectMongoDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medicare';
        await mongoose.connect(mongoURI);
        console.log('📦 MongoDB Connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

module.exports = connectMongoDB;
