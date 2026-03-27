import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { TEST_DATA } from '../setup.js';
import jwt from 'jsonwebtoken';

let app;
const token = jwt.sign(
  { id: TEST_DATA.patient.userId, role: 'patient' }, 
  process.env.JWT_SECRET || 'medicare_test_secret_2024'
);

beforeAll(async () => {
    process.env.VITEST = 'true';
    const serverModule = await import('../../server.js');
    app = serverModule.default || serverModule;
});

describe('Patient Integration Experiments', () => {
  it('should book an appointment and trigger a reminder', async () => {
    // Backend expects: { doctor_id, hospital_id, appointment_datetime }
    const res = await request(app)
      .post('/api/patient/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        doctor_id: TEST_DATA.doctor.doctorId,
        hospital_id: TEST_DATA.hospital.id,
        appointment_datetime: '2024-10-15 10:00:00'
      });

    if (res.status !== 201) console.error('BOOKING FAILED:', res.body);
    expect(res.status).toBe(201);
    expect(res.body.appointmentId).toBeDefined();

    // Check if reminder was created (MySQL sync)
    const db = (await import('../../config/db.js')).default;
    const [reminders] = await db.query(
        'SELECT id FROM reminders WHERE user_id = ? AND title LIKE ?',
        [TEST_DATA.patient.userId, '%Appointment%']
    );
    expect(reminders.length).toBeGreaterThan(0);
  });
});
