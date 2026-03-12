# 代码索引 - mcpHydroSSH

本文档提供代码库的快速导航和索引。

## 目录结构

```
mcpHydroSSH/
├── src/
│   ├── index.ts              # MCP 服务器入口 (725 行)
│   ├── ssh-manager.ts        # SSH 连接管理 (350 行)
│   ├── config.ts             # 配置管理 (204 行)
│   ├── types.ts              # TypeScript 类型定义 (66 行)
│   └── __tests__/
│       ├── config.test.ts    # 配置测试 (252 行)
│       └── ssh-manager.test.ts # SSH 管理器测试 (162 行)
├── docs/
│   ├── design.md             # 设计文档
│   └── CODE_INDEX.md         # 本文档
├── .gitignore
├── README.md
├── example-config.json
├── package.json
├── tsconfig.json
├── vitest.config.json
├── .eslintrc.json
└── .prettierrc
```

---

## 核心模块索引

### 1. src/index.ts - MCP 服务器入口

**行数**: 725 行
**职责**: MCP 服务器主入口，注册所有工具处理器

#### 主要功能

| 行号范围 | 功能 | 描述 |
|---------|------|------|
| 1-38 | 初始化 | 导入依赖、初始化服务器、加载配置、创建 SSHManager |
| 39-251 | ListTools | 注册 10 个 MCP 工具 |
| 253-541 | CallTool | 工具调用处理器 |
| 543-558 | 清理处理器 | SIGINT/SIGTERM 信号处理 |
| 560-719 | Help 内容 | getHelpContent() 函数 |
| 721-724 | 入口 | main() 函数调用 |

#### 工具列表

| 工具名 | 行号 | 描述 |
|--------|------|------|
| `ssh_list_servers` | 45-52, 258-273 | 列出配置的服务器 |
| `ssh_view_config` | 54-61, 275-297 | 查看配置（过滤敏感信息） |
| `ssh_connect` | 63-79, 312-347 | 连接服务器 |
| `ssh_exec` | 81-105, 349-375 | 执行命令 |
| `ssh_get_status` | 107-119, 377-400 | 获取状态 |
| `ssh_disconnect` | 121-133, 402-425 | 断开连接 |
| `ssh_help` | 135-148, 299-310 | 显示帮助 |
| `ssh_add_server` | 150-191, 427-461 | 添加服务器配置 |
| `ssh_remove_server` | 193-205, 463-494 | 删除服务器配置 |
| `ssh_update_server` | 207-248, 496-533 | 更新服务器配置 |

#### 关键代码片段

**安全过滤** (276-286):
```typescript
// Filter out sensitive information (passwords and private key paths)
const sanitizedConfig = {
  servers: config.servers.map(s => ({
    id: s.id,
    name: s.name,
    host: s.host,
    port: s.port,
    username: s.username,
    authMethod: s.authMethod,
    // Exclude: password, privateKeyPath for security
  })),
```

**类型安全错误处理** (336-345):
```typescript
catch (err: unknown) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2),
      },
    ],
    isError: true,
  };
}
```

---

### 2. src/ssh-manager.ts - SSH 连接管理器

**行数**: 350 行
**职责**: 管理 SSH 连接池、执行命令、状态跟踪

#### 类结构

```typescript
export class SSHManager {
  // 属性
  - connections: Map<string, SSHConnection>
  - lastConnectionId: string | null
  - commandTimeout: number
  - keepaliveInterval: number
  - maxConnections: number
  - autoReconnect: boolean
  - logCommands: boolean

  // 公共方法
  + connect(serverConfig): Promise<string>
  + exec(command, connectionId?, options?): Promise<ExecResult>
  + disconnect(connectionId?): void
  + getStatus(connectionId?): ConnectionStatus | null
  + getAllStatuses(): ConnectionStatus[]
  + disconnectByServerId(serverId): void
  + cleanup(): void

  // 私有方法
  - getConnection(connectionId?, throwIfMissing): SSHConnection | null
  - getAgentPath(): string | undefined
}
```

#### 方法索引

| 方法 | 行号 | 描述 | 关键点 |
|------|------|------|--------|
| `constructor` | 34-46 | 初始化配置 | 设置超时、连接数限制 |
| `connect` | 54-139 | 建立 SSH 连接 | 超时处理、连接池管理 |
| `exec` | 151-225 | 执行命令 | shell 转义、超时、日志 |
| `disconnect` | 231-242 | 断开连接 | 清理连接池 |
| `getStatus` | 249-261 | 获取单个状态 | 返回 ConnectionStatus |
| `getAllStatuses` | 267-276 | 获取所有状态 | 遍历连接池 |
| `disconnectByServerId` | 283-293 | 按服务器 ID 断开 | 用于配置删除 |
| `cleanup` | 299-305 | 清理所有连接 | 进程退出时调用 |
| `getConnection` | 316-337 | 获取连接（内部） | 支持默认连接 |
| `getAgentPath` | 343-348 | 获取 SSH agent 路径 | 平台兼容 |

#### 关键功能

**命令注入防护** (20-23, 174-177):
```typescript
function shellEscape(value: string): string {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

// 在 exec 中使用
const fullCommand = options?.cwd
  ? `cd ${shellEscape(options.cwd)} && ${command}`
  : command;
```

**连接超时处理** (67-72):
```typescript
const timeout = setTimeout(() => {
  if (!isResolved) {
    client.end();  // 清理资源
    reject(new Error('Connection timeout'));
  }
}, timeoutMs);
```

**自动重连准备** (84):
```typescript
serverConfig: { ...serverConfig },  // Store for auto-reconnect
```

---

### 3. src/config.ts - 配置管理

**行数**: 204 行
**职责**: 加载、验证、保存配置文件

#### 函数索引

| 函数 | 行号 | 描述 | 抛出错误 |
|------|------|------|---------|
| `initializeConfig` | 51-79 | 初始化配置文件 | 示例配置不存在 |
| `loadConfig` | 86-110 | 加载并验证配置 | 文件不存在、JSON 无效 |
| `getServerConfig` | 118-120 | 获取服务器配置 | - |
| `getConfigSettings` | 127-129 | 获取设置 | - |
| `saveConfig` | 135-146 | 保存配置 | 写入失败 |
| `addServer` | 153-163 | 添加服务器 | ID 重复 |
| `removeServer` | 170-180 | 删除服务器 | ID 不存在 |
| `updateServer` | 188-203 | 更新服务器 | ID 不存在、验证失败 |

#### Zod Schema

**ServerConfigSchema** (9-20):
```typescript
const ServerConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1),
  authMethod: z.enum(['agent', 'key', 'password']).default('agent'),
  privateKeyPath: z.string().optional(),
  password: z.string().optional(),
  connectTimeout: z.number().int().min(1000).optional(),
  keepaliveInterval: z.number().int().min(1000).optional(),
});
```

**JSON 错误处理** (97-106):
```typescript
const raw = fs.readFileSync(configPath, 'utf-8');
let parsed: any;
try {
  parsed = JSON.parse(raw);
} catch (err) {
  throw new Error(
    `Invalid JSON in config file: ${configPath}\n` +
    `Details: ${err instanceof Error ? err.message : String(err)}`
  );
}
```

---

### 4. src/types.ts - TypeScript 类型定义

**行数**: 66 行
**职责**: 定义所有 TypeScript 接口

#### 接口列表

| 接口 | 行号 | 用途 |
|------|------|------|
| `ServerConfig` | 4-15 | 服务器配置 |
| `Config` | 18-28 | 全局配置 |
| `SSHConnection` | 31-39 | SSH 连接状态 |
| `ExecResult` | 42-47 | 命令执行结果 |
| `ConnectionStatus` | 50-57 | 连接状态信息 |
| `ServerListItem` | 60-65 | 服务器列表项 |

#### 关键类型

**SSHConnection** - 包含 auto-reconnect 支持:
```typescript
export interface SSHConnection {
  id: string;
  serverId: string;
  client: Client;
  connectedAt: Date;
  lastActivity: Date;
  isBusy: boolean;
  serverConfig?: ServerConfig;  // For auto-reconnect
}
```

---

## 测试文件索引

### src/__tests__/config.test.ts

**行数**: 252 行
**测试框架**: Vitest
**测试数量**: 9 个测试

#### 测试覆盖

| 测试组 | 测试用例 | 行号 |
|--------|---------|------|
| `loadConfig` | 应加载有效配置 | 31-55 |
| | 应使用可选字段的默认值 | 57-72 |
| `saveConfig` | 应保存配置到文件 | 75-92 |
| `addServer` | 应添加新服务器 | 96-123 |
| | 应在重复 ID 时抛出 | 125-155 |
| `removeServer` | 应删除服务器 | 159-184 |
| | 应在不存在时抛出 | 186-201 |
| `updateServer` | 应更新服务器 | 205-233 |
| | 应在不存在时抛出 | 235-250 |

---

### src/__tests__/ssh-manager.test.ts

**行数**: 162 行
**测试框架**: Vitest
**测试数量**: 15 个测试

#### 测试覆盖

| 测试组 | 测试用例 | 行号 |
|--------|---------|------|
| `constructor` | 默认选项 | 23-29 |
| | 自定义 maxConnections | 31-38 |
| `connect` | 连接超时 | 42-54 |
| | 无效主机 | 56-68 |
| `maxConnections` | 强制执行连接限制 | 72-101 |
| `exec` | 无连接时抛出 | 105-107 |
| | 处理 cwd 选项 | 109-114 |
| `getStatus` | 返回不存在的连接 | 118-121 |
| | 无 connectionId 时返回 null | 123-126 |
| | 返回所有状态 | 128-132 |
| `disconnect` | 断开不存在的连接 | 136-138 |
| | 无 connectionId 时正常 | 140-142 |
| `disconnectByServerId` | 不存在的 serverId | 146-148 |
| `cleanup` | 无错误清理 | 152-154 |
| | 清空所有连接 | 156-160 |

---

## 配置文件

### .eslintrc.json

**行数**: 34 行

关键规则:
- `@typescript-eslint/no-floating-promises`: error
- `@typescript-eslint/no-misused-promises`: error
- `@typescript-eslint/consistent-type-imports`: error
- `@typescript-eslint/no-explicit-any`: warn (MCP SDK 需要)

### .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### vitest.config.json

```json
{
  "test": {
    "globals": true,
    "environment": "node",
    "include": ["src/**/*.test.ts"],
    "pool": "threads"
  }
}
```

---

## 依赖关系图

```
┌─────────────────┐
│   index.ts      │
│  (MCP Server)   │
└────────┬────────┘
         │ 导入
         ▼
┌─────────────────┐     ┌─────────────────┐
│  ssh-manager.ts │◄────│   config.ts     │
│ (SSH 管理)       │     │ (配置管理)       │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │ 使用                  │ 使用
         ▼                       ▼
┌────────────────────────────────────────┐
│              types.ts                   │
│         (TypeScript 类型)               │
└────────────────────────────────────────┘

外部依赖:
- ssh2 (SSH 客户端)
- @modelcontextprotocol/sdk (MCP 协议)
- zod (配置验证)
- uuid (ID 生成)
```

---

## 安全特性索引

| 特性 | 位置 | 描述 |
|------|------|------|
| 命令注入防护 | ssh-manager.ts:20-23 | shellEscape 函数 |
| 密码过滤 | index.ts:276-286 | ssh_view_config 过滤 |
| 类型安全错误 | index.ts:336-345 | err: unknown 处理 |
| 超时清理 | ssh-manager.ts:67-72 | client.end() 调用 |
| 连接数限制 | ssh-manager.ts:56-58 | maxConnections 检查 |

---

## JSDoc 注释

所有公共方法都有完整的 JSDoc 注释:

**ssh-manager.ts**:
- `@param` - 参数说明
- `@returns` - 返回值说明
- `@throws` - 抛出错误说明

**config.ts**:
- 所有导出函数都有完整文档
- 包含使用示例

---

## 快速查找

### 按功能查找

| 功能 | 文件 | 行号 |
|------|------|------|
| SSH 连接 | ssh-manager.ts | 54-139 |
| 命令执行 | ssh-manager.ts | 151-225 |
| 配置加载 | config.ts | 86-110 |
| 配置验证 | config.ts | 9-32 |
| 工具注册 | index.ts | 41-251 |
| 工具调用 | index.ts | 253-541 |
| 帮助信息 | index.ts | 562-719 |

### 按错误类型查找

| 错误 | 文件 | 行号 |
|------|------|------|
| 连接超时 | ssh-manager.ts | 70 |
| 命令超时 | ssh-manager.ts | 182 |
| 配置不存在 | config.ts | 90-94 |
| JSON 无效 | config.ts | 102-105 |
| ID 重复 | config.ts | 157-158 |
| ID 不存在 | config.ts | 174-175 |

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 0.1.0 | 2026-03-12 | 初始版本，MVP 功能完整 |
