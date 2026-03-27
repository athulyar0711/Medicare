const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// All routes require doctor_user role
router.use(verifyToken, requireRole('doctor_user'));

// Helper: get doctor_id from user_id
async function getDoctorId(userId) {
    const [rows] = await pool.query(
        'SELECT doctor_id FROM doctor_users WHERE user_id = ?', [userId]
    );
    return rows.length > 0 ? rows[0].doctor_id : null;
}

// GET /api/doctor/patients - Search patients
router.get('/patients', async (req, res) => {
    try {
        const { name, email } = req.query;
        let query = `
            SELECT DISTINCT u.id AS user_id, u.name, u.email, p.id AS patient_id, p.phone, p.address
            FROM patients p
            JOIN users u ON p.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (name) { query += ' AND u.name LIKE ?'; params.push(`%${name}%`); }
        if (email) { query += ' AND u.email LIKE ?'; params.push(`%${email}%`); }

        query += ' ORDER BY u.name';

        const [patients] = await pool.query(query, params);
        res.json(patients);
    } catch (err) {
        console.error('Patient search error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/doctor/appointments - Get appointments
router.get('/appointments', async (req, res) => {
    try {
        const doctorId = await getDoctorId(req.user.id);
        if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found.' });

        // Today's appointments
        const [todayAppointments] = await pool.query(`
            SELECT a.*, u.name AS patient_name, u.email AS patient_email,
                   h.name AS hospital_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            JOIN hospitals h ON a.hospital_id = h.id
            WHERE a.doctor_id = ? AND DATE(a.appointment_datetime) = CURDATE()
            ORDER BY a.appointment_datetime
        `, [doctorId]);

        // Total appointments
        const [totalResult] = await pool.query(
            'SELECT COUNT(*) AS total FROM appointments WHERE doctor_id = ?', [doctorId]
        );

        // All upcoming appointments
        const [upcomingAppointments] = await pool.query(`
            SELECT a.*, u.name AS patient_name, u.email AS patient_email,
                   h.name AS hospital_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            JOIN hospitals h ON a.hospital_id = h.id
            WHERE a.doctor_id = ? AND a.appointment_datetime >= NOW()
            ORDER BY a.appointment_datetime
        `, [doctorId]);

        res.json({
            today: todayAppointments,
            todayCount: todayAppointments.length,
            totalCount: totalResult[0].total,
            upcoming: upcomingAppointments
        });
    } catch (err) {
        console.error('Appointments error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/doctor/profile - Get doctor profile with schedule
router.get('/profile', async (req, res) => {
    try {
        const doctorId = await getDoctorId(req.user.id);
        if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found.' });

        const [doctor] = await pool.query('SELECT * FROM doctors WHERE id = ?', [doctorId]);
        const [schedules] = await pool.query(`
            SELECT dhs.*, h.name AS hospital_name
            FROM doctor_hospital_schedule dhs
            JOIN hospitals h ON dhs.hospital_id = h.id
            WHERE dhs.doctor_id = ?
        `, [doctorId]);

        res.json({ ...doctor[0], schedules });
    } catch (err) {
        console.error('Doctor profile error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/doctor/hospitals - Get all hospitals
router.get('/hospitals', async (req, res) => {
    try {
        const [hospitals] = await pool.query('SELECT * FROM hospitals ORDER BY name');
        res.json(hospitals);
    } catch (err) {
        console.error('Fetch hospitals error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/doctor/hospitals - Add a new hospital
router.post('/hospitals', async (req, res) => {
    try {
        const { name, address, phone } = req.body;
        if (!name || !address) {
            return res.status(400).json({ error: 'Name and address are required.' });
        }

        const [result] = await pool.query(
            'INSERT INTO hospitals (name, address, phone) VALUES (?, ?, ?)',
            [name, address, phone || null]
        );
        res.status(201).json({ message: 'Hospital added.', id: result.insertId });
    } catch (err) {
        console.error('Add hospital error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/doctor/schedule - Add schedule
router.post('/schedule', async (req, res) => {
    try {
        const { hospital_id, day_of_week, start_time, end_time } = req.body;
        if (!hospital_id || !day_of_week || !start_time || !end_time) {
            return res.status(400).json({ error: 'All schedule fields are required.' });
        }

        const doctorId = await getDoctorId(req.user.id);
        if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found.' });

        // Check for duplicate day/hospital
        const [existing] = await pool.query(
            'SELECT id FROM doctor_hospital_schedule WHERE doctor_id = ? AND hospital_id = ? AND day_of_week = ?',
            [doctorId, hospital_id, day_of_week]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Schedule already exists for this day at this hospital. Please delete it first to update.' });
        }

        await pool.query(
            'INSERT INTO doctor_hospital_schedule (doctor_id, hospital_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
            [doctorId, hospital_id, day_of_week, start_time, end_time]
        );

        res.status(201).json({ message: 'Schedule added successfully.' });
    } catch (err) {
        console.error('Add schedule error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// DELETE /api/doctor/schedule/:id - Delete schedule
router.delete('/schedule/:id', async (req, res) => {
    try {
        const doctorId = await getDoctorId(req.user.id);
        if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found.' });

        await pool.query(
            'DELETE FROM doctor_hospital_schedule WHERE id = ? AND doctor_id = ?',
            [req.params.id, doctorId]
        );
        res.json({ message: 'Schedule deleted.' });
    } catch (err) {
        console.error('Delete schedule error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
