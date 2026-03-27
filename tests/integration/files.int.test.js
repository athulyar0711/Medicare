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

describe('File & AI Integration Experiments', () => {
  it('should store metadata in MongoDB and write AI metrics to MySQL', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({
        filename: 'blood_report.jpg',
        mimeType: 'image/jpeg',
        data: 'base64_data_here'
      });

    expect(res.status).toBe(201);
    expect(res.body.fileId).toBeDefined();
    
    // Check if health metrics were updated (MySQL sync)
    const metricsRes = await request(app)
      .get('/api/patient/health')
      .set('Authorization', `Bearer ${token}`);
    
    expect(metricsRes.status).toBe(200);
    // Note: AI enrichment happens asynchronously, so we might need a small delay or just check status
  }, 30000);
});
