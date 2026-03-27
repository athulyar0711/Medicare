/**
 * tests/setup.js
 * ---------------------------------------------------------------
 * Shared test setup utility for the MEDICARE test suite.
 *
 * Usage in any test file:
 *   import { resetDB, seedDB, closeDB, getPool } from './setup.js';
 *
 *   beforeAll(async () => { await resetDB(); });
 *   afterAll(async ()  => { await closeDB(); });
 * ---------------------------------------------------------------
 */

import mysql from 'mysql2/promise';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { vi } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Connection pool (reused across tests) ────────────────────────
let pool;

export function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host:     process.env.DB_HOST     || 'localhost',
            user:     process.env.DB_USER     || 'root',
            password: process.env.DB_PASSWORD || '2411',
            // Do not specify database here so we can drop/create it
            multipleStatements: true,
            waitForConnections: true,
            connectionLimit: 5,
        });
    }
    return pool;
}

export async function resetDB() {
    const p = getPool();
    const sqlFile = path.join(__dirname, '../database/schema_test.sql');
    let sql = fs.readFileSync(sqlFile, 'utf8');
    
    // 1. Ensure DB exists and we're using it
    await p.query('CREATE DATABASE IF NOT EXISTS medicare_test');
    await p.query('USE medicare_test');

    // 2. Drop all existing tables to ensure a clean slate
    const [tables] = await p.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    if (tableNames.length > 0) {
        await p.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const table of tableNames) {
            await p.query(`DROP TABLE IF EXISTS ${table}`);
        }
        await p.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    // 3. Remove comments and split statements
    sql = sql.replace(/\/\*[\s\S]*?\*\/|--.*|#.*/g, '');
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 5 && !s.toUpperCase().startsWith('CREATE DATABASE') && !s.toUpperCase().startsWith('USE') && !s.toUpperCase().startsWith('DROP DATABASE'));

    for (const stmt of statements) {
        try {
            await p.query(stmt);
        } catch (err) {
            console.error(`❌ Error executing statement: ${stmt.substring(0, 50)}...`);
            console.error(err.message);
            throw err;
        }
    }
    console.log('✅ MySQL test DB reset complete.');
}

// ── Reset MongoDB: drop all collections in medicare_test ───────────
export async function resetMongo() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medicare_test';
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri);
    }
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
        await mongoose.connection.db.dropCollection(col.name);
    }
    console.log('✅ MongoDB test collections cleared.');
}

// ── Close all connections ──────────────────────────────────────────
export async function closeDB() {
    if (pool) {
        await pool.end();
        pool = null;
    }
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
}

// ── Convenience: reset both MySQL and MongoDB together ─────────────
export async function resetAll() {
    await resetDB();
    await resetMongo();
}

// ── Seed helpers: return commonly needed test IDs ──────────────────
export const TEST_DATA = {
    // These IDs match what schema_test.sql seeds
    admin:   { userId: 1, email: 'admin@medicare.test',  password: 'TestPass1!' },
    patient: { userId: 2, email: 'alice@medicare.test',  password: 'TestPass1!', patientId: 1 },
    patient2:{ userId: 3, email: 'bob@medicare.test',    password: 'TestPass1!', patientId: 2 },
    doctor:  { userId: 4, email: 'rahul@medicare.test',  password: 'TestPass1!', doctorId: 1 },
    hospital:{ id: 1,     name: 'City General Hospital' },
    hospital2:{ id: 2,    name: 'St. Mary Medical Centre' },
};
