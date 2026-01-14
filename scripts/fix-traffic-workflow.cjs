#!/usr/bin/env node
/**
 * Fix the traffic workflow - remove Clear node and use UPDATE mode
 * This prevents breaking sheet references
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

  // Remove the "Clear Traffic Sheet" node
  const clearNodeIndex = workflow.nodes.findIndex(n => n.id === 'clear-traffic-sheet');
  if (clearNodeIndex !== -1) {
    console.log('Removing "Clear Traffic Sheet" node...');
    workflow.nodes.splice(clearNodeIndex, 1);
  }

  // Update connections: Code in JavaScript -> Save Traffic Data (skip Clear node)
  if (workflow.connections["Code in JavaScript"]) {
    console.log('Updating connections to bypass Clear node...');
    workflow.connections["Code in JavaScript"] = {
      main: [[{ node: "Save Traffic Data", type: "main", index: 0 }]]
    };
  }

  // Remove Clear Traffic Sheet from connections
  delete workflow.connections["Clear Traffic Sheet"];

  // Update "Save Traffic Data" to use UPDATE mode (upsert by store)
  for (const node of workflow.nodes) {
    if (node.id === 'save-traffic-log' && node.name === 'Save Traffic Data') {
      console.log('Updating "Save Traffic Data" to use UPDATE mode (upsert)...');

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
          cellFormat: "USER_ENTERED"
        }
      };
    }
  }

  console.log('Pushing fixed workflow to n8n...');
  const result = await updateWorkflow(workflow);
  console.log('SUCCESS! Workflow fixed:', result.name);
  console.log('\nChanges made:');
  console.log('1. Removed "Clear Traffic Sheet" node (was breaking references)');
  console.log('2. Save Traffic Data now uses UPDATE mode with store matching');
  console.log('3. Each store row is overwritten in place (no clearing)');
  console.log('\nNote: You may need to manually fix the #REF! errors in the sheet');
  console.log('by re-entering the traffic data or triggering the n8n workflow.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
