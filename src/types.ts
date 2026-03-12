import type { Client } from 'ssh2';

// 服务器配置
export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'agent' | 'key' | 'password';
  privateKeyPath?: string;
  password?: string;
  connectTimeout?: number;
  keepaliveInterval?: number;
}

// 全局配置
export interface Config {
  servers: ServerConfig[];
  settings: {
    defaultConnectTimeout: number;
    defaultKeepaliveInterval: number;  // 新增：默认心跳间隔
    commandTimeout: number;
    maxConnections: number;
    autoReconnect: boolean;
    logCommands: boolean;
  };
}

// SSH 连接状态
export interface SSHConnection {
  id: string;
  serverId: string;
  client: Client;
  connectedAt: Date;
  lastActivity: Date;
  isBusy: boolean;
  serverConfig?: ServerConfig;  // For auto-reconnect
}

// 命令执行结果
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

// 连接状态信息
export interface ConnectionStatus {
  connectionId: string;
  serverId: string;
  status: 'connected' | 'disconnected';
  connectedAt?: string;
  lastActivity?: string;
  isBusy: boolean;
}

// 服务器列表项（用于返回给 Claude Code）
export interface ServerListItem {
  id: string;
  name: string;
  host: string;
  port: number;
}
