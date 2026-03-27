import { vi, describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const pool = require('../../config/db');
const app = require('../../server.js');
const File = require('../../models/File');
const { GoogleGenAI } = require('@google/genai');

pool.query = vi.fn();

// Also mock Mongoose model and GenAI since they are also required via CJS
vi.mock('../models/File', () => ({
  default: vi.fn().mockImplementation(() => ({
    save: vi.fn().mockResolvedValue({ _id: 'mongo123' })
  }))
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
           text: () => '{"blood_sugar": 95.5, "vitamin_d": 32.1}'
        }
      })
    })
  }))
}));

const getAuth = () => {
  const token = jwt.sign({ id: 1, role: 'patient' }, process.env.JWT_SECRET || 'testsecret');
  return `Bearer ${token}`;
};

describe('POST /api/files/upload', () => {
  it('should return 400 if data or mimeType is missing', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 5 }]]); // patient lookup
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', getAuth())
      .send({ filename: 'report.pdf' }); // no data/mimeType
    expect(res.status).toBe(400);
  });

  it('should return 201 and fileId on valid upload', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 5 }]]); // patient lookup
    pool.query.mockResolvedValue([{}]); // other writes
    
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', getAuth())
      .send({ filename: 'blood.jpg', mimeType: 'image/jpeg', data: 'base64data==' });
    expect(res.status).toBe(201);
    expect(res.body.fileId).toBeDefined();
  });
});
