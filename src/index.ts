#! /usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { initializeConfig, loadConfig, getConfigSettings, addServer, removeServer, updateServer } from './config.js';
import { SSHManager } from './ssh-manager.js';
import type { ServerListItem, ServerConfig } from './types.js';

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

  // Initialize config (auto-create if not exists)
  initializeConfig();

  // Load config
  const config = loadConfig();
  const settings = getConfigSettings(config);

  // Initialize SSH manager
  const sshManager = new SSHManager({
    commandTimeout: settings.commandTimeout,
    keepaliveInterval: settings.defaultKeepaliveInterval,
    maxConnections: settings.maxConnections,
    autoReconnect: settings.autoReconnect,
    logCommands: settings.logCommands,
  });

  // ===== Tool handlers =====

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'ssh_list_servers',
          description: 'List all configured SSH servers',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'ssh_view_config',
          description: 'View the full SSH configuration including servers and settings',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'ssh_connect',
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
        {
          name: 'ssh_exec',
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
        {
          name: 'ssh_get_status',
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
        {
          name: 'ssh_disconnect',
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
        {
          name: 'ssh_help',
          description: 'Show help and usage examples for mcpHydroSSH',
          inputSchema: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                description: 'Specific topic to get help on (optional)',
                enum: ['config', 'connect', 'exec', 'auth', 'examples'],
              },
            },
            required: [],
          },
        },
        {
          name: 'ssh_add_server',
          description: 'Add a new SSH server to config',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Unique server ID',
              },
              name: {
                type: 'string',
                description: 'Server display name',
              },
              host: {
                type: 'string',
                description: 'Server hostname or IP',
              },
              port: {
                type: 'number',
                description: 'SSH port (default: 22)',
              },
              username: {
                type: 'string',
                description: 'SSH username',
              },
              authMethod: {
                type: 'string',
                enum: ['agent', 'key', 'password'],
                description: 'Authentication method (default: "key")',
              },
              privateKeyPath: {
                type: 'string',
                description: 'Path to private key (required for "key" auth)',
              },
              password: {
                type: 'string',
                description: 'Password (required for "password" auth)',
              },
            },
            required: ['id', 'name', 'host', 'username'],
          },
        },
        {
          name: 'ssh_remove_server',
          description: 'Remove a server from config',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID to remove',
              },
            },
            required: ['serverId'],
          },
        },
        {
          name: 'ssh_update_server',
          description: 'Update an existing server config',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID to update',
              },
              name: {
                type: 'string',
                description: 'Server display name',
              },
              host: {
                type: 'string',
                description: 'Server hostname or IP',
              },
              port: {
                type: 'number',
                description: 'SSH port (default: 22)',
              },
              username: {
                type: 'string',
                description: 'SSH username',
              },
              authMethod: {
                type: 'string',
                enum: ['agent', 'key', 'password'],
                description: 'Authentication method (default: "key")',
              },
              privateKeyPath: {
                type: 'string',
                description: 'Path to private key (required for "key" auth)',
              },
              password: {
                type: 'string',
                description: 'Password (required for "password" auth)',
              },
            },
            required: ['serverId'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = request.params.arguments as any;

    switch (toolName) {
      case 'ssh_list_servers': {
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
      }

      case 'ssh_view_config': {
        // Filter out sensitive information (passwords and private key paths)
        const sanitizedConfig = {
          servers: config.servers.map(s => ({
            id: s.id,
            name: s.name,
            host: s.host,
            port: s.port,
            username: s.username,
            authMethod: s.authMethod,
            // Exclude: password, privateKeyPath for security
          })),
          settings: config.settings,
        };
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sanitizedConfig, null, 2),
            },
          ],
        };
      }

      case 'ssh_help': {
        const topic = args.topic as string | undefined;
        const helpContent = getHelpContent(topic);
        return {
          content: [
            {
              type: 'text',
              text: helpContent,
            },
          ],
        };
      }

      case 'ssh_connect': {
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
        } catch (err: unknown) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      case 'ssh_exec': {
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
        } catch (err: unknown) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      case 'ssh_get_status': {
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
      }

      case 'ssh_disconnect': {
        const connectionId = args.connectionId as string | undefined;
        try {
          sshManager.disconnect(connectionId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true }, null, 2),
              },
            ],
          };
        } catch (err: unknown) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      case 'ssh_add_server': {
        const server = {
          id: args.id as string,
          name: args.name as string,
          host: args.host as string,
          port: (args.port as number) || 22,
          username: args.username as string,
          authMethod: (args.authMethod as 'agent' | 'key' | 'password') || 'key',
          privateKeyPath: args.privateKeyPath as string | undefined,
          password: args.password as string | undefined,
        };
        try {
          addServer(server);
          // Update in-memory config
          config.servers.push(server);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, message: `Server "${server.id}" added` }, null, 2),
              },
            ],
          };
        } catch (err: unknown) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      case 'ssh_remove_server': {
        const serverId = args.serverId as string;
        try {
          // Disconnect active connections first
          sshManager.disconnectByServerId(serverId);

          removeServer(serverId);
          // Update in-memory config
          const index = config.servers.findIndex(s => s.id === serverId);
          if (index !== -1) {
            config.servers.splice(index, 1);
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, message: `Server "${serverId}" removed` }, null, 2),
              },
            ],
          };
        } catch (err: unknown) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      case 'ssh_update_server': {
        const serverId = args.serverId as string;
        const updates: Partial<ServerConfig> = {};
        if (args.name !== undefined) {updates.name = args.name;}
        if (args.host !== undefined) {updates.host = args.host;}
        if (args.port !== undefined) {updates.port = args.port;}
        if (args.username !== undefined) {updates.username = args.username;}
        if (args.authMethod !== undefined) {updates.authMethod = args.authMethod;}
        if (args.privateKeyPath !== undefined) {updates.privateKeyPath = args.privateKeyPath;}
        if (args.password !== undefined) {updates.password = args.password;}

        try {
          updateServer(serverId, updates);
          // Update in-memory config
          const server = config.servers.find(s => s.id === serverId);
          if (server) {
            Object.assign(server, updates);
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, message: `Server "${serverId}" updated` }, null, 2),
              },
            ],
          };
        } catch (err: unknown) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      default:
        return {
          content: [],
          isError: true,
        };
    }
  });

  // Cleanup on exit
  process.on('SIGINT', () => {
    sshManager.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    sshManager.cleanup();
    process.exit(0);
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('mcpHydroSSH MCP Server running on stdio');
}

// ===== Help content =====

function getHelpContent(topic?: string): string {
  if (topic === 'config') {
    return `# Config Help

**Config file location:** \`~/.hydrossh/config.json\`

**Server fields:**
- \`id\` (required): Unique server identifier
- \`name\` (required): Display name
- \`host\` (required): Server hostname or IP
- \`port\`: SSH port (default: 22)
- \`username\`: SSH username
- \`authMethod\`: "agent" | "key" | "password" (default: "agent")
- \`privateKeyPath\`: Path to private key (for "key" auth)
- \`password\`: Password (for "password" auth)

**Example:**
\`\`\`json
{
  "id": "my-server",
  "name": "My Server",
  "host": "1.2.3.4",
  "username": "root",
  "authMethod": "key",
  "privateKeyPath": "~/.ssh/id_rsa"
}
\`\`\``;
  }

  if (topic === 'connect') {
    return `# Connection Help

**Tools:**
- \`ssh_list_servers\` - List configured servers
- \`ssh_connect\` - Connect to a server (params: serverId, timeout?)
- \`ssh_get_status\` - Check connection status
- \`ssh_disconnect\` - Disconnect from server

**Note:** \`connectionId\` is optional for most tools - uses most recent connection if not provided.`;
  }

  if (topic === 'exec') {
    return `# Command Execution Help

**Tool:** \`ssh_exec\`

**Params:**
- \`command\` (required): Command to execute
- \`connectionId\` (optional): Which connection to use
- \`timeout\` (optional): Command timeout in ms
- \`cwd\` (optional): Working directory

**Example:**
\`\`\`json
{
  "command": "ls -la",
  "cwd": "/var/www"
}
\`\`\``;
  }

  if (topic === 'auth') {
    return `# Authentication Help

**Methods:**

1. **agent** (recommended for security)
   - Uses system SSH agent
   - Requires: \`ssh-agent\` service running
   - Requires: \`ssh-add your-key.pem\`

2. **key** (simplest)
   - Direct key file access
   - Config: \`"authMethod": "key", "privateKeyPath": "~/.ssh/id_rsa"\`

3. **password** (not recommended)
   - Plain password auth
   - Config: \`"authMethod": "password", "password": "xxx"\`
   - ⚠️ Password stored in config file!`;
  }

  if (topic === 'examples') {
    return `# Usage Examples

**List servers:**
\`\`\`
ssh_list_servers
\`\`\`

**Connect:**
\`\`\`
ssh_connect { "serverId": "my-server" }
\`\`\`

**Execute command:**
\`\`\`
ssh_exec { "command": "uptime" }
\`\`\`

**Add server:**
\`\`\`
ssh_add_server {
  "id": "new-server",
  "name": "New Server",
  "host": "1.2.3.4",
  "username": "root",
  "authMethod": "key",
  "privateKeyPath": "~/.ssh/id_rsa"
}
\`\`\`

**Update server:**
\`\`\`
ssh_update_server {
  "serverId": "my-server",
  "host": "new-ip.com"
}
\`\`\`

**Remove server:**
\`\`\`
ssh_remove_server { "serverId": "my-server" }
\`\`\``;
  }

  // Default - full help
  return `# mcpHydroSSH Help

**Quick Start:**
1. Say "list servers" to see configured servers
2. Say "connect to [server-name]" to connect
3. Say "run [command]" to execute commands

## Tools

### Connection
- \`ssh_list_servers\` - List servers
- \`ssh_connect\` - Connect (params: serverId, timeout?)
- \`ssh_exec\` - Run command (params: command, connectionId?, timeout?, cwd?)
- \`ssh_get_status\` - Check status
- \`ssh_disconnect\` - Disconnect

### Config Management
- \`ssh_add_server\` - Add server (params: id, name, host, username, authMethod?, privateKeyPath?, password?)
- \`ssh_update_server\` - Update server (params: serverId, +optional fields)
- \`ssh_remove_server\` - Remove server (params: serverId)
- \`ssh_view_config\` - View full configuration

### Help
- \`ssh_help\` - Show this help
- \`ssh_help { topic: "config" }\` - Config help
- \`ssh_help { topic: "connect" }\` - Connection help
- \`ssh_help { topic: "auth" }\` - Authentication help
- \`ssh_help { topic: "examples" }\` - Usage examples

**Config file:** \`~/.hydrossh/config.json\`
`;
}

main().catch((err) => {
  console.error('Server error:', err);
  process.exit(1);
});
