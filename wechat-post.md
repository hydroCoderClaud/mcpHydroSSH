# 🔥 重磅！Claude Code 也能直接操作远程服务器了！

> **还在为部署代码来回切换窗口？**
> **还在为截图问代码效率低下烦恼？**
> **现在，一个命令搞定！**

---

## 😫 你是不是也经历过这些痛苦？

```
❌ 部署代码：开终端 → SSH 连接 → cd 目录 → git pull → npm install → 重启服务
❌ 查看日志：开新窗口 → 连接服务器 → tail -f 日志
❌ 排查问题：截图 → 发给 Claude → 等回复 → 再截图 → 循环...
```

**太麻烦了！** 现在，这一切都可以**在 Claude Code 对话中一键完成**！

---

## 🎉 mcp-hydrocoder-ssh 来了！

这是一个为 Claude Code 打造的 **SSH MCP 服务器**，让你：

✅ **无需离开对话界面** - 后台长连接，无弹窗干扰
✅ **智能部署自动化** - Claude 根据输出自动判断下一步
✅ **多服务器管理** - 生产/测试环境快速切换
✅ **安全认证** - 支持 SSH agent、密钥文件

---

## 🚀 3 分钟快速上手

### 第一步：安装

```bash
# 全局安装（推荐）
npm install -g mcp-hydrocoder-ssh

# 或者直接用 npx（无需安装）
```

### 第二步：配置 Claude Code

编辑 `~/.claude.json`：

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

### 第三步：重启 Claude Code

搞定！现在你可以这样对话：

---

## 💡 真实使用场景

### 场景 1：一键部署

```
你：部署最新代码到生产服务器

Claude: 好的，我来执行部署流程...
  1. 连接 prod-server ✓
  2. cd /opt/myapp && git pull ✓
  3. npm ci --production ✓
  4. sudo systemctl restart myapp ✓
  5. 检查服务状态 ✓ 运行中！
部署完成！
```

### 场景 2：快速排查

```
你：看看测试服务器的磁盘空间

Claude: [执行 df -h]
测试服务器还有 28G 可用空间（使用率 42%）。
```

### 场景 3：批量操作

```
你：分别重启开发和测试环境的 myapp 服务

Claude: 好的，我先连接 dev-server...
  完成！现在连接 test-server...
  完成！两个环境都已重启。
```

---

## 🛠️ 核心功能一览

| 功能 | 说明 |
|------|------|
| 🔌 后台长连接 | 避免重复认证，秒级响应 |
| ⚡ 命令执行 | 完整输出，智能分析 |
| 🔄 连接池管理 | 同时管理多个服务器 |
| 🔐 安全认证 | SSH agent / 密钥 / 密码 |
| 📋 配置管理 | 添加/删除/更新服务器 |

**10 个 MCP 工具**，覆盖所有 SSH 操作需求！

---

## 📦 技术细节

- **npm**: https://www.npmjs.com/package/mcp-hydrocoder-ssh
- **GitHub**: https://github.com/hydroCoderClaud/mcpHydroSSH
- **版本**: 0.1.1 (最新)
- **大小**: 仅 11.8 kB
- **测试**: 24 个单元测试全部通过 ✅

---

## 🌟 用户评价

> "以前部署要 5 分钟，现在 30 秒搞定！" —— 某全栈开发者
>
> "终于不用在多个窗口间切换了，效率提升不止一倍！" —— 某运维工程师

---

## 📢 立即体验

**下载地址 1：npm 全局安装**
```bash
npm install -g mcp-hydrocoder-ssh
```

**下载地址 2：npx 直接使用**
```bash
# 无需安装，npx 自动下载运行
npx -y mcp-hydrocoder-ssh
```

**下载地址 3：GitHub 源码**
```bash
git clone https://github.com/hydroCoderClaud/mcpHydroSSH.git
cd mcpHydroSSH
npm install && npm run build
```

**npm 页面**：https://www.npmjs.com/package/mcp-hydrocoder-ssh

**GitHub 仓库**：https://github.com/hydroCoderClaud/mcpHydroSSH

---

## 🎁 福利

关注公众号，回复 **"SSH"** 获取：
- 详细配置指南
- 最佳实践文档
- 常见问题解答

---

**👇 点击阅读原文，直达 GitHub 仓库！**

---

*喜欢这篇文章？点赞 👍 在看 ⭐ 分享 💬 三连支持一下！*
