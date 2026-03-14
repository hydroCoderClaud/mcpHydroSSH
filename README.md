# mcp-hydrocoder-ssh

[中文](https://github.com/hydroCoderClaud/mcpHydroSSH/blob/main/README_CN.md) | **English** | [Configuration Guide](https://github.com/hydroCoderClaud/mcpHydroSSH/blob/main/CONFIG-GUIDE_EN.md) | [配置指南](https://github.com/hydroCoderClaud/mcpHydroSSH/blob/main/CONFIG-GUIDE.md)

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

## Part 2: Installation

### Option 1: Global Install + User-Level Config (Recommended)

```bash
npm install -g mcp-hydrocoder-ssh
claude mcp add -s user hydrossh mcp-hydrocoder-ssh
```

### Option 2: No Install + User-Level Config

```bash
claude mcp add -s user hydrossh npx mcp-hydrocoder-ssh@latest
```

### Option 3: Global Install + Project-Level Config

```bash
npm install -g mcp-hydrocoder-ssh
claude mcp add hydrossh mcp-hydrocoder-ssh
```

### Option 4: No Install + Project-Level Config

```bash
claude mcp add hydrossh npx mcp-hydrocoder-ssh@latest
```

> **Notes:**
> - `-s user` flag sets user-level MCP configuration, available to all projects
> - Without `-s user`, configuration is project-level, only available to current project
> - Using `npx` does not require pre-installing the npm package

### Verify Installation

In Claude Code, enter:
```
List available SSH servers
```

If you see a server list (empty list means no servers configured yet), the installation was successful.

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

Edit `~/.claude.json`:

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

Close and reopen Claude Code.

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

Configuration file location: `~/.hydrossh/config.json`

**Auto-created on first run:** The `~/.hydrossh/` directory and config file are automatically created when the MCP server first starts.

### Quick Add via Claude Code

After installation, you can add server configs using natural language commands.

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
- 🔒 **Config File Permissions** - Ensure `~/.hydrossh/config.json` is readable only by you
- 🔒 **Config Viewing** - `ssh_view_config` tool automatically filters passwords and key paths

---

## Appendix D: Troubleshooting

| Issue | Solution |
|-------|----------|
| SSH Agent not running | Windows: Start "OpenSSH Authentication Agent" service |
| Connection timeout | Check server address, port, network connectivity |
| Command not found | Verify npm global install or check PATH environment variable |
| Config not loaded | Check if `~/.claude.json` format is correct |
| Config file not found | Auto-created on first run, or manually create `~/.hydrossh/config.json` |

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
