const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// All routes require admin role
router.use(verifyToken, requireRole('admin'));

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const [patients] = await pool.query('SELECT COUNT(*) AS total FROM patients');
        const [appointments] = await pool.query('SELECT COUNT(*) AS total FROM appointments');
        const [activeToday] = await pool.query(
            'SELECT COUNT(*) AS total FROM users WHERE DATE(last_login) = CURDATE()'
        );
        const [doctors] = await pool.query('SELECT COUNT(*) AS total FROM doctors');
        const [hospitals] = await pool.query('SELECT COUNT(*) AS total FROM hospitals');

        res.json({
            totalPatients: patients[0].total,
            totalAppointments: appointments[0].total,
            activeUsersToday: activeToday[0].total,
            totalDoctors: doctors[0].total,
            totalHospitals: hospitals[0].total
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/admin/doctors - List all doctors
router.get('/doctors', async (req, res) => {
    try {
        const [doctors] = await pool.query(`
            SELECT d.*, GROUP_CONCAT(DISTINCT h.name SEPARATOR ', ') AS hospitals
            FROM doctors d
            LEFT JOIN doctor_hospital_schedule dhs ON d.id = dhs.doctor_id
            LEFT JOIN hospitals h ON dhs.hospital_id = h.id
            GROUP BY d.id
            ORDER BY d.name
        `);
        res.json(doctors);
    } catch (err) {
        console.error('Doctors list error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/admin/doctors - Add new doctor
router.post('/doctors', async (req, res) => {
    try {
        const { name, email, specialization, phone, schedules } = req.body;
        if (!name) return res.status(400).json({ error: 'Doctor name is required.' });

        const [result] = await pool.query(
            'INSERT INTO doctors (name, email, specialization, phone) VALUES (?, ?, ?, ?)',
            [name, email || null, specialization || null, phone || null]
        );
        const newDocId = result.insertId;

        if (schedules && Array.isArray(schedules) && schedules.length > 0) {
            for (const sched of schedules) {
                if (sched.hospital_id && sched.day_of_week && sched.start_time && sched.end_time) {
                    await pool.query(
                        'INSERT INTO doctor_hospital_schedule (doctor_id, hospital_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
                        [newDocId, sched.hospital_id, sched.day_of_week, sched.start_time, sched.end_time]
                    );
                }
            }
        }

        res.status(201).json({ message: 'Doctor added successfully.', id: result.insertId });
    } catch (err) {
        console.error('Add doctor error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/admin/hospitals - List all hospitals
router.get('/hospitals', async (req, res) => {
    try {
        const [hospitals] = await pool.query('SELECT * FROM hospitals ORDER BY name');
        res.json(hospitals);
    } catch (err) {
        console.error('Hospitals list error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/admin/hospitals - Add new hospital
router.post('/hospitals', async (req, res) => {
    try {
        const { name, address, phone } = req.body;
        if (!name) return res.status(400).json({ error: 'Hospital name is required.' });

        const [result] = await pool.query(
            'INSERT INTO hospitals (name, address, phone) VALUES (?, ?, ?)',
            [name, address || null, phone || null]
        );

        res.status(201).json({ message: 'Hospital added successfully.', id: result.insertId });
    } catch (err) {
        console.error('Add hospital error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/admin/schedule - Add doctor schedule
router.post('/schedule', async (req, res) => {
    try {
        const { doctor_id, hospital_id, day_of_week, start_time, end_time } = req.body;
        if (!doctor_id || !hospital_id || !day_of_week || !start_time || !end_time) {
            return res.status(400).json({ error: 'All schedule fields are required.' });
        }

        const [result] = await pool.query(
            'INSERT INTO doctor_hospital_schedule (doctor_id, hospital_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
            [doctor_id, hospital_id, day_of_week, start_time, end_time]
        );

        res.status(201).json({ message: 'Schedule added successfully.', id: result.insertId });
    } catch (err) {
        console.error('Add schedule error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
