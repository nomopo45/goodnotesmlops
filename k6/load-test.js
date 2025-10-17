import http from 'k6/http';
import { sleep, check } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost';
const HOSTS = ['foo.localhost', 'bar.localhost'];

export default function () {
  const selectedHost = HOSTS[Math.floor(Math.random() * HOSTS.length)];
  
  const response = http.get(BASE_URL, {
    headers: { 'Host': selectedHost },
    tags: { hostname: selectedHost },
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'correct content': (r) => r.body.includes(selectedHost.split('.')[0]),
  });
  
  sleep(Math.random() * 1.5 + 0.5);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'k6-summary.json': JSON.stringify(data),      // Changed from '/scripts/...'
    'k6-results.html': htmlReport(data),          // Changed from '/scripts/...'
  };
}