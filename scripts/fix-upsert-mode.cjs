#!/usr/bin/env node
/**
 * Fix workflow to use proper upsert behavior
 */

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
    if (node.name === 'Save Traffic Data') {
      console.log('Updating Save Traffic Data to use upsert...');
      node.parameters = {
        operation: "upsert",
        documentId: { __rl: true, mode: "id", value: "1c9v-C7E6A2s7lIrnI3o_LShLmjr3tEb48k9c-xDtoZs" },
        sheetName: { __rl: true, mode: "name", value: "Traffic Log" },
        columns: {
          mappingMode: "autoMapInputData",
          value: {},
          matchingColumns: ["store"],
          schema: [
            { id: "store", displayName: "store", defaultMatch: true, type: "string", canBeUsedToMatch: true },
            { id: "exitTraffic", displayName: "exitTraffic", type: "string", canBeUsedToMatch: true },
            { id: "dataDate", displayName: "dataDate", type: "string", canBeUsedToMatch: true }
          ]
        },
        options: { cellFormat: "USER_ENTERED" }
      };
    }
  }

  console.log('Pushing update...');
  const updateRes = await fetch(`${N8N_API_URL}/api/v1/workflows/${N8N_WORKFLOW_ID}`, {
    method: 'PUT', headers,
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: { executionOrder: "v1" } })
  });

  if (updateRes.ok) {
    console.log('SUCCESS! Now please:');
    console.log('1. Delete old/duplicate rows from Traffic Log sheet (keep only newest data)');
    console.log('2. Make sure column headers are exactly: store, exitTraffic, dataDate');
  } else {
    console.error('Failed:', await updateRes.text());
  }
}

main().catch(console.error);
