# 测试指南 - mcpHydroSSH

在集成到 Claude Code 之前，请按以下步骤进行测试。

## 前置条件

1. 项目已构建: `npm run build`
2. Node.js 18+ 已安装

## 测试步骤

### 第一步：基础检查

运行简单测试脚本，验证模块加载和基础功能：

```bash
cd /path/to/mcpHydroSSH
node test/simple-test.js
```

这个测试会：
- 检查 `dist/` 目录下的编译文件
- 检查配置文件是否存在
- 测试导入 `config.js` 和 `ssh-manager.js`
- 测试 `SSHManager` 类的实例化

### 第二步：设置配置文件

如果还没有配置文件：

```bash
# Windows (Git Bash/MSYS)
mkdir -p ~/.claude
cp example-config.json ~/.claude/ssh-mcp-config.json

# 然后编辑 ~/.claude/ssh-mcp-config.json，添加你的服务器
```

配置示例：
```json
{
  "servers": [
    {
      "id": "my-server",
      "name": "My Test Server",
      "host": "your-server.com",
      "port": 22,
      "username": "your-username",
      "authMethod": "agent"
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

### 第三步：验证服务器可以启动

直接运行服务器，确认它能加载配置并等待输入：

```bash
node dist/index.js
```

预期输出：
```
mcpHydroSSH MCP Server running on stdio
```

按 `Ctrl+C` 退出。

### 第四步：MCP 协议交互测试

使用交互式 MCP 测试器：

```bash
node test/mcp-tester.js
```

测试流程示例：

```
1. 按 '1' 发送 initialize 请求
2. 按 '2' 获取工具列表 (tools/list)
3. 按 '3' 调用 ssh_list_servers
4. 按 '4' 调用 ssh_connect，输入你的 serverId
5. 按 '5' 调用 ssh_exec，输入命令如 'whoami' 或 'ls -la'
6. 按 '6' 查看连接状态
7. 按 '7' 断开连接
8. 按 'q' 退出
```

### 第五步：集成到 Claude Code

在 Claude Code 设置中添加：

**Windows:**
```json
{
  "mcpServers": {
    "ssh": {
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
    "ssh": {
      "command": "node",
      "args": ["/path/to/mcpHydroSSH/dist/index.js"]
    }
  }
}
```

重启 Claude Code 后即可使用 SSH 工具。

## 故障排查

### 问题：配置文件未找到
```
Error: Config file not found at ...
```
**解决**: 复制 `example-config.json` 到 `~/.claude/ssh-mcp-config.json`

### 问题：TypeScript 编译错误
**解决**: 运行 `npm run build` 重新编译

### 问题：SSH 连接失败
- 确认 SSH agent 正在运行 (Windows: 检查 OpenSSH Authentication Agent 服务)
- 尝试手动 SSH 连接: `ssh username@host`
- 检查防火墙设置
