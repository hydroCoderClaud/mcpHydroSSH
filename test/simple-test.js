#!/usr/bin/env node
/**
 * Simple test script for mcpHydroSSH - tests config loading and basic classes
 * without starting the full MCP server
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

console.log('='.repeat(60));
console.log('mcpHydroSSH - Pre-integration Test');
console.log('='.repeat(60));
console.log();

// Test 1: Check dist files
console.log('[1/5] Checking compiled files...');
const distFiles = [
  'dist/index.js',
  'dist/types.js',
  'dist/config.js',
  'dist/ssh-manager.js',
];
let allDistExist = true;
for (const f of distFiles) {
  const exists = fs.existsSync(join(PROJECT_ROOT, f));
  console.log(`  ${f}: ${exists ? 'OK' : 'MISSING'}`);
  if (!exists) allDistExist = false;
}
if (!allDistExist) {
  console.error('❌ Some dist files missing! Run "npm run build" first.');
  process.exit(1);
}
console.log('✅ All dist files present\n');

// Test 2: Check config file
console.log('[2/5] Checking config file...');
const configPath = join(homedir(), '.claude', 'ssh-mcp-config.json');
const exampleConfigPath = join(PROJECT_ROOT, 'example-config.json');
let configExists = fs.existsSync(configPath);
console.log(`  Config path: ${configPath}`);
console.log(`  Config exists: ${configExists ? 'Yes' : 'No'}`);

if (!configExists) {
  console.log('  ⚠️  Config not found. You can copy example-config.json to set up.');
  console.log(`     Example: ${exampleConfigPath}`);
} else {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    console.log(`  ✅ Config loaded successfully`);
    console.log(`  - Servers configured: ${config.servers?.length || 0}`);
    if (config.servers) {
      for (const srv of config.servers) {
        console.log(`    * ${srv.id} (${srv.name}): ${srv.host}:${srv.port}`);
      }
    }
  } catch (e) {
    console.error(`  ❌ Config invalid: ${e.message}`);
  }
}
console.log();

// Test 3: Try importing modules
console.log('[3/5] Testing module imports...');
try {
  const { loadConfig } = await import('../dist/config.js');
  console.log('  ✅ config.js imported');

  const { SSHManager } = await import('../dist/ssh-manager.js');
  console.log('  ✅ ssh-manager.js imported');
  console.log();

  // Test 4: Test SSHManager instantiation
  console.log('[4/5] Testing SSHManager instantiation...');
  const manager = new SSHManager({ commandTimeout: 30000 });
  console.log('  ✅ SSHManager created');
  console.log(`  - getStatus (no connections): ${manager.getStatus()}`);
  console.log(`  - getAllStatuses: ${manager.getAllStatuses().length} connections`);
  await manager.cleanup();
  console.log('  ✅ cleanup() called');
  console.log();

  // Test 5: Check index.js has shebang
  console.log('[5/5] Checking index.js is executable...');
  const indexPath = join(PROJECT_ROOT, 'dist/index.js');
  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  if (indexContent.startsWith('#!/usr/bin/env node')) {
    console.log('  ✅ Shebang present');
  } else {
    console.log('  ⚠️  Note: No shebang (expected in src/index.ts)');
  }
  console.log();

  console.log('='.repeat(60));
  console.log('Summary:');
  console.log('  ✅ Basic tests passed');
  console.log();
  console.log('Next steps:');
  if (!configExists) {
    console.log('  1. Set up your config file:');
    console.log(`     mkdir -p ~/.claude`);
    console.log(`     cp example-config.json ~/.claude/ssh-mcp-config.json`);
    console.log(`     # Then edit ~/.claude/ssh-mcp-config.json`);
    console.log();
  }
  console.log('  2. To test the full MCP server:');
  console.log('     node dist/index.js');
  console.log('     (It should show "mcpHydroSSH MCP Server running on stdio")');
  console.log();
  console.log('  3. For manual MCP protocol testing, use test/mcp-tester.js');
  console.log('='.repeat(60));

} catch (e) {
  console.error(`❌ Test failed: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
}
