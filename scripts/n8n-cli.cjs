#!/usr/bin/env node
/**
 * n8n Workflow CLI - Manage n8n workflows via API
 * Usage:
 *   node scripts/n8n-cli.js get [workflowId]     - Get workflow JSON
 *   node scripts/n8n-cli.js update <file>        - Update workflow from JSON file
 *   node scripts/n8n-cli.js list                 - List all workflows
 *   node scripts/n8n-cli.js activate [id]        - Activate a workflow
 *   node scripts/n8n-cli.js deactivate [id]      - Deactivate a workflow
 */

const fs = require('fs');
const path = require('path');

// Load .env from project root
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
const DEFAULT_WORKFLOW_ID = process.env.N8N_WORKFLOW_ID;

if (!N8N_API_URL || !N8N_API_KEY) {
  console.error('Error: N8N_API_URL and N8N_API_KEY must be set in .env');
  process.exit(1);
}

const headers = {
  'X-N8N-API-KEY': N8N_API_KEY,
  'Content-Type': 'application/json'
};

async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${N8N_API_URL}/api/v1${endpoint}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error ${response.status}: ${error}`);
  }
  return response.json();
}

async function getWorkflow(id) {
  const workflowId = id || DEFAULT_WORKFLOW_ID;
  const workflow = await apiRequest(`/workflows/${workflowId}`);
  return workflow;
}

async function updateWorkflow(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const workflow = JSON.parse(content);
  const id = workflow.id || DEFAULT_WORKFLOW_ID;

  // Remove read-only fields before update
  const updatePayload = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings,
    staticData: workflow.staticData
  };

  const result = await apiRequest(`/workflows/${id}`, 'PATCH', updatePayload);
  return result;
}

async function listWorkflows() {
  const result = await apiRequest('/workflows');
  return result.data || result;
}

async function activateWorkflow(id) {
  const workflowId = id || DEFAULT_WORKFLOW_ID;
  return apiRequest(`/workflows/${workflowId}/activate`, 'POST');
}

async function deactivateWorkflow(id) {
  const workflowId = id || DEFAULT_WORKFLOW_ID;
  return apiRequest(`/workflows/${workflowId}/deactivate`, 'POST');
}

async function main() {
  const [,, command, arg] = process.argv;

  try {
    switch (command) {
      case 'get': {
        const workflow = await getWorkflow(arg);
        console.log(JSON.stringify(workflow, null, 2));
        break;
      }
      case 'update': {
        if (!arg) {
          console.error('Usage: n8n-cli.js update <workflow.json>');
          process.exit(1);
        }
        const result = await updateWorkflow(arg);
        console.log('Workflow updated:', result.name);
        break;
      }
      case 'list': {
        const workflows = await listWorkflows();
        workflows.forEach(w => {
          console.log(`${w.id}: ${w.name} (${w.active ? 'active' : 'inactive'})`);
        });
        break;
      }
      case 'activate': {
        const result = await activateWorkflow(arg);
        console.log('Workflow activated:', result.name);
        break;
      }
      case 'deactivate': {
        const result = await deactivateWorkflow(arg);
        console.log('Workflow deactivated:', result.name);
        break;
      }
      default:
        console.log(`n8n Workflow CLI

Usage:
  node scripts/n8n-cli.js get [workflowId]     Get workflow JSON
  node scripts/n8n-cli.js update <file.json>   Update workflow from JSON
  node scripts/n8n-cli.js list                 List all workflows
  node scripts/n8n-cli.js activate [id]        Activate workflow
  node scripts/n8n-cli.js deactivate [id]      Deactivate workflow
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
