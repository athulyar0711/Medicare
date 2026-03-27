const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.NODE_ENV === 'test' ? 'medicare_test' : (process.env.DB_NAME || 'medicare'),
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
});

module.exports = pool;
