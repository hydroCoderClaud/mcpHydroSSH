import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import type { Config, ServerConfig } from './types.js';

// Zod schemas for validation
const ServerConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1),
  authMethod: z.enum(['agent', 'key', 'password']).default('agent'),
  privateKeyPath: z.string().optional(),
  password: z.string().optional(),
  connectTimeout: z.number().int().min(1000).optional(),
  keepaliveInterval: z.number().int().min(1000).optional(),
});

const ConfigSchema = z.object({
  servers: z.array(ServerConfigSchema),
  settings: z.object({
    defaultConnectTimeout: z.number().int().min(1000).default(30000),
    defaultKeepaliveInterval: z.number().int().min(0).default(60000),  // 60 秒，0 表示禁用
    commandTimeout: z.number().int().min(1000).default(60000),
    maxConnections: z.number().int().min(1).default(5),
    autoReconnect: z.boolean().default(false),
    logCommands: z.boolean().default(true),
  }),
});

const DEFAULT_CONFIG_PATH = path.join(homedir(), '.hydrossh', 'config.json');

function getConfigPath(): string {
  return DEFAULT_CONFIG_PATH;
}

function getExamplePath(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(moduleDir, '..', 'example-config.json');
}

/**
 * Initialize config file if not exists.
 * Copies example-config.json to ~/.hydrossh/config.json
 * @returns The path to the config file
 * @throws Error if example-config.json is not found
 */
export function initializeConfig(): string {
  const userPath = getConfigPath();

  // Config already exists
  if (fs.existsSync(userPath)) {
    return userPath;
  }

  const examplePath = getExamplePath();

  // Check if example exists
  if (!fs.existsSync(examplePath)) {
    throw new Error(`Example config not found at ${examplePath}`);
  }

  // Create ~/.hydrossh directory
  const configDir = path.dirname(userPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Copy example config
  fs.copyFileSync(examplePath, userPath);

  console.error(`[mcpHydroSSH] Created default config at ${userPath}`);
  console.error(`[mcpHydroSSH] Please edit the config file with your SSH servers.`);

  return userPath;
}

/**
 * Load and validate the config file.
 * @returns The validated config object
 * @throws Error if config file is not found or contains invalid JSON
 */
export function loadConfig(): Config {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Config file not found: ${configPath}\n` +
      `Run the server again to auto-create, or manually:\n` +
      `  mkdir -p ~/.hydrossh && cp <mcp-dir>/example-config.json ~/.hydrossh/config.json`
    );
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Invalid JSON in config file: ${configPath}\n` +
      `Details: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  const validated = ConfigSchema.parse(parsed);

  return validated as Config;
}

/**
 * Get a server configuration by ID.
 * @param config - The config object
 * @param serverId - The server ID to look up
 * @returns The server config or undefined if not found
 */
export function getServerConfig(config: Config, serverId: string): ServerConfig | undefined {
  return config.servers.find(s => s.id === serverId);
}

/**
 * Get the settings section of the config.
 * @param config - The config object
 * @returns The settings object
 */
export function getConfigSettings(config: Config) {
  return config.settings;
}

/**
 * Save config to file.
 * @param config - The config object to save
 */
export function saveConfig(config: Config): void {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);

  // Create directory if not exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Write config file
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Add a server to the config.
 * @param server - The server configuration to add
 * @throws Error if server ID already exists
 */
export function addServer(server: ServerConfig): void {
  const config = loadConfig();

  // Check if server ID already exists
  if (config.servers.some(s => s.id === server.id)) {
    throw new Error(`Server with ID "${server.id}" already exists`);
  }

  config.servers.push(server);
  saveConfig(config);
}

/**
 * Remove a server from the config.
 * @param serverId - The server ID to remove
 * @throws Error if server ID not found
 */
export function removeServer(serverId: string): void {
  const config = loadConfig();

  const index = config.servers.findIndex(s => s.id === serverId);
  if (index === -1) {
    throw new Error(`Server with ID "${serverId}" not found`);
  }

  config.servers.splice(index, 1);
  saveConfig(config);
}

/**
 * Update a server in the config.
 * @param serverId - The server ID to update
 * @param updates - Partial server configuration to merge
 * @throws Error if server ID not found
 */
export function updateServer(serverId: string, updates: Partial<ServerConfig>): void {
  const config = loadConfig();

  const server = config.servers.find(s => s.id === serverId);
  if (!server) {
    throw new Error(`Server with ID "${serverId}" not found`);
  }

  // Apply updates
  Object.assign(server, updates);

  // Re-validate
  ServerConfigSchema.parse(server);

  saveConfig(config);
}
