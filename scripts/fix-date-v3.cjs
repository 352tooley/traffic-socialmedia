#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && !key.startsWith('#')) process.env[key.trim()] = val.join('=').trim();
  });
}

const { N8N_API_URL, N8N_API_KEY, N8N_WORKFLOW_ID } = process.env;
const headers = { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' };

async function main() {
  console.log('Fetching workflow...');
  const res = await fetch(`${N8N_API_URL}/api/v1/workflows/${N8N_WORKFLOW_ID}`, { headers });
  const workflow = await res.json();

  for (const node of workflow.nodes) {
    if (node.name === 'Code in JavaScript') {
      console.log('Fixing date regex to match PDF format...');

      node.parameters.jsCode = `const text = items[0].json.text || items[0].json.text_preview || "";
const lines = text.split(/\\r?\\n/);
const results = [];

// Extract date - look for MM/DD/YYYY pattern near "updated_thru" or "Latest"
let dataDate = "";

// Try: "Latest updated_thru" followed by date like "01/10/2026"
const updatedThruMatch = text.match(/updated_thru[\\s\\S]{0,20}(\\d{1,2}\\/\\d{1,2}\\/\\d{4})/i);
if (updatedThruMatch) {
  const [month, day, year] = updatedThruMatch[1].split('/');
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  dataDate = months[parseInt(month) - 1] + ' ' + parseInt(day) + ', ' + year;
} else {
  // Fallback: look for any MM/DD/YYYY pattern
  const dateMatch = text.match(/(\\d{1,2}\\/\\d{1,2}\\/\\d{4})/);
  if (dateMatch) {
    const [month, day, year] = dateMatch[1].split('/');
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    dataDate = months[parseInt(month) - 1] + ' ' + parseInt(day) + ', ' + year;
  }
}

for (const line of lines) {
  if (!/^[0-9A-Z]+:/.test(line.trim())) continue;

  const parts = line.trim().split(/\\s+/);
  parts.shift();
  parts.pop();
  parts.pop();
  parts.pop();
  const exitTraffic = parts.pop();
  parts.pop();
  parts.pop();

  const storeName = parts.join(" ");

  results.push({
    json: {
      store: storeName,
      exitTraffic: exitTraffic.replace(/,/g, ""),
      dataDate: dataDate
    }
  });
}

return results;`;
    }
  }

  console.log('Pushing update...');
  const updateRes = await fetch(`${N8N_API_URL}/api/v1/workflows/${N8N_WORKFLOW_ID}`, {
    method: 'PUT', headers,
    body: JSON.stringify({
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: { executionOrder: "v1" }
    })
  });

  if (updateRes.ok) {
    console.log('SUCCESS! Now matches "updated_thru" + "01/10/2026" format from PDF');
  } else {
    console.error('Failed:', await updateRes.text());
  }
}

main().catch(console.error);
