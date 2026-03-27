const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role, phone, address, specialization, schedules } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Name, email, password, and role are required.' });
        }
        if (!['patient', 'doctor_user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role.' });
        }

        // Check if email already exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into users
        const [userResult] = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role]
        );
        const userId = userResult.insertId;

        if (role === 'patient') {
            await pool.query(
                'INSERT INTO patients (user_id, phone, address) VALUES (?, ?, ?)',
                [userId, phone || null, address || null]
            );
        } else if (role === 'doctor_user') {
            // Check if doctor already exists by email
            let doctorId;
            const [existingDoctor] = await pool.query('SELECT id FROM doctors WHERE email = ?', [email]);

            if (existingDoctor.length > 0) {
                doctorId = existingDoctor[0].id;
                await pool.query('UPDATE doctors SET is_app_user = TRUE WHERE id = ?', [doctorId]);
            } else {
                const [doctorResult] = await pool.query(
                    'INSERT INTO doctors (name, email, specialization, phone, is_app_user) VALUES (?, ?, ?, ?, TRUE)',
                    [name, email, specialization || 'General Medicine', phone || null]
                );
                doctorId = doctorResult.insertId;
            }

            await pool.query(
                'INSERT INTO doctor_users (doctor_id, user_id) VALUES (?, ?)',
                [doctorId, userId]
            );

            // Insert multiple schedules if provided
            if (schedules && Array.isArray(schedules) && schedules.length > 0) {
                for (const sched of schedules) {
                    if (sched.hospital_id && sched.day_of_week && sched.start_time && sched.end_time) {
                        // Check if schedule already exists to prevent duplicates (optional but good practice)
                        const [existingSched] = await pool.query(
                            'SELECT id FROM doctor_hospital_schedule WHERE doctor_id = ? AND hospital_id = ? AND day_of_week = ?',
                            [doctorId, sched.hospital_id, sched.day_of_week]
                        );
                        if (existingSched.length === 0) {
                            await pool.query(
                                'INSERT INTO doctor_hospital_schedule (doctor_id, hospital_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
                                [doctorId, sched.hospital_id, sched.day_of_week, sched.start_time, sched.end_time]
                            );
                        } else {
                            await pool.query(
                                'UPDATE doctor_hospital_schedule SET start_time = ?, end_time = ? WHERE id = ?',
                                [sched.start_time, sched.end_time, existingSched[0].id]
                            );
                        }
                    }
                }
            }
        }
        // For admin, only insert into users (already done)

        // Generate token
        const token = jwt.sign(
            { id: userId, email, role, name },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({ message: 'Account created successfully.', token, role, name });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Server error during signup.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = users[0];
        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is deactivated.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Update last_login
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ message: 'Login successful.', token, role: user.role, name: user.name });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// GET /api/auth/profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, email, role, is_active, last_login, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json(users[0]);
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/auth/hospitals - Public list of hospitals for signup
router.get('/hospitals', async (req, res) => {
    try {
        const [hospitals] = await pool.query('SELECT id, name FROM hospitals ORDER BY name');
        res.json(hospitals);
    } catch (err) {
        console.error('Hospitals fetch error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
