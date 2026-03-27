const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// All routes require patient role
router.use(verifyToken, requireRole('patient'));

// GET /api/patient/doctors - Search doctors
router.get('/doctors', async (req, res) => {
    try {
        const { name, email, specialization, hospital, day } = req.query;
        let query = `
            SELECT DISTINCT d.id, d.name, d.email, d.specialization, d.phone,
                   h.name AS hospital_name, h.id AS hospital_id,
                   dhs.day_of_week, dhs.start_time, dhs.end_time
            FROM doctors d
            LEFT JOIN doctor_hospital_schedule dhs ON d.id = dhs.doctor_id
            LEFT JOIN hospitals h ON dhs.hospital_id = h.id
            WHERE 1=1
        `;
        const params = [];

        if (name) { query += ' AND d.name LIKE ?'; params.push(`%${name}%`); }
        if (email) { query += ' AND d.email LIKE ?'; params.push(`%${email}%`); }
        if (specialization) { query += ' AND d.specialization LIKE ?'; params.push(`%${specialization}%`); }
        if (hospital) { query += ' AND h.name LIKE ?'; params.push(`%${hospital}%`); }
        if (day) { query += ' AND dhs.day_of_week = ?'; params.push(day); }

        query += ' ORDER BY d.name';

        const [rows] = await pool.query(query, params);

        // Group by doctor
        const doctorsMap = {};
        rows.forEach(row => {
            if (!doctorsMap[row.id]) {
                doctorsMap[row.id] = {
                    id: row.id,
                    name: row.name,
                    email: row.email,
                    specialization: row.specialization,
                    phone: row.phone,
                    schedules: []
                };
            }
            if (row.hospital_name) {
                doctorsMap[row.id].schedules.push({
                    hospital_id: row.hospital_id,
                    hospital_name: row.hospital_name,
                    day_of_week: row.day_of_week,
                    start_time: row.start_time,
                    end_time: row.end_time
                });
            }
        });

        res.json(Object.values(doctorsMap));
    } catch (err) {
        console.error('Doctor search error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/patient/doctors/:id - Single doctor details
router.get('/doctors/:id', async (req, res) => {
    try {
        const [doctors] = await pool.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
        if (doctors.length === 0) return res.status(404).json({ error: 'Doctor not found.' });

        const [schedules] = await pool.query(`
            SELECT dhs.*, h.name AS hospital_name, h.address AS hospital_address
            FROM doctor_hospital_schedule dhs
            JOIN hospitals h ON dhs.hospital_id = h.id
            WHERE dhs.doctor_id = ?
            ORDER BY FIELD(dhs.day_of_week, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')
        `, [req.params.id]);

        res.json({ ...doctors[0], schedules });
    } catch (err) {
        console.error('Doctor detail error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/patient/appointments - Book appointment
router.post('/appointments', async (req, res) => {
    try {
        const { doctor_id, hospital_id, appointment_datetime } = req.body;
        if (!doctor_id || !hospital_id || !appointment_datetime) {
            return res.status(400).json({ error: 'Doctor, hospital, and appointment datetime are required.' });
        }

        // Get patient_id from user_id
        const [patients] = await pool.query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patients.length === 0) return res.status(404).json({ error: 'Patient profile not found.' });
        const patientId = patients[0].id;

        // Ensure max 10 appointments per doctor per hospital per day
        const apptDateStr = appointment_datetime.split(' ')[0];
        const [existingAppts] = await pool.query(
            'SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND hospital_id = ? AND DATE(appointment_datetime) = ?',
            [doctor_id, hospital_id, apptDateStr]
        );
        
        if (existingAppts[0].count >= 10) {
            return res.status(400).json({ error: 'This doctor is fully booked for this hospital on the selected date. Maximum 10 appointments allowed.' });
        }

        // Insert appointment
        const [result] = await pool.query(
            'INSERT INTO appointments (patient_id, doctor_id, hospital_id, appointment_datetime) VALUES (?, ?, ?, ?)',
            [patientId, doctor_id, hospital_id, appointment_datetime]
        );

        // Auto-create reminder 2 hours before
        const apptDate = new Date(appointment_datetime);
        const reminderTime = new Date(apptDate.getTime() - 2 * 60 * 60 * 1000);

        // Get doctor name for reminder
        const [doc] = await pool.query('SELECT name FROM doctors WHERE id = ?', [doctor_id]);
        const doctorName = doc.length > 0 ? doc[0].name : 'your doctor';

        await pool.query(
            'INSERT INTO reminders (user_id, title, description, interval_minutes, next_trigger, is_active) VALUES (?, ?, ?, ?, ?, TRUE)',
            [
                req.user.id,
                `Appointment with ${doctorName}`,
                `You have an appointment on ${apptDate.toLocaleString()}`,
                0,
                reminderTime
            ]
        );

        res.status(201).json({ message: 'Appointment booked successfully.', appointmentId: result.insertId });
    } catch (err) {
        console.error('Booking error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/patient/appointments - List patient appointments
router.get('/appointments', async (req, res) => {
    try {
        const [patients] = await pool.query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patients.length === 0) return res.json([]);

        const [appointments] = await pool.query(`
            SELECT a.*, d.name AS doctor_name, d.specialization, h.name AS hospital_name
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            JOIN hospitals h ON a.hospital_id = h.id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_datetime DESC
        `, [patients[0].id]);

        res.json(appointments);
    } catch (err) {
        console.error('Appointments fetch error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/patient/reminders - List reminders
router.get('/reminders', async (req, res) => {
    try {
        const [reminders] = await pool.query(
            'SELECT * FROM reminders WHERE user_id = ? ORDER BY is_active DESC, next_trigger ASC',
            [req.user.id]
        );
        res.json(reminders);
    } catch (err) {
        console.error('Reminders fetch error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/patient/reminders - Create custom reminder
router.post('/reminders', async (req, res) => {
    try {
        const { title, description, interval_minutes } = req.body;
        if (!title || !interval_minutes) {
            return res.status(400).json({ error: 'Title and interval are required.' });
        }

        const nextTrigger = new Date(Date.now() + interval_minutes * 60 * 1000);

        const [result] = await pool.query(
            'INSERT INTO reminders (user_id, title, description, interval_minutes, next_trigger) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, title, description || '', interval_minutes, nextTrigger]
        );

        res.status(201).json({ message: 'Reminder created.', id: result.insertId });
    } catch (err) {
        console.error('Reminder create error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// DELETE /api/patient/reminders/:id
router.delete('/reminders/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM reminders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Reminder deleted.' });
    } catch (err) {
        console.error('Reminder delete error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// PATCH /api/patient/reminders/:id/toggle - Toggle reminder active status
router.patch('/reminders/:id/toggle', async (req, res) => {
    try {
        await pool.query(
            'UPDATE reminders SET is_active = NOT is_active WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Reminder toggled.' });
    } catch (err) {
        console.error('Reminder toggle error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/patient/health - Get health metrics
router.get('/health', async (req, res) => {
    try {
        const [patients] = await pool.query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patients.length === 0) return res.json(null);

        const [metrics] = await pool.query(
            'SELECT * FROM health_metrics WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 1',
            [patients[0].id]
        );

        res.json(metrics.length > 0 ? metrics[0] : null);
    } catch (err) {
        console.error('Health metrics error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/patient/health - Save health metrics
router.post('/health', async (req, res) => {
    try {
        const { height, weight } = req.body;
        if (!height || !weight) {
            return res.status(400).json({ error: 'Height and weight are required.' });
        }

        const [patients] = await pool.query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patients.length === 0) return res.status(404).json({ error: 'Patient profile not found.' });

        const bmi = (weight / ((height / 100) ** 2)).toFixed(2);

        // Upsert health metrics
        const [existing] = await pool.query('SELECT id FROM health_metrics WHERE patient_id = ?', [patients[0].id]);

        if (existing.length > 0) {
            await pool.query(
                'UPDATE health_metrics SET height = ?, weight = ?, bmi = ?, recorded_at = NOW() WHERE patient_id = ?',
                [height, weight, bmi, patients[0].id]
            );
        } else {
            await pool.query(
                'INSERT INTO health_metrics (patient_id, height, weight, bmi) VALUES (?, ?, ?, ?)',
                [patients[0].id, height, weight, bmi]
            );
        }

        res.json({ message: 'Health metrics saved.', height, weight, bmi: parseFloat(bmi) });
    } catch (err) {
        console.error('Health save error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/patient/push-subscribe - Save push subscription
router.post('/push-subscribe', async (req, res) => {
    try {
        const { endpoint, keys } = req.body;
        console.log('Received push subscription request:', req.body);

        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            console.log('Invalid subscription object missing required fields.');
            return res.status(400).json({ error: 'Invalid subscription object' });
        }

        // Check if subscription already exists for this endpoint
        const [existing] = await pool.query('SELECT id FROM push_subscriptions WHERE endpoint = ? AND user_id = ?', [endpoint, req.user.id]);

        if (existing.length === 0) {
            await pool.query(
                'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)',
                [req.user.id, endpoint, keys.p256dh, keys.auth]
            );
            console.log('Successfully saved new push subscription for user', req.user.id);
        } else {
            console.log('Subscription already exists for user', req.user.id);
        }
        res.status(201).json({ message: 'Subscription saved.' });
    } catch (err) {
        console.error('Push subscribe error:', err);
        res.status(500).json({ error: 'Database error while saving subscription.' });
    }
});

// GET /api/patient/vapidPublicKey
router.get('/vapidPublicKey', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

module.exports = router;
