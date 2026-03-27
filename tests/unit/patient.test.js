import { vi, describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const pool = require('../../config/db');
const app = require('../../server.js');

pool.query = vi.fn();

const getHeader = () => {
  const token = jwt.sign({ id: 1, role: 'patient', name: 'Alice' }, process.env.JWT_SECRET || 'testsecret');
  return `Bearer ${token}`;
};

describe('POST /api/patient/health', () => {
  it('should return 400 if height or weight missing', async () => {
    const res = await request(app)
      .post('/api/patient/health')
      .set('Authorization', getHeader())
      .send({ height: 170 });
    expect(res.status).toBe(400);
  });

  it('should calculate and save BMI correctly', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 5 }]])  // patient lookup
      .mockResolvedValueOnce([[]])            // no existing metric
      .mockResolvedValueOnce([{}]);           // insert
    const res = await request(app)
      .post('/api/patient/health')
      .set('Authorization', getHeader())
      .send({ height: 170, weight: 70 });
    expect(res.status).toBe(200);
    expect(res.body.bmi).toBeCloseTo(24.22, 1);
  });
});

describe('POST /api/patient/appointments', () => {
  it('should return 400 if doctor is fully booked (>=10)', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 5 }]])          // patient lookup
      .mockResolvedValueOnce([[{ count: 10 }]]);     // slot count
    const res = await request(app)
      .post('/api/patient/appointments')
      .set('Authorization', getHeader())
      .send({ doctor_id: 1, hospital_id: 1, appointment_datetime: '2026-04-01 10:00:00' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/fully booked/i);
  });
});
