import http from 'k6/http';
import { sleep, check } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users over 30s
    { duration: '1m', target: 20 },   // Stay at 20 users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests must be below 500ms
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
    errors: ['rate<0.1'],              // Custom error rate threshold
  },
};

// Base URL - localhost for KinD cluster
const BASE_URL = 'http://localhost';

// Array of hosts to test
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

// Custom summary to export results
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    '/scripts/k6-summary.json': JSON.stringify(data),
    '/scripts/k6-results.html': htmlReport(data),
  };
}

// Text summary function
function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = '\n';
  summary += indent + '=== Load Test Summary ===\n\n';
  
  // Test run duration
  summary += indent + `Test Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n\n`;
  
  // Key metrics
  const metrics = data.metrics;
  
  if (metrics.http_reqs) {
    summary += indent + `Total Requests: ${metrics.http_reqs.values.count}\n`;
    summary += indent + `Requests/sec: ${metrics.http_reqs.values.rate.toFixed(2)}\n`;
  }
  
  if (metrics.http_req_duration) {
    summary += indent + `Response Time (avg): ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    summary += indent + `Response Time (p95): ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += indent + `Response Time (max): ${metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
  }
  
  if (metrics.http_req_failed) {
    summary += indent + `Failed Requests: ${(metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  }
  
  summary += '\n';
  return summary;
}

// HTML report function
function htmlReport(data) {
  const metrics = data.metrics;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>k6 Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #7d64ff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .metric { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #7d64ff; }
    .metric-name { font-weight: bold; color: #333; }
    .metric-value { font-size: 24px; color: #7d64ff; margin: 5px 0; }
    .pass { color: #28a745; }
    .fail { color: #dc3545; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #7d64ff; color: white; }
    tr:hover { background: #f5f5f5; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 k6 Load Test Report</h1>
    <p><strong>Test Duration:</strong> ${(data.state.testRunDurationMs / 1000).toFixed(2)}s</p>
    
    <h2>Summary Metrics</h2>
    
    <div class="metric">
      <div class="metric-name">Total HTTP Requests</div>
      <div class="metric-value">${metrics.http_reqs?.values.count || 0}</div>
    </div>
    
    <div class="metric">
      <div class="metric-name">Requests per Second</div>
      <div class="metric-value">${metrics.http_reqs?.values.rate.toFixed(2) || 0}</div>
    </div>
    
    <div class="metric">
      <div class="metric-name">Average Response Time</div>
      <div class="metric-value">${metrics.http_req_duration?.values.avg.toFixed(2) || 0}ms</div>
    </div>
    
    <div class="metric">
      <div class="metric-name">95th Percentile Response Time</div>
      <div class="metric-value">${metrics.http_req_duration?.values['p(95)'].toFixed(2) || 0}ms</div>
    </div>
    
    <div class="metric">
      <div class="metric-name">Failed Requests</div>
      <div class="metric-value ${(metrics.http_req_failed?.values.rate || 0) < 0.01 ? 'pass' : 'fail'}">
        ${((metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2)}%
      </div>
    </div>
    
    <h2>Detailed Metrics</h2>
    <table>
      <tr>
        <th>Metric</th>
        <th>Min</th>
        <th>Avg</th>
        <th>Max</th>
        <th>P90</th>
        <th>P95</th>
      </tr>
      <tr>
        <td>HTTP Request Duration</td>
        <td>${metrics.http_req_duration?.values.min.toFixed(2) || 0}ms</td>
        <td>${metrics.http_req_duration?.values.avg.toFixed(2) || 0}ms</td>
        <td>${metrics.http_req_duration?.values.max.toFixed(2) || 0}ms</td>
        <td>${metrics.http_req_duration?.values['p(90)'].toFixed(2) || 0}ms</td>
        <td>${metrics.http_req_duration?.values['p(95)'].toFixed(2) || 0}ms</td>
      </tr>
    </table>
    
    <h2>Thresholds</h2>
    <table>
      <tr>
        <th>Threshold</th>
        <th>Status</th>
      </tr>
      ${Object.entries(metrics.http_req_duration?.thresholds || {}).map(([key, value]) => `
      <tr>
        <td>${key}</td>
        <td class="${value.ok ? 'pass' : 'fail'}">${value.ok ? '✅ PASS' : '❌ FAIL'}</td>
      </tr>
      `).join('')}
      ${Object.entries(metrics.http_req_failed?.thresholds || {}).map(([key, value]) => `
      <tr>
        <td>http_req_failed: ${key}</td>
        <td class="${value.ok ? 'pass' : 'fail'}">${value.ok ? '✅ PASS' : '❌ FAIL'}</td>
      </tr>
      `).join('')}
    </table>
    
    <p style="margin-top: 40px; color: #666; font-size: 12px;">
      Generated by Grafana k6 on ${new Date().toISOString()}
    </p>
  </div>
</body>
</html>
  `;
}
