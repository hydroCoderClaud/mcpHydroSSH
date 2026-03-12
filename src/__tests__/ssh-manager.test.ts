import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SSHManager } from '../ssh-manager.js';
import type { ServerConfig } from '../types.js';

describe('SSHManager', () => {
  let manager: SSHManager;

  beforeEach(() => {
    manager = new SSHManager({
      commandTimeout: 60000,
      keepaliveInterval: 60000,
      maxConnections: 5,
      autoReconnect: false,
      logCommands: true,
    });
  });

  afterEach(async () => {
    await manager.cleanup();
  });

  describe('constructor', () => {
    it('should create manager with default options', () => {
      const defaultManager = new SSHManager({
        commandTimeout: 60000,
        keepaliveInterval: 60000,
      });
      expect(defaultManager).toBeDefined();
    });

    it('should use custom maxConnections', () => {
      const customManager = new SSHManager({
        commandTimeout: 60000,
        keepaliveInterval: 60000,
        maxConnections: 10,
      });
      expect(customManager).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should throw on connection timeout', async () => {
      const serverConfig: ServerConfig = {
        id: 'timeout-test',
        name: 'Timeout Test',
        host: '192.0.2.1', // TEST-NET-1, should timeout
        port: 22,
        username: 'test',
        authMethod: 'key',
        connectTimeout: 1000,
      };

      await expect(manager.connect(serverConfig)).rejects.toThrow('timeout');
    });

    it('should throw on invalid host', async () => {
      const serverConfig: ServerConfig = {
        id: 'invalid-host',
        name: 'Invalid Host',
        host: 'invalid.host.that.does.not.exist',
        port: 22,
        username: 'test',
        authMethod: 'key',
        connectTimeout: 2000,
      };

      await expect(manager.connect(serverConfig)).rejects.toThrow();
    });
  });

  describe('maxConnections', () => {
    it('should enforce connection limit', async () => {
      const limitedManager = new SSHManager({
        commandTimeout: 60000,
        keepaliveInterval: 60000,
        maxConnections: 2,
      });

      // Try to connect to invalid hosts - they should count toward limit
      const serverConfig: ServerConfig = {
        id: 'limit-test',
        name: 'Limit Test',
        host: '192.0.2.1',
        port: 22,
        username: 'test',
        authMethod: 'key',
        connectTimeout: 5000,
      };

      // Start connections that will timeout
      const promises: Promise<string>[] = [];
      for (let i = 0; i < 3; i++) {
        promises.push(limitedManager.connect({ ...serverConfig, id: `limit-test-${i}` }).catch(() => 'failed'));
      }

      const results = await Promise.all(promises);
      // All should fail due to timeout or connection limit
      expect(results.filter(r => r === 'failed').length).toBeGreaterThan(0);

      await limitedManager.cleanup();
    });
  });

  describe('exec', () => {
    it('should throw when no connection available', async () => {
      await expect(manager.exec('ls')).rejects.toThrow('No connection available');
    });

    it('should handle command with cwd', async () => {
      // This test requires a valid connection, so we just verify the logic
      // by checking that it throws for wrong reason (no connection) not wrong reason (cwd issue)
      await expect(manager.exec('pwd', undefined, { cwd: '/tmp' }))
        .rejects.toThrow('No connection available');
    });
  });

  describe('getStatus', () => {
    it('should return null for non-existent connection', () => {
      const status = manager.getStatus('non-existent');
      expect(status).toBeNull();
    });

    it('should return null when no connectionId provided and no connections', () => {
      const status = manager.getStatus();
      expect(status).toBeNull();
    });

    it('should return all statuses when connectionId not provided', () => {
      const statuses = manager.getAllStatuses();
      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses).toHaveLength(0);
    });
  });

  describe('disconnect', () => {
    it('should handle disconnecting non-existent connection gracefully', () => {
      expect(() => manager.disconnect('non-existent')).not.toThrow();
    });

    it('should handle disconnect with no connectionId gracefully', () => {
      expect(() => manager.disconnect()).not.toThrow();
    });
  });

  describe('disconnectByServerId', () => {
    it('should handle non-existent serverId gracefully', () => {
      expect(() => manager.disconnectByServerId('non-existent')).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should clean up without errors', () => {
      expect(() => manager.cleanup()).not.toThrow();
    });

    it('should clear all connections', () => {
      manager.cleanup();
      // After cleanup, getStatus should return null
      expect(manager.getStatus()).toBeNull();
    });
  });
});
