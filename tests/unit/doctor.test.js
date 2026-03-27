import { vi, describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const pool = require('../../config/db');
const app = require('../../server.js');

pool.query = vi.fn();

const getAuth = () => {
  const doctorToken = jwt.sign({ id: 2, role: 'doctor_user', name: 'Dr. Smith' }, process.env.JWT_SECRET || 'testsecret');
  return `Bearer ${doctorToken}`;
};

describe('POST /api/doctor/schedule', () => {
  it('should return 400 if all schedule fields not provided', async () => {
    pool.query.mockResolvedValueOnce([[{ doctor_id: 1 }]]); // getDoctorId
    const res = await request(app)
      .post('/api/doctor/schedule')
      .set('Authorization', getAuth())
      .send({ hospital_id: 1, day_of_week: 'Monday' }); // missing start/end
    expect(res.status).toBe(400);
  });

  it('should return 400 if schedule already exists for the same day and hospital', async () => {
    pool.query
      .mockResolvedValueOnce([[{ doctor_id: 3 }]])  // getDoctorId
      .mockResolvedValueOnce([[{ id: 10 }]]);        // existing schedule
    const res = await request(app)
      .post('/api/doctor/schedule')
      .set('Authorization', getAuth())
      .send({ hospital_id: 1, day_of_week: 'Monday', start_time: '09:00', end_time: '13:00' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });
});
