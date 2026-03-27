import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
  thresholds: { http_req_duration: ['p(95)<800'] },
};

export function setup() {
  const loginRes = http.post('http://localhost:3000/api/auth/login', JSON.stringify({
    email: 'alice@medicare.test',
    password: 'TestPass1!'
  }), { headers: { 'Content-Type': 'application/json' } });
  
  if (loginRes.status !== 200) {
      console.error('Setup login failed! Ensure server is running and DB is seeded.');
      return { token: '' };
  }
  return { token: JSON.parse(loginRes.body).token };
}

export default function (data) {
  const payload = JSON.stringify({ height: 170, weight: 70 });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.token}`,
    },
  };
  const res = http.post('http://localhost:3000/api/patient/health', payload, params);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(0.5);
}
