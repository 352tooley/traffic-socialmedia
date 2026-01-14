#!/usr/bin/env node
/**
 * Update the traffic workflow to:
 * 1. Add updatedDate field to parsed traffic data
 * 2. Change Save Traffic Data from append to update (upsert)
 */

const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const N8N_API_URL = process.env.N8N_API_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = process.env.N8N_WORKFLOW_ID;

const headers = {
  'X-N8N-API-KEY': N8N_API_KEY,
  'Content-Type': 'application/json'
};

async function getWorkflow() {
  const url = `${N8N_API_URL}/api/v1/workflows/${WORKFLOW_ID}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Failed to get workflow: ${response.status}`);
  return response.json();
}

async function updateWorkflow(workflow) {
  const url = `${N8N_API_URL}/api/v1/workflows/${WORKFLOW_ID}`;

  // Only include valid settings properties
  const payload = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: {
      executionOrder: workflow.settings?.executionOrder || "v1"
    }
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update workflow: ${response.status} - ${error}`);
  }
  return response.json();
}

async function main() {
  console.log('Fetching current workflow...');
  const workflow = await getWorkflow();

  let codeNodeModified = false;
  let saveNodeModified = false;

  for (const node of workflow.nodes) {
    // Modify "Code in JavaScript" node - add updatedDate
    if (node.name === 'Code in JavaScript' && node.id === 'de3ba3ea-6aa6-4443-b127-6d68ead5e01b') {
      console.log('Modifying "Code in JavaScript" node to add updatedDate...');

      // New code that includes dataDate extracted from PDF content
      node.parameters.jsCode = `const text =
  items[0].json.text ||
  items[0].json.text_preview ||
  "";

const lines = text.split(/\\r?\\n/);
const results = [];

// Extract the "through" date from PDF content
// Look for patterns like "Through January 12, 2026" or "thru 01/12/2026" etc.
let dataDate = "";
const throughMatch = text.match(/(?:through|thru)\\s+([A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4}|\\d{1,2}\\/\\d{1,2}\\/\\d{2,4})/i);
if (throughMatch) {
  dataDate = throughMatch[1].trim();
} else {
  // Fallback: look for any date pattern in first few lines
  const dateMatch = text.match(/\\b(\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}|[A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4})\\b/);
  if (dateMatch) {
    dataDate = dateMatch[1].trim();
  }
}

for (const line of lines) {
  // Only real store rows
  if (!/^[0-9A-Z]+:/.test(line.trim())) continue;

  // Example:
  // 6ESH: Chisholm Trail 7.81% 50.00 640.00 19.00 15.00 11.00

  const parts = line.trim().split(/\\s+/);

  // Drop store code (e.g. "6ESH:")
  parts.shift();

  // Pop values from right
  parts.pop(); // accessory
  parts.pop(); // upgrade
  parts.pop(); // add-a-line
  const exitTraffic = parts.pop(); // ← keep this
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
      codeNodeModified = true;
    }

    // Modify "Save Traffic Data" node - change from append to update
    if (node.id === 'save-traffic-log' && node.name === 'Save Traffic Data') {
      console.log('Modifying "Save Traffic Data" node to use update instead of append...');

      node.parameters = {
        operation: "update",
        documentId: {
          __rl: true,
          mode: "id",
          value: "1c9v-C7E6A2s7lIrnI3o_LShLmjr3tEb48k9c-xDtoZs"
        },
        sheetName: {
          __rl: true,
          mode: "name",
          value: "Traffic Log"
        },
        columns: {
          mappingMode: "autoMapInputData",
          value: {},
          matchingColumns: ["store"],
          schema: [
            {
              id: "store",
              displayName: "store",
              required: false,
              defaultMatch: true,
              display: true,
              type: "string",
              canBeUsedToMatch: true,
              removed: false
            },
            {
              id: "exitTraffic",
              displayName: "exitTraffic",
              required: false,
              defaultMatch: false,
              display: true,
              type: "string",
              canBeUsedToMatch: true,
              removed: false
            },
            {
              id: "dataDate",
              displayName: "dataDate",
              required: false,
              defaultMatch: false,
              display: true,
              type: "string",
              canBeUsedToMatch: true,
              removed: false
            }
          ],
          attemptToConvertTypes: false,
          convertFieldsToString: false
        },
        options: {
          cellFormat: "USER_ENTERED",
          handlingExtraData: "insertInNewColumn"
        }
      };
      saveNodeModified = true;
    }
  }

  if (!codeNodeModified) {
    console.error('ERROR: Could not find "Code in JavaScript" node');
    process.exit(1);
  }

  if (!saveNodeModified) {
    console.error('ERROR: Could not find "Save Traffic Data" node');
    process.exit(1);
  }

  console.log('Pushing updated workflow to n8n...');
  const result = await updateWorkflow(workflow);
  console.log('SUCCESS! Workflow updated:', result.name);
  console.log('\nChanges made:');
  console.log('1. Code node now extracts date from PDF content (looks for "through" date)');
  console.log('2. Code node now outputs: store, exitTraffic, dataDate');
  console.log('3. Save node now uses UPDATE operation (matches on store column)');
  console.log('4. Each update will overwrite existing data for that store');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
