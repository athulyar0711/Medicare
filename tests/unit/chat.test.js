import { vi, describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const pool = require('../../config/db');
const app = require('../../server.js');
const Chat = require('../../models/Chat');

pool.query = vi.fn();

vi.mock('../models/Chat', () => {
  const m = {
    findOne: vi.fn().mockResolvedValue(null),
    prototype: {
        save: vi.fn().mockResolvedValue({})
    }
  };
  return { default: m, ...m };
});

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
           text: () => 'Your blood sugar looks normal.'
        }
      })
    })
  }))
}));

const getAuth = () => {
  const token = jwt.sign({ id: 1, role: 'patient' }, process.env.JWT_SECRET || 'testsecret');
  return `Bearer ${token}`;
};

describe('POST /api/chat', () => {
  it('should return 400 when no text or file_id is provided', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 5 }]]);
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', getAuth())
      .send({});
    expect(res.status).toBe(400);
  });
});
