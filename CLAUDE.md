# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Build the TypeScript project (output to `dist/`) |
| `npm run dev` | Run in development mode with tsx watch |
| `npm start` | Run the compiled server from `dist/index.js` |

## High-Level Architecture

mcpHydroSSH is an MCP (Model Context Protocol) server that provides SSH capabilities to Claude Code. It allows connecting to remote servers, executing commands, and maintaining persistent SSH connections.

### Core Components

1. **MCP Server Layer** (`src/index.ts`)
   - Exposes 5 MCP tools: `ssh_list_servers`, `ssh_connect`, `ssh_exec`, `ssh_get_status`, `ssh_disconnect`
   - Uses `@modelcontextprotocol/sdk` for stdio transport
   - Entry point: `#! /usr/bin/env node`

2. **SSH Manager** (`src/ssh-manager.ts`)
   - `SSHManager` class manages multiple SSH connections
   - Connection pool: `Map<connectionId, SSHConnection>`
   - Tracks `lastConnectionId` for default connection behavior
   - Handles connection lifecycle, command execution, timeouts

3. **Config Layer** (`src/config.ts`)
   - Loads and validates config from `~/.claude/ssh-mcp-config.json`
   - Uses Zod schema validation
   - Provides server config lookup by ID

4. **Type Definitions** (`src/types.ts`)
   - `ServerConfig`: Server connection details
   - `Config`: Full config with servers and settings
   - `SSHConnection`: Active connection state
   - `ExecResult`: Command execution result
   - `ConnectionStatus`: Status info for MCP responses

### MCP Tools

| Tool | Parameters | Description |
|------|------------|-------------|
| `ssh_list_servers` | None | Returns configured servers (id, name, host, port) |
| `ssh_connect` | `serverId`, `timeout?` | Connects to server, returns `connectionId` |
| `ssh_exec` | `command`, `connectionId?`, `timeout?`, `cwd?` | Executes command, returns stdout/stderr/exitCode |
| `ssh_get_status` | `connectionId?` | Gets connection status (or all connections) |
| `ssh_disconnect` | `connectionId?` | Disconnects from server |

**Note**: `connectionId` is optional for all tools - if not provided, the most recent connection is used.

### SSH Authentication Methods

- `agent`: Uses SSH agent (Windows: `\\.\\pipe\\openssh-ssh-agent`, macOS/Linux: `SSH_AUTH_SOCK`)
- `key`: Reads private key from `privateKeyPath` (supports `~` expansion)
- `password`: Plain password auth (not persisted)

### Configuration File

Location: `~/.claude/ssh-mcp-config.json`

See `example-config.json` in the project root for the schema.

### Project Structure

```
mcpHydroSSH/
├── src/
│   ├── index.ts          # MCP server entry
│   ├── ssh-manager.ts    # SSH connection management
│   ├── config.ts         # Config loading/validation
│   └── types.ts          # TypeScript interfaces
├── dist/                 # Compiled output (gitignored)
├── docs/design.md        # Full design document
├── example-config.json   # Config template
└── package.json
```

### Key Dependencies

- `@modelcontextprotocol/sdk`: MCP server implementation
- `ssh2`: Pure Node.js SSH client library
- `zod`: Schema validation for config
- `uuid`: Generating connection IDs
- `typescript`, `tsx`: TypeScript tooling
