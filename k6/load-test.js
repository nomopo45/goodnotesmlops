import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate should be less than 10%
    errors: ['rate<0.1'],
  },
};

const hosts = ['foo.localhost', 'bar.localhost'];

export default function() {
  // Randomly select a host
  const host = hosts[Math.floor(Math.random() * hosts.length)];
  
  const params = {
    headers: {
      'Host': host,
    },
  };
  
  // Make HTTP request
  const response = http.get('http://localhost/', params);
  
  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response contains expected text': (r) => {
      if (host === 'foo.localhost') {
        return r.body.includes('foo');
      } else {
        return r.body.includes('bar');
      }
    },
  });
  
  // Record errors
  errorRate.add(!success);
  
  // Random sleep between 100ms and 500ms
  sleep(Math.random() * 0.4 + 0.1);
}

export function handleSummary(data) {
  return {
    'load-test-summary.json': JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: ' ', enableColors: false }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors !== false;
  
  let summary = `
${indent}Test Results:
${indent}=============
${indent}Total Requests:     ${data.metrics.http_reqs.values.count}
${indent}Failed Requests:    ${data.metrics.http_req_failed.values.rate * 100}%
${indent}Request Duration:
${indent}  - Average:        ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
${indent}  - P95:            ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}  - P99:            ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
${indent}Requests/sec:       ${data.metrics.http_reqs.values.rate.toFixed(2)}
  `;
  
  return summary;
}