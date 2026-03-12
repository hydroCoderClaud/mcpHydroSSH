# mcpHydroSSH MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal viable SSH MCP server that allows Claude Code to connect to remote servers, execute commands, and maintain long-lived connections.

**Architecture:** Node.js + TypeScript + `@modelcontextprotocol/sdk` + `ssh2` library. The server maintains an SSH connection pool, exposes MCP tools for Claude Code to use.

**Tech Stack:** Node.js 18+, TypeScript 5.0+, `@modelcontextprotocol/sdk`, `ssh2`, `uuid`, `zod`

---

## Chunk 1: Project Setup & Dependencies

### Task 1: Initialize npm project

**Files:**
- Create: `C:\workspace\develop\ccExtensions\mcpHydroSSH\package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "mcp-hydro-ssh",
  "version": "0.1.0",
  "description": "SSH MCP Server for Claude Code",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js"
  },
  "keywords": ["mcp", "ssh", "claude"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.1",
    "ssh2": "^1.15.0",
    "uuid": "^9.0.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/ssh2": "^1.11.19",
    "@types/uuid": "^9.0.7",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules
dist
.DS_Store
*.log
.env
```

- [ ] **Step 4: Create example-config.json**

```json
{
  "servers": [
    {
      "id": "example-server",
      "name": "Example Server",
      "host": "example.com",
      "port": 22,
      "username": "deploy",
      "authMethod": "agent",
      "connectTimeout": 30000,
      "keepaliveInterval": 60000
    }
  ],
  "settings": {
    "defaultConnectTimeout": 30000,
    "commandTimeout": 60000,
    "maxConnections": 5,
    "autoReconnect": false,
    "logCommands": true
  }
}
```

- [ ] **Step 5: Create README.md**

```markdown
# mcpHydroSSH

SSH MCP Server for Claude Code - connect to remote servers directly from Claude Code.

## Setup

1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Copy `example-config.json` to `~/.claude/ssh-mcp-config.json` and configure your servers
4. Add to Claude Code settings.json

See [docs/design.md](docs/design.md) for more details.
```

- [ ] **Step 6: Install dependencies**

Run: `cd "C:\workspace\develop\ccExtensions\mcpHydroSSH" && npm install`

Expected: npm installs all dependencies successfully

---

## Chunk 2: Type Definitions

### Task 2: Create TypeScript types

**Files:**
- Create: `C:\workspace\develop\ccExtensions\mcpHydroSSH\src\types.ts`

- [ ] **Step 1: Write src/types.ts**

```typescript
import type { Client } from 'ssh2';

// 服务器配置
export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'agent' | 'key' | 'password';
  privateKeyPath?: string;
  password?: string;
  connectTimeout?: number;
  keepaliveInterval?: number;
}

// 全局配置
export interface Config {
  servers: ServerConfig[];
  settings: {
    defaultConnectTimeout: number;
    commandTimeout: number;
    maxConnections: number;
    autoReconnect: boolean;
    logCommands: boolean;
  };
}

// SSH 连接状态
export interface SSHConnection {
  id: string;
  serverId: string;
  client: Client;
  connectedAt: Date;
  lastActivity: Date;
  isBusy: boolean;
}

// 命令执行结果
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

// 连接状态信息
export interface ConnectionStatus {
  connectionId: string;
  serverId: string;
  status: 'connected' | 'disconnected';
  connectedAt?: string;
  lastActivity?: string;
  isBusy: boolean;
}

// 服务器列表项（用于返回给 Claude Code）
export interface ServerListItem {
  id: string;
  name: string;
  host: string;
  port: number;
}
```

---

## Chunk 3: Config Module

### Task 3: Create config loader with Zod validation

**Files:**
- Create: `C:\workspace\develop\ccExtensions\mcpHydroSSH\src\config.ts`

- [ ] **Step 1: Write src/config.ts**

```typescript
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
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
    commandTimeout: z.number().int().min(1000).default(60000),
    maxConnections: z.number().int().min(1).default(5),
    autoReconnect: z.boolean().default(false),
    logCommands: z.boolean().default(true),
  }),
});

function getConfigPath(): string {
  const home = homedir();
  return path.join(home, '.claude', 'ssh-mcp-config.json');
}

export function loadConfig(): Config {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Config file not found at ${configPath}. Please copy example-config.json and configure your servers.`
    );
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw);
  const validated = ConfigSchema.parse(parsed);

  return validated as Config;
}

export function getServerConfig(config: Config, serverId: string): ServerConfig | undefined {
  return config.servers.find(s => s.id === serverId);
}

export function getConfigSettings(config: Config) {
  return config.settings;
}
```

---

## Chunk 4: SSH Manager Core

### Task 4: Implement SSHManager class

**Files:**
- Create: `C:\workspace\develop\ccExtensions\mcpHydroSSH\src\ssh-manager.ts`

- [ ] **Step 1: Write src/ssh-manager.ts**

```typescript
import { Client } from 'ssh2';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import type { ServerConfig, SSHConnection, ExecResult, ConnectionStatus } from './types.js';

function expandUser(filePath: string): string {
  if (filePath.startsWith('~')) {
    return path.join(homedir(), filePath.slice(1));
  }
  return filePath;
}

export class SSHManager {
  private connections: Map<string, SSHConnection> = new Map();
  private lastConnectionId: string | null = null;
  private readonly commandTimeout: number;

  constructor(options: { commandTimeout: number }) {
    this.commandTimeout = options.commandTimeout;
  }

  /**
   * Connect to a server
   */
  async connect(serverConfig: ServerConfig): Promise<string> {
    const connectionId = uuidv4();
    const client = new Client();

    return new Promise((resolve, reject) => {
      const timeoutMs = serverConfig.connectTimeout || 30000;
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeoutMs);

      client.on('ready', () => {
        clearTimeout(timeout);
        const connection: SSHConnection = {
          id: connectionId,
          serverId: serverConfig.id,
          client,
          connectedAt: new Date(),
          lastActivity: new Date(),
          isBusy: false,
        };
        this.connections.set(connectionId, connection);
        this.lastConnectionId = connectionId;
        resolve(connectionId);
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      client.on('end', () => {
        this.connections.delete(connectionId);
        if (this.lastConnectionId === connectionId) {
          const remaining = Array.from(this.connections.keys());
          this.lastConnectionId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        }
      });

      client.on('close', () => {
        this.connections.delete(connectionId);
        if (this.lastConnectionId === connectionId) {
          const remaining = Array.from(this.connections.keys());
          this.lastConnectionId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        }
      });

      // Build connect options
      const connectOptions: any = {
        host: serverConfig.host,
        port: serverConfig.port,
        username: serverConfig.username,
      };

      // Auth method
      if (serverConfig.authMethod === 'agent') {
        connectOptions.agent = this.getAgentPath();
        connectOptions.agentForward = true;
      } else if (serverConfig.authMethod === 'key' && serverConfig.privateKeyPath) {
        const keyPath = expandUser(serverConfig.privateKeyPath);
        connectOptions.privateKey = fs.readFileSync(keyPath);
      } else if (serverConfig.authMethod === 'password' && serverConfig.password) {
        connectOptions.password = serverConfig.password;
      }

      if (serverConfig.keepaliveInterval) {
        connectOptions.keepaliveInterval = serverConfig.keepaliveInterval;
      }

      client.connect(connectOptions);
    });
  }

  /**
   * Execute a command
   */
  async exec(
    command: string,
    connectionId?: string,
    options?: { timeout?: number; cwd?: string }
  ): Promise<ExecResult> {
    const conn = this.getConnection(connectionId);
    if (conn.isBusy) {
      throw new Error('Connection is busy');
    }

    conn.isBusy = true;
    conn.lastActivity = new Date();
    const startTime = Date.now();

    try {
      const fullCommand = options?.cwd ? `cd ${options.cwd} && ${command}` : command;

      return await new Promise((resolve, reject) => {
        const timeoutMs = options?.timeout || this.commandTimeout;
        const timeout = setTimeout(() => {
          reject(new Error('Command timeout'));
        }, timeoutMs);

        conn.client.exec(fullCommand, (err, stream) => {
          if (err) {
            clearTimeout(timeout);
            reject(err);
            return;
          }

          let stdout = '';
          let stderr = '';
          let exitCode = 0;

          stream.on('data', (data: Buffer) => {
            stdout += data.toString();
          });

          stream.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });

          stream.on('close', (code: number | null) => {
            clearTimeout(timeout);
            exitCode = code ?? 0;
            resolve({
              stdout,
              stderr,
              exitCode,
              duration: Date.now() - startTime,
            });
          });
        });
      });
    } finally {
      conn.isBusy = false;
      conn.lastActivity = new Date();
    }
  }

  /**
   * Disconnect a connection
   */
  async disconnect(connectionId?: string): Promise<void> {
    const conn = this.getConnection(connectionId, false);
    if (!conn) return;

    conn.client.end();
    this.connections.delete(conn.id);

    if (this.lastConnectionId === conn.id) {
      const remaining = Array.from(this.connections.keys());
      this.lastConnectionId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
    }
  }

  /**
   * Get connection status
   */
  getStatus(connectionId?: string): ConnectionStatus | null {
    const conn = this.getConnection(connectionId, false);
    if (!conn) return null;

    return {
      connectionId: conn.id,
      serverId: conn.serverId,
      status: 'connected',
      connectedAt: conn.connectedAt.toISOString(),
      lastActivity: conn.lastActivity.toISOString(),
      isBusy: conn.isBusy,
    };
  }

  /**
   * Get all connection statuses
   */
  getAllStatuses(): ConnectionStatus[] {
    return Array.from(this.connections.values()).map(conn => ({
      connectionId: conn.id,
      serverId: conn.serverId,
      status: 'connected',
      connectedAt: conn.connectedAt.toISOString(),
      lastActivity: conn.lastActivity.toISOString(),
      isBusy: conn.isBusy,
    }));
  }

  /**
   * Cleanup all connections
   */
  async cleanup(): Promise<void> {
    for (const conn of this.connections.values()) {
      conn.client.end();
    }
    this.connections.clear();
    this.lastConnectionId = null;
  }

  // ===== Private methods =====

  private getConnection(connectionId?: string, throwIfMissing: boolean = true): SSHConnection {
    const id = connectionId || this.lastConnectionId;
    if (!id) {
      if (throwIfMissing) {
        throw new Error('No connection available');
      }
      return null as any;
    }

    const conn = this.connections.get(id);
    if (!conn) {
      if (throwIfMissing) {
        throw new Error(`Connection ${id} not found`);
      }
      return null as any;
    }

    return conn;
  }

  private getAgentPath(): string | undefined {
    if (process.platform === 'win32') {
      return '\\\\.\\pipe\\openssh-ssh-agent';
    }
    return process.env.SSH_AUTH_SOCK;
  }
}
```

---

## Chunk 5: MCP Tools

### Task 5: Create MCP tools

**Files:**
- Create: `C:\workspace\develop\ccExtensions\mcpHydroSSH\src\tools\index.ts`
- Create: `C:\workspace\develop\ccExtensions\mcpHydroSSH\src\tools\list-servers.ts`
- Create: `C:\workspace\develop\ccExtensions\mcpHydroSSH\src\tools\connect.ts`
- Create: `C:\workspace\develop\ccExtensions\mcpHydroSSH\src\tools\exec.ts`
- Create: `C:\workspace\develop\ccExtensions\mcpHydroSSH\src\tools\get-status.ts`
- Create: `C:\workspace\develop\ccExtensions\mcpHydroSSH\src\tools\disconnect.ts`

- [ ] **Step 1: Write src/tools/list-servers.ts**

```typescript
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Config, ServerListItem } from '../types.js';

export function registerListServersTool(server: Server, config: Config) {
  const toolName = 'ssh_list_servers';

  server.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
    const existingTools = extra.next ? await extra.next(request) : { tools: [] };
    return {
      tools: [
        ...existingTools.tools,
        {
          name: toolName,
          description: 'List all configured SSH servers',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    if (request.params.name !== toolName) {
      return extra.next ? extra.next(request) : { content: [], isError: true };
    }

    const servers: ServerListItem[] = config.servers.map(s => ({
      id: s.id,
      name: s.name,
      host: s.host,
      port: s.port,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(servers, null, 2),
        },
      ],
    };
  });
}
```

- [ ] **Step 2: Write src/tools/connect.ts**

```typescript
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Config } from '../types.js';
import type { SSHManager } from '../ssh-manager.js';

export function registerConnectTool(server: Server, config: Config, sshManager: SSHManager) {
  const toolName = 'ssh_connect';

  server.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
    const existingTools = extra.next ? await extra.next(request) : { tools: [] };
    return {
      tools: [
        ...existingTools.tools,
        {
          name: toolName,
          description: 'Connect to an SSH server',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID from ssh_list_servers',
              },
              timeout: {
                type: 'number',
                description: 'Connection timeout in milliseconds (optional)',
              },
            },
            required: ['serverId'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    if (request.params.name !== toolName) {
      return extra.next ? extra.next(request) : { content: [], isError: true };
    }

    const args = request.params.arguments as any;
    const serverId = args.serverId as string;

    const serverConfig = config.servers.find(s => s.id === serverId);
    if (!serverConfig) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `Server ${serverId} not found` }, null, 2),
          },
        ],
        isError: true,
      };
    }

    try {
      const connectionId = await sshManager.connect(serverConfig);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ connectionId, status: 'connected' }, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: err.message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });
}
```

- [ ] **Step 3: Write src/tools/exec.ts**

```typescript
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { SSHManager } from '../ssh-manager.js';

export function registerExecTool(server: Server, sshManager: SSHManager) {
  const toolName = 'ssh_exec';

  server.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
    const existingTools = extra.next ? await extra.next(request) : { tools: [] };
    return {
      tools: [
        ...existingTools.tools,
        {
          name: toolName,
          description: 'Execute a command on an SSH server',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'Command to execute',
              },
              connectionId: {
                type: 'string',
                description: 'Connection ID (optional, uses most recent if not provided)',
              },
              timeout: {
                type: 'number',
                description: 'Command timeout in milliseconds (optional)',
              },
              cwd: {
                type: 'string',
                description: 'Working directory (optional)',
              },
            },
            required: ['command'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    if (request.params.name !== toolName) {
      return extra.next ? extra.next(request) : { content: [], isError: true };
    }

    const args = request.params.arguments as any;
    const command = args.command as string;
    const connectionId = args.connectionId as string | undefined;
    const timeout = args.timeout as number | undefined;
    const cwd = args.cwd as string | undefined;

    try {
      const result = await sshManager.exec(command, connectionId, { timeout, cwd });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: err.message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });
}
```

- [ ] **Step 4: Write src/tools/get-status.ts**

```typescript
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { SSHManager } from '../ssh-manager.js';

export function registerGetStatusTool(server: Server, sshManager: SSHManager) {
  const toolName = 'ssh_get_status';

  server.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
    const existingTools = extra.next ? await extra.next(request) : { tools: [] };
    return {
      tools: [
        ...existingTools.tools,
        {
          name: toolName,
          description: 'Get SSH connection status',
          inputSchema: {
            type: 'object',
            properties: {
              connectionId: {
                type: 'string',
                description: 'Connection ID (optional, shows all connections if not provided)',
              },
            },
            required: [],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    if (request.params.name !== toolName) {
      return extra.next ? extra.next(request) : { content: [], isError: true };
    }

    const args = request.params.arguments as any;
    const connectionId = args.connectionId as string | undefined;

    if (connectionId) {
      const status = sshManager.getStatus(connectionId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    } else {
      const statuses = sshManager.getAllStatuses();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(statuses, null, 2),
          },
        ],
      };
    }
  });
}
```

- [ ] **Step 5: Write src/tools/disconnect.ts**

```typescript
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { SSHManager } from '../ssh-manager.js';

export function registerDisconnectTool(server: Server, sshManager: SSHManager) {
  const toolName = 'ssh_disconnect';

  server.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
    const existingTools = extra.next ? await extra.next(request) : { tools: [] };
    return {
      tools: [
        ...existingTools.tools,
        {
          name: toolName,
          description: 'Disconnect from an SSH server',
          inputSchema: {
            type: 'object',
            properties: {
              connectionId: {
                type: 'string',
                description: 'Connection ID (optional, disconnects most recent if not provided)',
              },
            },
            required: [],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    if (request.params.name !== toolName) {
      return extra.next ? extra.next(request) : { content: [], isError: true };
    }

    const args = request.params.arguments as any;
    const connectionId = args.connectionId as string | undefined;

    try {
      await sshManager.disconnect(connectionId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true }, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: err.message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });
}
```

- [ ] **Step 6: Write src/tools/index.ts**

```typescript
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { Config } from '../types.js';
import type { SSHManager } from '../ssh-manager.js';
import { registerListServersTool } from './list-servers.js';
import { registerConnectTool } from './connect.js';
import { registerExecTool } from './exec.js';
import { registerGetStatusTool } from './get-status.js';
import { registerDisconnectTool } from './disconnect.js';

export function registerAllTools(server: Server, config: Config, sshManager: SSHManager) {
  registerListServersTool(server, config);
  registerConnectTool(server, config, sshManager);
  registerExecTool(server, sshManager);
  registerGetStatusTool(server, sshManager);
  registerDisconnectTool(server, sshManager);
}
```

---

## Chunk 6: MCP Server Entry Point

### Task 6: Create main index.ts

**Files:**
- Create: `C:\workspace\develop\ccExtensions\mcpHydroSSH\src\index.ts`

- [ ] **Step 1: Write src/index.ts**

```typescript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig, getConfigSettings } from './config.js';
import { SSHManager } from './ssh-manager.js';
import { registerAllTools } from './tools/index.js';

async function main() {
  const server = new Server(
    {
      name: 'mcp-hydro-ssh',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Load config
  const config = loadConfig();
  const settings = getConfigSettings(config);

  // Initialize SSH manager
  const sshManager = new SSHManager({
    commandTimeout: settings.commandTimeout,
  });

  // Register all tools
  registerAllTools(server, config, sshManager);

  // Cleanup on exit
  process.on('SIGINT', async () => {
    await sshManager.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await sshManager.cleanup();
    process.exit(0);
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('mcpHydroSSH MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Server error:', err);
  process.exit(1);
});
```

---

## Chunk 7: Build & Test

### Task 7: Build the project and verify

**Files:**
- (no new files, use existing)

- [ ] **Step 1: Build the project**

Run: `cd "C:\workspace\develop\ccExtensions\mcpHydroSSH" && npm run build`

Expected: TypeScript compiles without errors, dist/ directory created

- [ ] **Step 2: Verify dist directory**

Check that these files exist:
- `dist/index.js`
- `dist/types.js`
- `dist/config.js`
- `dist/ssh-manager.js`
- `dist/tools/index.js`
- `dist/tools/list-servers.js`
- `dist/tools/connect.js`
- `dist/tools/exec.js`
- `dist/tools/get-status.js`
- `dist/tools/disconnect.js`

- [ ] **Step 3: Test config loading**

Copy the example config and test:
```bash
cd "C:\workspace\develop\ccExtensions\mcpHydroSSH"
mkdir -p ~/.claude
cp example-config.json ~/.claude/ssh-mcp-config.json
```

- [ ] **Step 4: Final review**

Read through all created files and verify:
- All imports use `.js` extensions (ES modules requirement)
- TypeScript types are correctly used
- Error handling is in place
- README has basic setup instructions

---

## Summary

This plan creates a complete, working SSH MCP server with:
- Project structure and dependencies
- Type-safe config loading with Zod validation
- SSH connection management with `ssh2` library
- 5 MCP tools for Claude Code
- Clean entry point
- Proper cleanup on shutdown

Next steps after MVP: Add SFTP, interactive shell, logging, and prepare for open source!
