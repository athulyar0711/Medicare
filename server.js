require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectMongoDB = require('./config/mongodb');

const app = express();

// Increase JSON limit to handle large base64 image strings
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
connectMongoDB();

// Middleware
app.use(cors());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/files', require('./routes/files'));
app.use('/api/chat', require('./routes/chat'));

// Start push notification scheduler
require('./pushScheduler')();

// Catch-all: serve auth.html for any non-API route
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🏥 MEDICARE Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
