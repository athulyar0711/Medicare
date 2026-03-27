import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '15s', target: 100 },
    { duration: '30s', target: 200 },
    { duration: '10s', target: 0 },
  ],
  thresholds: { http_req_duration: ['p(95)<1000'] },
};

export function setup() {
  const loginRes = http.post('http://localhost:3000/api/auth/login', JSON.stringify({
    email: 'alice@medicare.test',
    password: 'TestPass1!'
  }), { headers: { 'Content-Type': 'application/json' } });
  
  if (loginRes.status !== 200) {
      console.error('Setup login failed!');
      return { token: '' };
  }
  return { token: JSON.parse(loginRes.body).token };
}

export default function (data) {
  const payload = JSON.stringify({
    doctor_id: 1,
    hospital_id: 1,
    appointment_datetime: '2026-05-01 10:00:00',
  });
  const res = http.post('http://localhost:3000/api/patient/appointments', payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.token}`,
    },
  });
  // Either booked (201) or cap enforced (400) — both are valid outcomes
  check(res, { 'valid response': (r) => r.status === 201 || r.status === 400 });
}
