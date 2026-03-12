#!/usr/bin/env node
/**
 * MCP Protocol Tester - manually test MCP server communication
 * Uses stdio to communicate with the MCP server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

let serverProc = null;
let requestId = 1;
let messageBuffer = '';

function sendJsonrpc(method, params = {}) {
  const id = requestId++;
  const msg = JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    params
  });
  console.log(`> ${msg}`);
  serverProc.stdin.write(msg + '\n');
  return id;
}

function handleServerOutput(data) {
  messageBuffer += data.toString();
  let newlineIndex;
  while ((newlineIndex = messageBuffer.indexOf('\n')) !== -1) {
    const line = messageBuffer.slice(0, newlineIndex);
    messageBuffer = messageBuffer.slice(newlineIndex + 1);
    if (line.trim()) {
      try {
        const parsed = JSON.parse(line);
        console.log(`< ${JSON.stringify(parsed, null, 2)}`);
      } catch {
        console.log(`< ${line}`);
      }
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('mcpHydroSSH - MCP Protocol Tester');
  console.log('='.repeat(60));
  console.log();

  const serverPath = join(PROJECT_ROOT, 'dist', 'index.js');
  console.log(`Starting MCP server: ${serverPath}`);
  console.log();

  serverProc = spawn('node', [serverPath], {
    cwd: PROJECT_ROOT,
    stdio: ['pipe', 'pipe', 'inherit']
  });

  serverProc.stdout.on('data', handleServerOutput);
  serverProc.stderr.on('data', (data) => {
    console.error(`[stderr] ${data}`);
  });

  serverProc.on('exit', (code) => {
    console.log(`\nServer exited with code ${code}`);
    process.exit(0);
  });

  // Wait a bit for server to start
  await new Promise(r => setTimeout(r, 500));

  console.log();
  console.log('Available commands:');
  console.log('  1 - Initialize (initialize)');
  console.log('  2 - List tools (tools/list)');
  console.log('  3 - Call tool (tools/call) - ssh_list_servers');
  console.log('  4 - Call tool (tools/call) - ssh_connect');
  console.log('  5 - Call tool (tools/call) - ssh_exec');
  console.log('  6 - Call tool (tools/call) - ssh_get_status');
  console.log('  7 - Call tool (tools/call) - ssh_disconnect');
  console.log('  q - Quit');
  console.log();

  while (true) {
    const choice = await prompt('Select an option: ');

    if (choice === 'q') break;

    switch (choice) {
      case '1':
        sendJsonrpc('initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        });
        break;

      case '2':
        sendJsonrpc('tools/list');
        break;

      case '3':
        sendJsonrpc('tools/call', {
          name: 'ssh_list_servers',
          arguments: {}
        });
        break;

      case '4':
        const serverId = await prompt('Enter serverId: ');
        sendJsonrpc('tools/call', {
          name: 'ssh_connect',
          arguments: { serverId }
        });
        break;

      case '5':
        const cmd = await prompt('Enter command: ');
        const connId = await prompt('Enter connectionId (optional, press Enter to skip): ');
        const args = { command: cmd };
        if (connId.trim()) args.connectionId = connId.trim();
        sendJsonrpc('tools/call', {
          name: 'ssh_exec',
          arguments: args
        });
        break;

      case '6':
        const statusConnId = await prompt('Enter connectionId (optional, press Enter for all): ');
        const statusArgs = {};
        if (statusConnId.trim()) statusArgs.connectionId = statusConnId.trim();
        sendJsonrpc('tools/call', {
          name: 'ssh_get_status',
          arguments: statusArgs
        });
        break;

      case '7':
        const discConnId = await prompt('Enter connectionId (optional, press Enter for latest): ');
        const discArgs = {};
        if (discConnId.trim()) discArgs.connectionId = discConnId.trim();
        sendJsonrpc('tools/call', {
          name: 'ssh_disconnect',
          arguments: discArgs
        });
        break;
    }
    console.log();
  }

  console.log('Shutting down...');
  serverProc.kill();
  rl.close();
}

main().catch(console.error);
