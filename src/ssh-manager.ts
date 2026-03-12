import { Client } from 'ssh2';
import type { ConnectConfig } from 'ssh2';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import type { ServerConfig, SSHConnection, ExecResult, ConnectionStatus } from './types.js';

function expandUser(filePath: string): string {
  if (filePath.startsWith('~')) {
    return path.join(homedir(), filePath.slice(1));
  }
  return filePath;
}

/**
 * Escape a shell command argument to prevent injection attacks.
 * Wraps the value in single quotes and escapes any single quotes within.
 */
function shellEscape(value: string): string {
  // Use single quotes and escape any single quotes inside
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

export class SSHManager {
  private connections: Map<string, SSHConnection> = new Map();
  private lastConnectionId: string | null = null;
  private readonly commandTimeout: number;
  private readonly keepaliveInterval: number;
  private readonly maxConnections: number;
  private readonly autoReconnect: boolean;
  private readonly logCommands: boolean;

  constructor(options: {
    commandTimeout: number;
    keepaliveInterval: number;
    maxConnections?: number;
    autoReconnect?: boolean;
    logCommands?: boolean;
  }) {
    this.commandTimeout = options.commandTimeout;
    this.keepaliveInterval = options.keepaliveInterval;
    this.maxConnections = options.maxConnections || 5;
    this.autoReconnect = options.autoReconnect || false;
    this.logCommands = options.logCommands || true;
  }

  /**
   * Connect to an SSH server.
   * @param serverConfig - The server configuration containing connection details
   * @returns A promise that resolves to the connection ID
   * @throws Error if max connections limit is reached or connection fails
   */
  async connect(serverConfig: ServerConfig): Promise<string> {
    // Check max connections limit
    if (this.connections.size >= this.maxConnections) {
      throw new Error(`Max connections limit reached (${this.maxConnections})`);
    }

    const connectionId = uuidv4();
    const client = new Client();

    return new Promise((resolve, reject) => {
      const timeoutMs = serverConfig.connectTimeout || 30000;
      let isResolved = false;

      const timeout = setTimeout(() => {
        if (!isResolved) {
          client.end();  // Clean up resources on timeout
          reject(new Error('Connection timeout'));
        }
      }, timeoutMs);

      client.on('ready', () => {
        clearTimeout(timeout);
        isResolved = true;
        const connection: SSHConnection = {
          id: connectionId,
          serverId: serverConfig.id,
          client,
          connectedAt: new Date(),
          lastActivity: new Date(),
          isBusy: false,
          serverConfig: { ...serverConfig },  // Store for auto-reconnect
        };
        this.connections.set(connectionId, connection);
        this.lastConnectionId = connectionId;
        resolve(connectionId);
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        if (!isResolved) {
          reject(err);
        }
      });

      // Handle connection end/close
      const handleConnectionClose = () => {
        if (this.logCommands) {
          console.error(`[SSH] Connection ${connectionId} closed`);
        }
        this.connections.delete(connectionId);
        if (this.lastConnectionId === connectionId) {
          const remaining = Array.from(this.connections.keys());
          this.lastConnectionId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        }
      };

      client.on('end', handleConnectionClose);
      client.on('close', handleConnectionClose);

      // Build connect options
      const connectOptions: ConnectConfig = {
        host: serverConfig.host,
        port: serverConfig.port,
        username: serverConfig.username,
      };

      // Auth method
      if (serverConfig.authMethod === 'agent') {
        connectOptions.agent = this.getAgentPath();
        connectOptions.agentForward = true;
      } else if (serverConfig.authMethod === 'key' && serverConfig.privateKeyPath) {
        const keyPath = expandUser(serverConfig.privateKeyPath);
        connectOptions.privateKey = fs.readFileSync(keyPath);
      } else if (serverConfig.authMethod === 'password' && serverConfig.password) {
        connectOptions.password = serverConfig.password;
      }

      if (serverConfig.keepaliveInterval !== undefined) {
        connectOptions.keepaliveInterval = serverConfig.keepaliveInterval;
      } else if (this.keepaliveInterval > 0) {
        connectOptions.keepaliveInterval = this.keepaliveInterval;
      }

      client.connect(connectOptions);
    });
  }

  /**
   * Execute a command on the connected SSH server.
   * @param command - The command to execute
   * @param connectionId - Optional connection ID (uses most recent if not provided)
   * @param options - Optional execution options
   * @param options.timeout - Command timeout in milliseconds
   * @param options.cwd - Working directory for command execution
   * @returns A promise that resolves to the execution result (stdout, stderr, exitCode, duration)
   * @throws Error if no connection is available or connection is busy
   */
  async exec(
    command: string,
    connectionId?: string,
    options?: { timeout?: number; cwd?: string }
  ): Promise<ExecResult> {
    const conn = this.getConnection(connectionId);
    if (!conn) {
      throw new Error('No connection available');
    }
    if (conn.isBusy) {
      throw new Error('Connection is busy');
    }

    conn.isBusy = true;
    conn.lastActivity = new Date();
    const startTime = Date.now();

    // Log command execution if enabled
    if (this.logCommands) {
      console.error(`[SSH] Executing: ${command}${options?.cwd ? ` (cwd: ${options.cwd})` : ''}`);
    }

    try {
      // Use shell escape to prevent command injection
      const fullCommand = options?.cwd
        ? `cd ${shellEscape(options.cwd)} && ${command}`
        : command;

      return await new Promise((resolve, reject) => {
        const timeoutMs = options?.timeout || this.commandTimeout;
        const timeout = setTimeout(() => {
          reject(new Error('Command timeout'));
        }, timeoutMs);

        conn.client.exec(fullCommand, (err, stream) => {
          if (err) {
            clearTimeout(timeout);
            reject(err);
            return;
          }

          let stdout = '';
          let stderr = '';
          let exitCode = 0;

          stream.on('data', (data: Buffer) => {
            stdout += data.toString();
          });

          stream.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });

          stream.on('close', (code: number | null) => {
            clearTimeout(timeout);
            exitCode = code ?? 0;
            resolve({
              stdout,
              stderr,
              exitCode,
              duration: Date.now() - startTime,
            });
          });
        });
      });
    } finally {
      conn.isBusy = false;
      conn.lastActivity = new Date();

      // Log completion if enabled
      if (this.logCommands) {
        console.error(`[SSH] Command completed in ${Date.now() - startTime}ms`);
      }
    }
  }

  /**
   * Disconnect from an SSH server.
   * @param connectionId - Optional connection ID (disconnects most recent if not provided)
   */
  disconnect(connectionId?: string): void {
    const conn = this.getConnection(connectionId, false);
    if (!conn) {return;}

    conn.client.end();
    this.connections.delete(conn.id);

    if (this.lastConnectionId === conn.id) {
      const remaining = Array.from(this.connections.keys());
      this.lastConnectionId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
    }
  }

  /**
   * Get the status of a specific connection.
   * @param connectionId - Optional connection ID (returns null if not provided and no connections)
   * @returns Connection status or null if not found
   */
  getStatus(connectionId?: string): ConnectionStatus | null {
    const conn = this.getConnection(connectionId, false);
    if (!conn) {return null;}

    return {
      connectionId: conn.id,
      serverId: conn.serverId,
      status: 'connected',
      connectedAt: conn.connectedAt.toISOString(),
      lastActivity: conn.lastActivity.toISOString(),
      isBusy: conn.isBusy,
    };
  }

  /**
   * Get the status of all active connections.
   * @returns Array of connection statuses
   */
  getAllStatuses(): ConnectionStatus[] {
    return Array.from(this.connections.values()).map(conn => ({
      connectionId: conn.id,
      serverId: conn.serverId,
      status: 'connected',
      connectedAt: conn.connectedAt.toISOString(),
      lastActivity: conn.lastActivity.toISOString(),
      isBusy: conn.isBusy,
    }));
  }

  /**
   * Disconnect all connections associated with a specific server.
   * Used when removing a server from config to ensure clean cleanup.
   * @param serverId - The server ID to disconnect
   */
  disconnectByServerId(serverId: string): void {
    const toRemove: string[] = [];
    for (const conn of this.connections.values()) {
      if (conn.serverId === serverId) {
        toRemove.push(conn.id);
      }
    }
    for (const id of toRemove) {
      this.disconnect(id);
    }
  }

  /**
   * Clean up all connections and release resources.
   * Called on process exit to ensure proper cleanup.
   */
  cleanup(): void {
    for (const conn of this.connections.values()) {
      conn.client.end();
    }
    this.connections.clear();
    this.lastConnectionId = null;
  }

  // ===== Private methods =====

  /**
   * Get a connection by ID or the last used connection.
   * @param connectionId - Optional connection ID
   * @param throwIfMissing - Whether to throw an error if connection not found (default: true)
   * @returns The connection or null if not found
   * @throws Error if throwIfMissing is true and no connection is available
   */
  private getConnection(
    connectionId?: string,
    throwIfMissing: boolean = true
  ): SSHConnection | null {
    const id = connectionId || this.lastConnectionId;
    if (!id) {
      if (throwIfMissing) {
        throw new Error('No connection available');
      }
      return null;
    }

    const conn = this.connections.get(id);
    if (!conn) {
      if (throwIfMissing) {
        throw new Error(`Connection ${id} not found`);
      }
      return null;
    }

    return conn;
  }

  /**
   * Get the SSH agent path for the current platform.
   * @returns The SSH agent pipe path (Windows) or SSH_AUTH_SOCK environment variable (Unix)
   */
  private getAgentPath(): string | undefined {
    if (process.platform === 'win32') {
      return '\\\\.\\pipe\\openssh-ssh-agent';
    }
    return process.env.SSH_AUTH_SOCK;
  }
}
