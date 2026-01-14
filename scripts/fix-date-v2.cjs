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
      console.log('Updating to extract date from multiple sources...');

      node.parameters.jsCode = `// Get PDF text
const pdfText = items[0].json.text || items[0].json.text_preview || "";

// Try to get email body from various sources in the workflow
let emailContent = "";
try {
  // Try Get Message Details node (has full email)
  const msgDetails = $('Get Message Details').first().json;
  // Gmail API returns body in payload.parts or payload.body
  if (msgDetails.payload) {
    const parts = msgDetails.payload.parts || [];
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        // Decode base64 (Gmail uses URL-safe base64)
        let b64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
        emailContent += decodeURIComponent(escape(atob(b64)));
      }
    }
    if (!emailContent && msgDetails.payload.body?.data) {
      let b64 = msgDetails.payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
      emailContent = decodeURIComponent(escape(atob(b64)));
    }
  }
  // Also try snippet
  emailContent += " " + (msgDetails.snippet || "");
} catch (e) {}

try {
  // Also try the trigger
  const trigger = $('Traffic Summary Trigger').first().json;
  emailContent += " " + (trigger.text || trigger.snippet || trigger.body || "");
} catch (e) {}

// Combine PDF text and email content for searching
const allText = pdfText + " " + emailContent;
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
    console.log('SUCCESS! Now extracts date from Get Message Details node');
  } else {
    console.error('Failed:', await updateRes.text());
  }
}

main().catch(console.error);
