# mcp-hydrocoder-ssh

SSH MCP Server for Claude Code - connect to remote servers, execute commands, and automate deployments.

[![npm version](https://img.shields.io/npm/v/mcp-hydrocoder-ssh.svg)](https://www.npmjs.com/package/mcp-hydrocoder-ssh)
[![npm downloads](https://img.shields.io/npm/dm/mcp-hydrocoder-ssh.svg)](https://www.npmjs.com/package/mcp-hydrocoder-ssh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Quick Start

### 1. Install

**Option A: Global install (recommended)**
```bash
npm install -g mcp-hydrocoder-ssh
```

**Option B: Use with npx (no install needed)**
```bash
# Just use npx in Claude Code config (see below)
```

### 2. Configure SSH Servers

On first run, the server will auto-create `~/.hydrossh/config.json` from the example template.

**Edit the config file:**

```bash
# Windows
notepad C:\Users\%USERNAME%\.hydrossh\config.json

# macOS/Linux
nano ~/.hydrossh/config.json
```

**Example configuration:**
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
    "commandTimeout": 60000,
    "maxConnections": 5,
    "logCommands": true
  }
}
```

See [CONFIG-GUIDE.md](CONFIG-GUIDE.md) for detailed configuration options.

### 3. Add to Claude Code

Add to your Claude Code settings (`~/.claude.json`):

**For global install:**
```json
{
  "mcpServers": {
    "hydrossh": {
      "command": "mcp-hydrocoder-ssh"
    }
  }
}
```

**For npx (no install):**
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

> **Note:** The server name `hydrossh` is used to avoid conflicts with other SSH-related MCP servers. You can change it to any name you prefer.

### 4. Usage

In Claude Code, simply say:

```
List available servers
Connect to prod-server
Run command: uptime
Show connection status
Disconnect from prod-server
```

---

## MCP Tools

### SSH Connection Tools

| Tool | Description |
|------|-------------|
| `ssh_list_servers` | List all configured servers |
| `ssh_connect` | Connect to a server (params: `serverId`, `timeout?`) |
| `ssh_exec` | Execute a command (params: `command`, `connectionId?`, `timeout?`, `cwd?`) |
| `ssh_get_status` | Get connection status or all statuses |
| `ssh_disconnect` | Disconnect from server |

### Config Management Tools

| Tool | Description |
|------|-------------|
| `ssh_add_server` | Add a new server to config |
| `ssh_remove_server` | Remove a server from config |
| `ssh_update_server` | Update an existing server config |
| `ssh_view_config` | View full configuration (sanitized - excludes passwords) |
| `ssh_help` | Show help and usage examples |

---

## Configuration Options

### Authentication Methods

#### 1. SSH Agent (Recommended)

Uses your system's SSH agent. Requires `ssh-agent` service running.

```json
{
  "id": "prod-server",
  "username": "deploy",
  "authMethod": "agent"
}
```

#### 2. Private Key File

Direct key file access. Supports `~` path expansion.

```json
{
  "id": "my-server",
  "username": "root",
  "authMethod": "key",
  "privateKeyPath": "~/.ssh/id_rsa"
}
```

#### 3. Password (Not Recommended)

Plain password auth. ⚠️ Password stored in config file!

```json
{
  "id": "test-server",
  "username": "ubuntu",
  "authMethod": "password",
  "password": "your-password"
}
```

### Global Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `defaultConnectTimeout` | Default connection timeout (ms) | 30000 |
| `commandTimeout` | Command execution timeout (ms) | 60000 |
| `maxConnections` | Maximum concurrent connections | 5 |
| `autoReconnect` | Auto-reconnect on disconnect | false |
| `logCommands` | Log command execution to stderr | true |

---

## Development

### Build from source

```bash
git clone https://github.com/hydroCoderClaud/mcpHydroSSH.git
cd mcpHydroSSH
npm install
npm run build
```

### Link for local development

```bash
npm link
```

Then use in Claude Code config:
```json
{
  "mcpServers": {
    "hydrossh": {
      "command": "mcp-hydrocoder-ssh"
    }
  }
}
```

### Run tests

```bash
npm test
```

### Lint and format

```bash
npm run lint
npm run lint:fix
npm run format
```

---

## Security Notes

- 🔒 **Passwords are not persisted** - Only used in memory for password auth
- 🔒 **SSH Agent recommended** - Use `authMethod: "agent"` for best security
- 🔒 **Config file permissions** - Ensure `~/.hydrossh/config.json` is readable only by you
- 🔒 **Config view sanitization** - `ssh_view_config` excludes `password` and `privateKeyPath`

---

## Troubleshooting

### SSH Agent not running

**Windows:** Ensure "OpenSSH Authentication Agent" service is running
```powershell
Get-Service ssh-agent
Start-Service ssh-agent
```

**macOS/Linux:** Check SSH_AUTH_SOCK environment variable
```bash
echo $SSH_AUTH_SOCK
```

### Connection timeout

- Check server hostname and port
- Verify network connectivity
- Increase `connectTimeout` in config

### Command not found after install

Try rebuilding npm links:
```bash
npm uninstall -g mcp-hydrocoder-ssh
npm cache clean --force
npm install -g mcp-hydrocoder-ssh
```

---

## License

MIT
