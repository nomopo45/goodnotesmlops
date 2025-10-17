import http from 'k6/http';
import { sleep, check } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 20 },   // Stay at 20 users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests must be below 500ms
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

const BASE_URL = 'http://localhost';
const HOSTS = ['foo.localhost', 'bar.localhost'];

export default function () {
  // Randomly select a host
  const selectedHost = HOSTS[Math.floor(Math.random() * HOSTS.length)];
  
  // Make request with Host header
  const response = http.get(BASE_URL, {
    headers: {
      'Host': selectedHost,
    },
    tags: { hostname: selectedHost },
  });
  
  // Check response
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'correct content': (r) => {
      const expectedText = selectedHost.split('.')[0]; // 'foo' or 'bar'
      return r.body.includes(expectedText);
    },
  });
  
  // Random sleep between 0.5 and 2 seconds
  sleep(Math.random() * 1.5 + 0.5);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    '/scripts/k6-summary.json': JSON.stringify(data),
    '/scripts/k6-results.html': htmlReport(data),
  };
}
