# mcp-hydrocoder-ssh

为 Claude Code 提供 SSH 远程连接能力的 MCP 服务器。连接远程服务器、执行命令、自动化部署，无需离开对话界面。

[![npm version](https://img.shields.io/npm/v/mcp-hydrocoder-ssh.svg)](https://www.npmjs.com/package/mcp-hydrocoder-ssh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 第一部分：功能介绍

### 这是什么？

`mcp-hydrocoder-ssh` 是一个 MCP (Model Context Protocol) 服务器，让 Claude Code 能够：
- 🔌 直接连接远程 SSH 服务器（后台长连接）
- ⚡ 执行命令并获取完整输出
- 🔄 保持连接状态，支持多步连续操作
- 🚀 运行部署脚本（git pull、npm install、systemctl restart 等）

### 主要好处

| 好处 | 说明 |
|------|------|
| **无需切换窗口** | 在 Claude Code 对话中完成所有远程操作 |
| **智能部署** | Claude 可根据命令输出自动判断下一步操作 |
| **多服务器管理** | 同时管理多个服务器配置，快速切换 |
| **安全认证** | 支持 SSH agent、密钥文件，密码不持久化 |
| **连接池管理** | 保持长连接，避免重复认证和连接开销 |

### 可用工具

**SSH 连接工具 (5 个)：**
- `ssh_list_servers` - 列出所有配置的服务器
- `ssh_connect` - 连接到指定服务器
- `ssh_exec` - 执行命令（支持指定工作目录）
- `ssh_get_status` - 获取连接状态
- `ssh_disconnect` - 断开连接

**配置管理工具 (5 个)：**
- `ssh_add_server` - 添加新服务器配置
- `ssh_remove_server` - 删除服务器配置
- `ssh_update_server` - 更新服务器配置
- `ssh_view_config` - 查看配置（过滤敏感信息）
- `ssh_help` - 显示帮助信息

---

## 第二部分：快速安装（推荐）

### 步骤 1：选择安装方式

**方式 A：全局安装（推荐）**

```bash
npm install -g mcp-hydrocoder-ssh
```

**方式 B：使用 npx（无需安装）**

```bash
# 无需执行任何命令，直接在配置中使用 npx
```

---

### 步骤 2：配置 Claude Code

编辑用户目录的 `~/.claude.json` 文件：

**Windows 路径：** `C:\Users\<你的用户名>\.claude.json`
**macOS/Linux 路径：** `~/.claude.json`

**方式 A（全局安装）的配置：**
```json
{
  "mcpServers": {
    "hydrossh": {
      "command": "mcp-hydrocoder-ssh"
    }
  }
}
```

**方式 B（npx）的配置：**
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

> **注意：**
> - `hydrossh` 是服务器名称标识，可以改为任意你喜欢的名字。
> - `-y` 标志让 npx 自动确认安装，避免交互提示卡住。

### 步骤 3：重启 Claude Code

关闭并重新打开 Claude Code，配置将自动加载。

### 步骤 4：验证安装

在 Claude Code 中输入：
```
列出可用的 SSH 服务器
```

如果看到服务器列表（空列表表示尚未配置），说明安装成功。

---

## 第三部分：源码使用（开发方式）

### 1. 下载源码

```bash
git clone https://github.com/hydroCoderClaud/mcpHydroSSH.git
cd mcpHydroSSH
```

### 2. 安装依赖

```bash
npm install
```

### 3. 编译构建

```bash
npm run build
```

编译输出到 `dist/` 目录，主要文件：
- `dist/index.js` - MCP 服务器入口
- `dist/ssh-manager.js` - SSH 连接管理
- `dist/config.js` - 配置管理

### 4. 配置 Claude Code

编辑用户目录的 `~/.claude.json` 文件：

**Windows 路径：**
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

**macOS/Linux 路径：**
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

> **注意：** 将路径替换为你实际的源码目录绝对路径。

### 5. 重启 Claude Code

关闭并重新打开 Claude Code，配置将自动加载。

### 6. 开发模式（可选）

如需热重载开发：
```bash
npm run dev
```

此时 Claude Code 配置改为：
```json
{
  "mcpServers": {
    "hydrossh": {
      "command": "npx",
      "args": ["tsx", "C:\\workspace\\develop\\ccExtensions\\mcpHydroSSH\\src\\index.ts"]
    }
  }
}
```

---

## 附录 A：配置 SSH 服务器

首次运行时，服务器会自动创建配置文件 `~/.hydrossh/config.json`。

### 配置示例

```json
{
  "servers": [
    {
      "id": "prod-server",
      "name": "生产服务器",
      "host": "example.com",
      "port": 22,
      "username": "deploy",
      "authMethod": "agent"
    },
    {
      "id": "test-server",
      "name": "测试服务器",
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

### 认证方式

| 方式 | 配置 | 说明 |
|------|------|------|
| **SSH Agent** | `"authMethod": "agent"` | 推荐，使用系统 SSH agent |
| **密钥文件** | `"authMethod": "key", "privateKeyPath": "~/.ssh/id_rsa"` | 直接读取密钥文件 |
| **密码** | `"authMethod": "password", "password": "xxx"` | 不推荐，密码会明文存储 |

详见 [CONFIG-GUIDE.md](CONFIG-GUIDE.md)

---

## 附录 B：使用示例

### 基本用法

```
用户：列出可用的服务器
Claude: 发现 2 个配置的服务器：prod-server、test-server

用户：连接到 prod-server
Claude: [调用 ssh_connect] 连接成功！connectionId: xxx

用户：执行命令：uptime
Claude: [调用 ssh_exec] 返回：up 30 days, 2 users, load average: 0.1, 0.2, 0.5

用户：断开连接
Claude: [调用 ssh_disconnect] 已断开
```

### 自动化部署

```
用户：部署最新代码到生产服务器
Claude: 好的，我来执行部署流程...
1. 连接 prod-server
2. cd /opt/myapp && git pull
3. npm ci --production
4. sudo systemctl restart myapp
5. 检查服务状态
6. 断开连接
部署完成！
```

---

## 附录 C：安全说明

- 🔒 **密码不持久化** - 密码仅在内存中使用，不会保存
- 🔒 **推荐 SSH Agent** - 优先使用 `authMethod: "agent"`
- 🔒 **配置文件权限** - 确保 `~/.hydrossh/config.json` 权限设置为仅自己可读
- 🔒 **配置查看过滤** - `ssh_view_config` 工具会自动过滤密码和密钥路径

---

## 附录 D：故障排查

| 问题 | 解决方案 |
|------|---------|
| SSH Agent 未运行 | Windows: 启动 "OpenSSH Authentication Agent" 服务 |
| 连接超时 | 检查服务器地址、端口、网络连通性 |
| 命令未找到 | 确认 npm 全局安装成功，或检查 PATH 环境变量 |
| 配置未加载 | 检查 `~/.claude.json` 格式是否正确 |

---

## 附录 E：命令参考

### 开发命令

```bash
npm run build        # 编译构建
npm run dev          # 开发模式（热重载）
npm test             # 运行测试
npm run lint         # 代码检查
npm run format       # 代码格式化
```

### MCP 工具参数

| 工具 | 参数 | 说明 |
|------|------|------|
| `ssh_connect` | `serverId`, `timeout?` | 连接服务器 |
| `ssh_exec` | `command`, `connectionId?`, `timeout?`, `cwd?` | 执行命令 |
| `ssh_get_status` | `connectionId?` | 获取状态（不传返回全部） |

---

## License

MIT
