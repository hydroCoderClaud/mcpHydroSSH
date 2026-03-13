# mcpHydroSSH - SSH MCP Server Design Document

**Date:** 2026-03-13
**Author:** Claude Code
**Status:** Production Ready (v0.1.0)
**Version:** 0.1.0

---

## 1. 项目目标

解决 Claude Code 无法直接操作远程服务器的痛点。通过 MCP (Model Context Protocol) 提供 SSH 连接能力，让 Claude Code 能够：

- 直接连接远程服务器（后台长连接，无弹窗）
- 执行命令、获取完整输出
- 保持连接状态，支持多步连续操作
- Claude Code 可根据输出自动决定下一步操作
- 运行部署脚本（git pull、升级等）

### 核心交互模式

```
┌─────────────┐         ┌─────────────────────────────┐         ┌───────────────┐
│   用户      │         │        Claude Code           │         │  mcpHydroSSH  │
│  "部署一下" │────────►│ - 分析意图 -> 调用工具      │────────►│ - 后台 SSH    │
│             │         │ - 获取输出 -> 决策下一步    │◄────────│   长连接      │
│             │◄────────│ - 继续执行或返回结果        │         │ - 执行命令    │
└─────────────┘         └─────────────────────────────┘         └───────────────┘
```

---

## 2. 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Code                               │
│  LLM -> 分析意图 -> 调用 MCP 工具 -> 分析输出 -> 决策           │
└────────────────────────────┬────────────────────────────────────┘
                             │ MCP
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     mcpHydroSSH (MCP Server)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  MCP Tools (10 个)                                          │  │
│  │  ssh_list_servers, ssh_connect, ssh_exec, ssh_disconnect  │  │
│  │  ssh_get_status, ssh_view_config, ssh_help                │  │
│  │  ssh_add_server, ssh_remove_server, ssh_update_server     │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SSH Manager - 连接池管理                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SSH2 Client (ssh2 npm)                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ SSH
                             ▼
                  ┌─────────────────┐
                  │  Remote Server  │
                  └─────────────────┘
```

### 核心组件
1. **MCP 工具层**: 10 个工具，使用 `@modelcontextprotocol/sdk`
2. **SSH Manager**: 连接池管理、命令执行
3. **SSH 客户端**: `ssh2` 库
4. **配置层**: 仅支持用户目录 `~/.claude/ssh-mcp-config.json`

---

## 3. 核心功能

### 3.1 配置文件

**位置**: `~/.claude/ssh-mcp-config.json`（仅支持用户目录）

```json
{
  "servers": [
    {
      "id": "prod-server",
      "name": "Production Server",
      "host": "example.com",
      "port": 22,
      "username": "deploy",
      "authMethod": "agent",
      "connectTimeout": 30000
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

### 3.2 MCP 工具列表

| 工具 | 参数 | 功能 |
|------|------|------|
| `ssh_list_servers` | 无 | 列出服务器 |
| `ssh_connect` | `serverId`, `timeout?` | 连接服务器 |
| `ssh_exec` | `command`, `connectionId?`, `timeout?`, `cwd?` | 执行命令 |
| `ssh_get_status` | `connectionId?` | 获取状态 |
| `ssh_disconnect` | `connectionId?` | 断开连接 |
| `ssh_view_config` | 无 | 查看配置（过滤敏感信息） |
| `ssh_help` | `topic?` | 显示帮助 |
| `ssh_add_server` | 服务器配置字段 | 添加配置 |
| `ssh_remove_server` | `serverId` | 删除配置 |
| `ssh_update_server` | `serverId` + 更新字段 | 更新配置 |

**注意**: `connectionId` 可选，不传时使用最近连接

---

## 4. 技术实现

### 4.1 技术栈
- **运行时**: Node.js 18+
- **语言**: TypeScript 5.0+
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **SSH 库**: `ssh2` v1.15.0+
- **其他**: `zod` (验证), `uuid` (ID 生成)

### 4.2 目录结构

```
mcpHydroSSH/
├── src/
│   ├── index.ts           # MCP 服务器入口 (724 行)
│   ├── ssh-manager.ts     # SSH 管理 (349 行)
│   ├── config.ts          # 配置管理 (203 行)
│   ├── types.ts           # 类型定义 (65 行)
│   └── __tests__/
│       ├── config.test.ts      (252 行)
│       └── ssh-manager.test.ts (162 行)
├── docs/
│   ├── design.md          # 设计文档
│   └── CODE_INDEX.md      # 代码索引
├── README.md, README_CN.md
├── CONFIG-GUIDE.md, CONFIG-GUIDE_EN.md
├── example-config.json
├── package.json
└── tsconfig.json
```

---

## 5. 错误处理 & 安全

### 5.1 错误处理

| 错误 | 处理方式 | 返回 |
|------|---------|------|
| 连接超时 | 30 秒超时，清理资源 | `{ error: "Connection timeout" }` |
| 认证失败 | 断开连接 | `{ error: "Authentication failed" }` |
| 命令超时 | 默认 60 秒 | `{ error: "Command timeout" }` |

### 5.2 安全特性

- ✅ **不保存密码** - 密码仅在内存中
- ✅ **优先 SSH agent** - 推荐 `authMethod: "agent"`
- ✅ **命令注入防护** - `shellEscape()` 函数
- ✅ **配置过滤** - `ssh_view_config` 过滤密码和密钥路径
- ✅ **类型安全错误处理** - `err: unknown` 处理

---

## 6. Claude Code 集成

### 6.1 配置方式

**全局安装:**
```json
{
  "mcpServers": {
    "hydrossh": {
      "command": "mcp-hydrocoder-ssh"
    }
  }
}
```

**npx 方式:**
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

**源码开发:**
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

---

## 7. 发布状态

### 已完成
- [x] 核心功能（10 个 MCP 工具）
- [x] 配置管理（仅用户目录）
- [x] 连接池管理
- [x] 单元测试
- [x] npm 发布 (v0.1.0)
- [x] GitHub 仓库
- [x] hydroSkills MCP 注册
- [x] 中英文文档

### 后续规划
- [ ] SFTP 文件传输
- [ ] 交互式 shell
- [ ] 实时日志跟踪
- [ ] 预设部署流程

---

## 8. 相关链接

- **GitHub**: https://github.com/hydroCoderClaud/mcpHydroSSH
- **npm**: https://www.npmjs.com/package/mcp-hydrocoder-ssh
- **文档**: README.md (English), README_CN.md (中文)
- **配置指南**: CONFIG-GUIDE.md (中文), CONFIG-GUIDE_EN.md (English)
