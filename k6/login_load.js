import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 50 },   // ramp up to 50 VUs
    { duration: '20s', target: 100 },  // hold at 100 VUs
    { duration: '10s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests must finish < 500ms
    http_req_failed: ['rate<0.01'],    // error rate < 1%
  },
};

export default function () {
  // We use the patient we know exists from schema_test.sql: alice@medicare.test with TestPass1!
  const payload = JSON.stringify({ email: 'alice@medicare.test', password: 'TestPass1!' });
  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post('http://localhost:3000/api/auth/login', payload, params);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'token received': (r) => JSON.parse(r.body).token !== undefined,
  });
  sleep(1);
}
