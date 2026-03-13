# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Build the TypeScript project (output to `dist/`) |
| `npm run dev` | Run in development mode with tsx watch |
| `npm start` | Run the compiled server from `dist/index.js` |
| `npm test` | Run tests with Vitest |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## Project Overview

mcpHydroSSH is an MCP (Model Context Protocol) server that provides SSH capabilities to Claude Code. It allows connecting to remote servers, executing commands, and maintaining persistent SSH connections.

**Published**:
- npm: https://www.npmjs.com/package/mcp-hydrocoder-ssh
- GitHub: https://github.com/hydroCoderClaud/mcpHydroSSH

## High-Level Architecture

### Core Components

1. **MCP Server Layer** (`src/index.ts` - 724 lines)
   - Exposes 10 MCP tools
   - Uses `@modelcontextprotocol/sdk` for stdio transport
   - Entry point: `#! /usr/bin/env node`

2. **SSH Manager** (`src/ssh-manager.ts` - 349 lines)
   - `SSHManager` class manages multiple SSH connections
   - Connection pool: `Map<connectionId, SSHConnection>`
   - Tracks `lastConnectionId` for default connection behavior
   - Handles connection lifecycle, command execution, timeouts

3. **Config Layer** (`src/config.ts` - 203 lines)
   - Loads and validates config from `~/.claude/ssh-mcp-config.json`
   - Uses Zod schema validation
   - Provides server config lookup by ID
   - Supports add/remove/update server operations

4. **Type Definitions** (`src/types.ts` - 65 lines)
   - `ServerConfig`: Server connection details
   - `Config`: Full config with servers and settings
   - `SSHConnection`: Active connection state
   - `ExecResult`: Command execution result
   - `ConnectionStatus`: Status info for MCP responses

### MCP Tools (10)

| Tool | Parameters | Description |
|------|------------|-------------|
| `ssh_list_servers` | None | List configured servers |
| `ssh_connect` | `serverId`, `timeout?` | Connect to server |
| `ssh_exec` | `command`, `connectionId?`, `timeout?`, `cwd?` | Execute command |
| `ssh_get_status` | `connectionId?` | Get connection status |
| `ssh_disconnect` | `connectionId?` | Disconnect from server |
| `ssh_view_config` | None | View config (filters sensitive info) |
| `ssh_help` | `topic?` | Show help information |
| `ssh_add_server` | Server config fields | Add server configuration |
| `ssh_remove_server` | `serverId` | Remove server configuration |
| `ssh_update_server` | `serverId` + fields | Update server configuration |

**Note**: `connectionId` is optional for all tools - if not provided, the most recent connection is used.

### SSH Authentication Methods

- `agent`: Uses SSH agent (Windows: `\\.\\pipe\\openssh-ssh-agent`, macOS/Linux: `SSH_AUTH_SOCK`)
- `key`: Reads private key from `privateKeyPath` (supports `~` expansion)
- `password`: Plain password auth (not persisted)

### Configuration File

**Location**: `~/.claude/ssh-mcp-config.json` (user directory only)

See `example-config.json` in the project root for the schema.

**Global Settings**:
- `defaultConnectTimeout`: Connection timeout (ms)
- `defaultKeepaliveInterval`: Heartbeat interval (ms)
- `commandTimeout`: Command execution timeout (ms)
- `maxConnections`: Maximum concurrent connections
- `autoReconnect`: Auto-reconnect on disconnect
- `logCommands`: Log executed commands

### Project Structure

```
mcpHydroSSH/
├── src/
│   ├── index.ts          # MCP server entry (724 lines)
│   ├── ssh-manager.ts    # SSH connection management (349 lines)
│   ├── config.ts         # Config loading/validation (203 lines)
│   ├── types.ts          # TypeScript interfaces (65 lines)
│   └── __tests__/
│       ├── config.test.ts      (252 lines)
│       └── ssh-manager.test.ts (162 lines)
├── dist/                 # Compiled output (gitignored)
├── docs/
│   ├── design.md         # Design document
│   └── CODE_INDEX.md     # Code index
├── README.md             # English README (default)
├── README_CN.md          # Chinese README
├── CONFIG-GUIDE.md       # Chinese configuration guide
├── CONFIG-GUIDE_EN.md    # English configuration guide
├── example-config.json   # Configuration template
└── package.json
```

### Key Dependencies

- `@modelcontextprotocol/sdk`: MCP server implementation
- `ssh2`: Pure Node.js SSH client library (v1.15.0+)
- `zod`: Schema validation for config
- `uuid`: Generating connection IDs
- `typescript`, `tsx`: TypeScript tooling
- `vitest`: Testing framework

## Documentation

| Document | Language | Description |
|----------|----------|-------------|
| `README.md` | English | Main documentation |
| `README_CN.md` | 中文 | Chinese translation |
| `CONFIG-GUIDE.md` | 中文 | Chinese configuration guide |
| `CONFIG-GUIDE_EN.md` | English | English configuration guide |
| `docs/design.md` | 中文 | Design document |
| `docs/CODE_INDEX.md` | 中文 | Code navigation index |

All documentation files have language switch links at the top for easy navigation.

## Security Features

- **Command injection protection**: `shellEscape()` function in ssh-manager.ts
- **Password filtering**: `ssh_view_config` excludes passwords and private key paths
- **Type-safe error handling**: `err: unknown` pattern throughout
- **Connection limits**: Configurable `maxConnections` setting
- **Timeout handling**: Automatic cleanup on connection/command timeout

## Testing

Run tests:
```bash
npm test
```

Test coverage:
- `config.test.ts`: 9 tests for configuration operations
- `ssh-manager.test.ts`: 15 tests for SSH manager functionality
