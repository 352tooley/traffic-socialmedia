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
      console.log('Updating date extraction regex...');

      node.parameters.jsCode = `// Get PDF text
const pdfText = items[0].json.text || items[0].json.text_preview || "";

// Also get email body from earlier in the workflow
let emailBody = "";
try {
  const emailData = $('Traffic Summary Trigger').first().json;
  emailBody = emailData.text || emailData.snippet || emailData.body || "";
} catch (e) {
  // Trigger data not available
}

// Combine for searching
const allText = pdfText + " " + emailBody;
const lines = pdfText.split(/\\r?\\n/);
const results = [];

// Extract the date from "The latest data update was on YYYY-MM-DD"
let dataDate = "";
const updateMatch = allText.match(/latest data update was on\\s+(\\d{4}-\\d{2}-\\d{2})/i);
if (updateMatch) {
  // Convert YYYY-MM-DD to more readable format
  const [year, month, day] = updateMatch[1].split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  dataDate = months[parseInt(month) - 1] + ' ' + parseInt(day) + ', ' + year;
} else {
  // Fallback: look for other date patterns
  const throughMatch = allText.match(/(?:through|thru)\\s+([A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4})/i);
  if (throughMatch) {
    dataDate = throughMatch[1].trim();
  }
}

for (const line of lines) {
  // Only real store rows
  if (!/^[0-9A-Z]+:/.test(line.trim())) continue;

  const parts = line.trim().split(/\\s+/);
  parts.shift(); // Drop store code

  // Pop values from right
  parts.pop(); // accessory
  parts.pop(); // upgrade
  parts.pop(); // add-a-line
  const exitTraffic = parts.pop();
  parts.pop(); // interactions
  parts.pop(); // conversion

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
    console.log('SUCCESS! Date regex now matches "latest data update was on YYYY-MM-DD"');
  } else {
    console.error('Failed:', await updateRes.text());
  }
}

main().catch(console.error);
