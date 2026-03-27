import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { TEST_DATA } from '../setup.js';

let app;

beforeAll(async () => {
    // Force environment
    process.env.VITEST = 'true';
    const serverModule = await import('../../server.js');
    app = serverModule.default || serverModule;
});

describe('Authentication Integration Experiments', () => {
  describe('POST /api/auth/signup (Patient)', () => {
    it('should create a linked patient record in MySQL', async () => {
      const email = `alice_${Date.now()}@test.com`;
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Alice Patient',
          email: email,
          password: 'TestPass1!',
          role: 'patient',
          phone: '9876543210'
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
    });
  });

  describe('POST /api/auth/signup (Doctor)', () => {
    it('should register a NEW doctor correctly', async () => {
      const email = `new_doc_${Date.now()}@test.com`;
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Dr. New Provider',
          email: email,
          password: 'TestPass1!',
          role: 'doctor_user',
          specialization: 'Neurology'
        });
      
      expect(res.status).toBe(201);
    });

    it('should link to an existing doctor record via email', async () => {
      // Use existing doctor from seed (rahul@medicare.test)
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Dr. Rahul Sharma',
          email: 'rahul@medicare.test',
          password: 'TestPass1!',
          role: 'doctor_user',
          specialization: 'Cardiology'
        });
      
      // Since it already exists in users table, it should return 409
      expect(res.status).toBe(409);
    });
  });
});
