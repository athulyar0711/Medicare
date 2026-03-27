import { vi, describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Use require to ensure we get the same instance as the CJS routes
const pool = require('../../config/db');
const app = require('../../server.js');

pool.query = vi.fn();

const getAdminAuth = () => {
  const adminToken = jwt.sign({ id: 3, role: 'admin', name: 'AdminUser' }, process.env.JWT_SECRET || 'testsecret');
  return `Bearer ${adminToken}`;
};

const getPatientAuth = () => {
  const patientToken = jwt.sign({ id: 1, role: 'patient' }, process.env.JWT_SECRET || 'testsecret');
  return `Bearer ${patientToken}`;
};

describe('GET /api/admin/stats', () => {
  it('should return 403 for non-admin users', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', getPatientAuth());
    expect(res.status).toBe(403);
  });

  it('should return dashboard statistics for admin', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 50 }]])  // patients
      .mockResolvedValueOnce([[{ total: 120 }]]) // appointments
      .mockResolvedValueOnce([[{ total: 5 }]])   // active today
      .mockResolvedValueOnce([[{ total: 20 }]])  // doctors
      .mockResolvedValueOnce([[{ total: 8 }]]);  // hospitals
      
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', getAdminAuth());
      
    if (res.status !== 200) console.error('FAILED RESPONSE:', res.body);
    expect(res.status).toBe(200);
    expect(res.body.totalPatients).toBe(50);
    expect(res.body.totalDoctors).toBe(20);
  });
});
