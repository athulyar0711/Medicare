import { vi, describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const pool = require('../../config/db');
const app = require('../../server.js');

pool.query = vi.fn();

describe('POST /api/auth/signup', () => {
  it('should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('should return 409 if email already registered', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1 }]]); // simulate existing user
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Test', email: 'exists@test.com', password: 'pass', role: 'patient' });
    expect(res.status).toBe(409);
  });

  it('should return 201 and a token on valid signup', async () => {
    pool.query
      .mockResolvedValueOnce([[]])              // no existing user
      .mockResolvedValueOnce([{ insertId: 1 }]) // user insert
      .mockResolvedValueOnce([{ insertId: 2 }]); // patient insert
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'pass123', role: 'patient' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
  });
});

describe('POST /api/auth/login', () => {
  it('should return 401 for invalid credentials', async () => {
    pool.query.mockResolvedValueOnce([[]]);  // user not found
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@x.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});
