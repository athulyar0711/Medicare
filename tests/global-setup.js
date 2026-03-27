import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function setup() {
    console.log('🚀 Global Setup: Resetting MySQL Test DB...');
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2411',
        multipleStatements: true,
    });

    const sqlFile = path.join(__dirname, '../database/schema_test.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Run the whole script at once using multipleStatements
    await pool.query(sql);
    await pool.end();
    console.log('✅ Global MySQL Reset Complete.');
}
