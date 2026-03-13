# Configuration Guide

[README 中文](https://github.com/hydroCoderClaud/mcpHydroSSH/blob/main/README_CN.md) | [README English](https://github.com/hydroCoderClaud/mcpHydroSSH/blob/main/README.md) | [中文](https://github.com/hydroCoderClaud/mcpHydroSSH/blob/main/CONFIG-GUIDE.md) | **English**

## Configuration File Location

The configuration file is located in the user directory:
```
~/.claude/ssh-mcp-config.json
```
**Use case**: Personal frequently-used servers, shared across all projects

---

## Configuration Examples

### Using SSH Agent (Recommended)
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
    }
  ]
}
```

### Using Private Key File
```json
{
  "servers": [
    {
      "id": "my-server",
      "name": "My Server",
      "host": "8.140.225.161",
      "port": 22,
      "username": "root",
      "authMethod": "key",
      "privateKeyPath": "D:\\Data\\aliyun-ecs\\docslim.pem"
    }
  ]
}
```

### Using Password (Not Recommended)
```json
{
  "servers": [
    {
      "id": "test-server",
      "name": "Test Server",
      "host": "test.example.com",
      "port": 22,
      "username": "ubuntu",
      "authMethod": "password",
      "password": "your-password"
    }
  ]
}
```

---

## Complete Configuration

```json
{
  "servers": [
    {
      "id": "prod-server",
      "name": "Production Server",
      "host": "prod.example.com",
      "port": 22,
      "username": "deploy",
      "authMethod": "agent",
      "connectTimeout": 30000
    },
    {
      "id": "test-server",
      "name": "Test Server",
      "host": "test.example.com",
      "port": 2222,
      "username": "ubuntu",
      "authMethod": "key",
      "privateKeyPath": "~/.ssh/id_rsa",
      "connectTimeout": 15000
    }
  ],
  "settings": {
    "defaultConnectTimeout": 30000,
    "defaultKeepaliveInterval": 60000,
    "commandTimeout": 60000,
    "maxConnections": 5,
    "autoReconnect": false,
    "logCommands": true
  }
}
```

---

## Field Descriptions

### Server Configuration
| Field | Required | Description |
|-------|----------|-------------|
| `id` | ✅ | Unique server identifier, used for connect command |
| `name` | ✅ | Server name for easy identification |
| `host` | ✅ | Server address (IP or domain) |
| `port` | ❌ | SSH port, default 22 |
| `username` | ✅ | SSH username |
| `authMethod` | ❌ | Authentication method: `agent` / `key` / `password`, default `agent` |
| `privateKeyPath` | ❌ | Private key path (required when `authMethod=key`) |
| `password` | ❌ | Password (required when `authMethod=password`) |
| `connectTimeout` | ❌ | Connection timeout (milliseconds), default 30000 |

### Global Settings
| Field | Description | Default |
|-------|-------------|---------|
| `defaultConnectTimeout` | Default connection timeout | 30000 |
| `defaultKeepaliveInterval` | Default keepalive interval (milliseconds) | 60000 |
| `commandTimeout` | Command execution timeout | 60000 |
| `maxConnections` | Maximum connections | 5 |
| `autoReconnect` | Auto reconnect | false |
| `logCommands` | Log commands | true |

**Keepalive Configuration:** `defaultKeepaliveInterval` sets the SSH connection keepalive interval to keep persistent connections active and prevent timeout disconnections.

---

## Troubleshooting

### SSH Agent Not Running
```bash
# Windows: Ensure "OpenSSH Authentication Agent" service is running
# Or use key file authentication method
```

### Private Key Permissions
Ensure the private key file is readable only by the current user.

### Configuration File Format Error
Use a JSON validation tool to check syntax.
