#!/usr/bin/env node
/**
 * Update workflow to clear sheet before writing new traffic data
 * This ensures only the latest data exists - no old data retained
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

  // Create a new "Clear Traffic Sheet" node
  const clearSheetNode = {
    parameters: {
      operation: "clear",
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
      clear: "exceptFirstRow",
      options: {}
    },
    id: "clear-traffic-sheet",
    name: "Clear Traffic Sheet",
    type: "n8n-nodes-base.googleSheets",
    position: [1040, 1904],  // Position before Save Traffic Data
    typeVersion: 4.5,
    credentials: {
      googleSheetsOAuth2Api: {
        id: "hQB6VLVhr3n8B3Hs",
        name: "Google Sheets account 2"
      }
    }
  };

  // Check if Clear node already exists
  const existingClearNode = workflow.nodes.find(n => n.id === 'clear-traffic-sheet');
  if (!existingClearNode) {
    console.log('Adding "Clear Traffic Sheet" node...');
    workflow.nodes.push(clearSheetNode);
  } else {
    console.log('Clear node already exists, updating...');
    Object.assign(existingClearNode, clearSheetNode);
  }

  // Find and update the Save Traffic Data node - change back to append
  for (const node of workflow.nodes) {
    if (node.id === 'save-traffic-log' && node.name === 'Save Traffic Data') {
      console.log('Updating "Save Traffic Data" to use append (after clear)...');

      // Move position to the right of Clear node
      node.position = [1264, 1904];

      node.parameters = {
        operation: "append",
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
          matchingColumns: [],
          schema: [
            {
              id: "store",
              displayName: "store",
              required: false,
              defaultMatch: false,
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
        options: {}
      };
    }
  }

  // Update connections: Code in JavaScript -> Clear Traffic Sheet -> Save Traffic Data
  console.log('Updating node connections...');

  // Change Code in JavaScript to connect to Clear Traffic Sheet
  workflow.connections["Code in JavaScript"] = {
    main: [[{ node: "Clear Traffic Sheet", type: "main", index: 0 }]]
  };

  // Add Clear Traffic Sheet connection to Save Traffic Data
  workflow.connections["Clear Traffic Sheet"] = {
    main: [[{ node: "Save Traffic Data", type: "main", index: 0 }]]
  };

  console.log('Pushing updated workflow to n8n...');
  const result = await updateWorkflow(workflow);
  console.log('SUCCESS! Workflow updated:', result.name);
  console.log('\nChanges made:');
  console.log('1. Added "Clear Traffic Sheet" node - clears all data except header row');
  console.log('2. Flow: Code in JavaScript -> Clear Traffic Sheet -> Save Traffic Data');
  console.log('3. Each update now clears old data first, then writes fresh data');
  console.log('4. Only the latest traffic data will exist in the sheet');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
