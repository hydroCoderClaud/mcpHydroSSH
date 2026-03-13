# mcp-hydrocoder-ssh

[中文](README_CN.md) | **English** | [Configuration Guide](CONFIG-GUIDE_EN.md) | [配置指南](CONFIG-GUIDE.md)

MCP server that provides SSH remote connection capabilities for Claude Code. Connect to remote servers, execute commands, and automate deployments without needing a separate SSH terminal.

[![npm version](https://img.shields.io/npm/v/mcp-hydrocoder-ssh.svg)](https://www.npmjs.com/package/mcp-hydrocoder-ssh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Part 1: Features

### What is this?

`mcp-hydrocoder-ssh` is an MCP (Model Context Protocol) server that enables Claude Code to:
- 🔌 Connect to remote SSH servers directly (persistent background connections)
- ⚡ Execute commands and get complete output
- 🔄 Maintain connection state for multi-step operations
- 🚀 Run deployment scripts (git pull, npm install, systemctl restart, etc.)

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **No window switching** | Complete all remote operations within Claude Code conversation |
| **Smart deployment** | Claude can auto-determine next steps based on command output |
| **Multi-server management** | Manage multiple server configs, switch quickly |
| **Secure authentication** | Support SSH agent, key files |
| **Connection pooling** | Maintain persistent connections, avoid re-authentication overhead |

### Available Tools

**SSH Connection Tools (5):**
- `ssh_list_servers` - List all configured servers
- `ssh_connect` - Connect to a server
- `ssh_exec` - Execute commands (with working directory support)
- `ssh_get_status` - Get connection status
- `ssh_disconnect` - Disconnect from server

**Configuration Management Tools (5):**
- `ssh_add_server` - Add new server configuration
- `ssh_remove_server` - Remove server configuration
- `ssh_update_server` - Update server configuration
- `ssh_view_config` - View config (filters sensitive info)
- `ssh_help` - Show help information

---

## Part 2: Quick Installation

### Step 1: Choose Installation Method

**Option A: Global Installation (Recommended)**

```bash
npm install -g mcp-hydrocoder-ssh
```

**Option B: Using npx (No installation required)**

```bash
# No action needed - use npx directly in config
```

---

### Step 2: Configure Claude Code

Edit `~/.claude.json` in your user directory:

**Option A (Global Install):**
```json
{
  "mcpServers": {
    "hydrossh": {
      "command": "mcp-hydrocoder-ssh"
    }
  }
}
```

**Option B (npx):**
```json
{
  "mcpServers": {
    "hydrossh": {
      "command": "npx",
      "args": ["-y", "mcp-hydrocoder-ssh"]
    }
  }
}
```

> **Note:**
> - `hydrossh` is the server identifier, can be changed to any name you prefer.
> - `-y` flag lets npx auto-confirm installation, avoiding interactive prompts.

### Step 3: Restart Claude Code

Close and reopen Claude Code to load the configuration.

### Step 4: Verify Installation

In Claude Code, enter:
```
List available SSH servers
```

If you see a server list (empty list means no servers configured yet), the installation was successful. You can use natural language to add configs, modify configs, or connect to servers.

---

## Part 3: Using from Source Code

### 1. Clone Repository

```bash
git clone https://github.com/hydroCoderClaud/mcpHydroSSH.git
cd mcpHydroSSH
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build

```bash
npm run build
```

Build output goes to `dist/` directory:
- `dist/index.js` - MCP server entry point
- `dist/ssh-manager.js` - SSH connection management
- `dist/config.js` - Configuration management

### 4. Configure Claude Code

Edit `~/.claude.json` in your user directory:

```json
{
  "mcpServers": {
    "hydrossh": {
      "command": "node",
      "args": ["<absolute-path>/dist/index.js"]
    }
  }
}
```

> **Note:** Replace `<absolute-path>` with your actual source directory absolute path.

### 5. Restart Claude Code

Close and reopen Claude Code to load the configuration.

### 6. Development Mode (Optional)

For hot-reload development:
```bash
npm run dev
```

Then configure Claude Code with:

```json
{
  "mcpServers": {
    "hydrossh": {
      "command": "npx",
      "args": ["tsx", "<absolute-path>/src/index.ts"]
    }
  }
}
```

---

## Appendix A: SSH Configuration

Configuration file location: `~/.claude/ssh-mcp-config.json`

### Configuration Example

```json
{
  "servers": [
    {
      "id": "prod-server",
      "name": "Production Server",
      "host": "example.com",
      "port": 22,
      "username": "deploy",
      "authMethod": "agent"
    },
    {
      "id": "test-server",
      "name": "Test Server",
      "host": "test.example.com",
      "username": "ubuntu",
      "authMethod": "key",
      "privateKeyPath": "~/.ssh/id_rsa"
    }
  ],
  "settings": {
    "defaultConnectTimeout": 30000,
    "defaultKeepaliveInterval": 60000,
    "commandTimeout": 60000,
    "maxConnections": 5,
    "logCommands": true
  }
}
```

### Authentication Methods

| Method | Configuration | Description |
|--------|---------------|-------------|
| **SSH Agent** | `"authMethod": "agent"` | Recommended, uses system SSH agent |
| **Key File** | `"authMethod": "key", "privateKeyPath": "~/.ssh/id_rsa"` | Default, reads private key file |
| **Password** | `"authMethod": "password", "password": "xxx"` | Not recommended, password stored in plaintext |

See [CONFIG-GUIDE_EN.md](CONFIG-GUIDE_EN.md) for details.

---

## Appendix B: Usage Examples

### Basic Usage

```
User: List available servers
Claude: Found 2 configured servers: prod-server, test-server

User: Connect to prod-server
Claude: [ssh_connect] Connected! connectionId: xxx

User: Execute command: uptime
Claude: [ssh_exec] Returns: up 30 days, 2 users, load average: 0.1, 0.2, 0.5

User: Disconnect
Claude: [ssh_disconnect] Disconnected
```

### Automated Deployment

```
User: Deploy latest code to production server
Claude: Okay, I'll execute the deployment flow...
1. Connect to prod-server
2. cd /opt/myapp && git pull
3. npm ci --production
4. sudo systemctl restart myapp
5. Check service status
6. Disconnect
Deployment complete!
```

---

## Appendix C: Security Notes

- 🔒 **SSH Agent Recommended** - Prefer `authMethod: "agent"`
- 🔒 **Config File Permissions** - Ensure `~/.claude/ssh-mcp-config.json` is readable only by you
- 🔒 **Config Viewing** - `ssh_view_config` tool automatically filters passwords and key paths

---

## Appendix D: Troubleshooting

| Issue | Solution |
|-------|----------|
| SSH Agent not running | Windows: Start "OpenSSH Authentication Agent" service |
| Connection timeout | Check server address, port, network connectivity |
| Command not found | Verify npm global install or check PATH environment variable |
| Config not loaded | Check if `~/.claude.json` format is correct |

---

## Appendix E: Command Reference

### Development Commands

```bash
npm run build        # Build TypeScript
npm run dev          # Development mode (hot reload)
npm test             # Run tests
npm run lint         # Code linting
npm run format       # Code formatting
```

### MCP Tool Parameters

| Tool | Parameters | Description |
|------|------------|-------------|
| `ssh_list_servers` | none | List all configured servers |
| `ssh_connect` | `serverId`, `timeout?` | Connect to server |
| `ssh_exec` | `command`, `connectionId?`, `timeout?`, `cwd?` | Execute command |
| `ssh_get_status` | `connectionId?` | Get connection status (all if not specified) |
| `ssh_disconnect` | `connectionId?` | Disconnect (most recent if not specified) |
| `ssh_add_server` | `id`, `name`, `host`, `username`, `port?`, `authMethod?`, `privateKeyPath?`, `password?` | Add server config |
| `ssh_remove_server` | `serverId` | Remove server config |
| `ssh_update_server` | `serverId`, `name?`, `host?`, `port?`, `username?`, `authMethod?`, `privateKeyPath?`, `password?` | Update server config |
| `ssh_view_config` | none | View config (filters sensitive info) |
| `ssh_help` | `topic?` | Show help information |

---

## License

MIT
