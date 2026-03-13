# mcpHydroSSH

SSH MCP Server for Claude Code - connect to remote servers directly from Claude Code.

## Quick Start

### 1. Install & Build

```bash
npm install
npm run build
```

### 2. Configure Servers

On first run, the server will auto-create `~/.hydrossh/config.json` from the example template.

Edit the config file with your SSH servers:
```bash
# Windows
notepad C:\Users\ynzys\.hydrossh\config.json

# macOS/Linux
nano ~/.hydrossh/config.json
```

See [CONFIG-GUIDE.md](CONFIG-GUIDE.md) for detailed configuration options.

### 3. Add to Claude Code

Add to your Claude Code settings (`~/.claude.json`):

**Windows:**
```json
{
  "mcpServers": {
    "hydrossh": {
      "command": "node",
      "args": ["C:\\workspace\\develop\\ccExtensions\\mcpHydroSSH\\dist\\index.js"]
    }
  }
}
```

**macOS/Linux:**
```json
{
  "mcpServers": {
    "hydrossh": {
      "command": "node",
      "args": ["/path/to/mcpHydroSSH/dist/index.js"]
    }
  }
}
```

> **Note:** The server name `hydrossh` is used to avoid conflicts with other SSH-related MCP servers.

### 4. Usage

In Claude Code, simply say:
- "List available servers"
- "Connect to my-server"
- "Run command: uptime"
- "Show connection status"
- "Disconnect"

## MCP Tools

### SSH Connection Tools

| Tool | Description |
|------|-------------|
| `ssh_list_servers` | List all configured servers |
| `ssh_connect` | Connect to a server |
| `ssh_exec` | Execute a command |
| `ssh_get_status` | Get connection status (or all statuses) |
| `ssh_disconnect` | Disconnect from server |

### Config Management Tools

| Tool | Description |
|------|-------------|
| `ssh_add_server` | Add a new server to config |
| `ssh_remove_server` | Remove a server from config |
| `ssh_update_server` | Update an existing server config |
| `ssh_view_config` | View full configuration (sanitized) |
| `ssh_help` | Show help and usage examples |

## License

MIT
