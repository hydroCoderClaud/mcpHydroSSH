# 配置指南

## 快速开始

复制 `example-config.json` 并重命名为 `ssh-mcp-config.json`，然后编辑配置你的服务器。

## 配置文件位置

配置文件可以放在两个位置（优先级从高到低）：

### 1. 项目目录（推荐）
```
C:\workspace\develop\ccExtensions\mcpHydroSSH\ssh-mcp-config.json
```
**适用场景**：项目专用配置，团队成员共享

### 2. 用户目录
```
~/.claude/ssh-mcp-config.json
```
**适用场景**：个人常用服务器，所有项目共享

---

## 配置示例

### 使用 SSH Agent（推荐）
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

### 使用私钥文件
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

### 使用密码（不推荐）
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

## 完整配置

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
      "connectTimeout": 30000,
      "keepaliveInterval": 60000
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
    "commandTimeout": 60000,
    "maxConnections": 5,
    "autoReconnect": false,
    "logCommands": true
  }
}
```

---

## 字段说明

### 服务器配置
| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | ✅ | 服务器唯一标识，用于连接命令 |
| `name` | ✅ | 服务器名称，方便识别 |
| `host` | ✅ | 服务器地址（IP 或域名） |
| `port` | ❌ | SSH 端口，默认 22 |
| `username` | ✅ | SSH 用户名 |
| `authMethod` | ❌ | 认证方式：`agent` / `key` / `password`，默认 `agent` |
| `privateKeyPath` | ❌ | 私钥路径（`authMethod=key` 时需要） |
| `password` | ❌ | 密码（`authMethod=password` 时需要） |
| `connectTimeout` | ❌ | 连接超时（毫秒），默认 30000 |
| `keepaliveInterval` | ❌ | 心跳间隔（毫秒），默认 60000 |

### 全局设置
| 字段 | 说明 | 默认值 |
|------|------|--------|
| `defaultConnectTimeout` | 默认连接超时 | 30000 |
| `commandTimeout` | 命令执行超时 | 60000 |
| `maxConnections` | 最大连接数 | 5 |
| `autoReconnect` | 自动重连 | false |
| `logCommands` | 记录命令日志 | true |

---

## 添加服务器的步骤

1. **复制配置文件**
   ```bash
   # Windows (Git Bash)
   cp example-config.json ssh-mcp-config.json

   # 或在项目目录直接新建 ssh-mcp-config.json
   ```

2. **编辑配置**
   打开 `ssh-mcp-config.json`，在 `servers` 数组中添加你的服务器

3. **保存并重试**
   Claude Code 会自动重新加载配置

---

## 常见问题

### SSH Agent 未运行
```bash
# Windows：确保 "OpenSSH Authentication Agent" 服务正在运行
# 或使用密钥文件认证方式
```

### 私钥权限问题
确保私钥文件只有当前用户可读取。

### 配置文件格式错误
使用 JSON 验证工具检查语法。
