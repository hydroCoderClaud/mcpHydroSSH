import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { loadConfig, saveConfig, addServer, removeServer, updateServer } from '../config.js';
import type { Config, ServerConfig } from '../types.js';

// Use the actual config path - tests will run sequentially
const CONFIG_PATH = path.join(homedir(), '.hydrossh', 'config.json');

describe('Config', () => {
  let originalConfig: string | null = null;

  beforeEach(() => {
    // Backup original config if exists
    if (fs.existsSync(CONFIG_PATH)) {
      originalConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
    }
  });

  afterEach(() => {
    // Restore original config after test
    if (originalConfig !== null) {
      fs.writeFileSync(CONFIG_PATH, originalConfig, 'utf-8');
    } else if (fs.existsSync(CONFIG_PATH)) {
      fs.unlinkSync(CONFIG_PATH);
    }
  });

  describe('loadConfig', () => {
    it('should load valid config', () => {
      const testConfig: Config = {
        servers: [{
          id: 'test-server-load',
          name: 'Test Server',
          host: 'test.com',
          port: 22,
          username: 'test',
          authMethod: 'key',
        }],
        settings: {
          defaultConnectTimeout: 30000,
          defaultKeepaliveInterval: 60000,
          commandTimeout: 60000,
          maxConnections: 5,
          autoReconnect: false,
          logCommands: true,
        },
      };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(testConfig, null, 2));

      const loaded = loadConfig();
      expect(loaded.servers.length).toBeGreaterThan(0);
      expect(loaded.servers.find(s => s.id === 'test-server-load')).toBeDefined();
    });

    it('should use default values for optional fields', () => {
      const minimalConfig = {
        servers: [{
          id: 'test-defaults',
          name: 'Test',
          host: 'test.com',
          username: 'test',
          authMethod: 'key' as const,
        }],
        settings: {},
      };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(minimalConfig));
      const loaded = loadConfig();
      expect(loaded.servers[0].port).toBe(22);
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', () => {
      const testConfig: Config = {
        servers: [],
        settings: {
          defaultConnectTimeout: 30000,
          defaultKeepaliveInterval: 60000,
          commandTimeout: 60000,
          maxConnections: 5,
          autoReconnect: false,
          logCommands: true,
        },
      };
      saveConfig(testConfig);

      expect(fs.existsSync(CONFIG_PATH)).toBe(true);
      const loaded = loadConfig();
      expect(loaded.settings.commandTimeout).toBe(60000);
    });
  });

  describe('addServer', () => {
    it('should add a new server', () => {
      const initialConfig: Config = {
        servers: [],
        settings: {
          defaultConnectTimeout: 30000,
          defaultKeepaliveInterval: 60000,
          commandTimeout: 60000,
          maxConnections: 5,
          autoReconnect: false,
          logCommands: true,
        },
      };
      saveConfig(initialConfig);

      const newServer: ServerConfig = {
        id: 'new-server-test',
        name: 'New Server',
        host: 'new.com',
        port: 22,
        username: 'admin',
        authMethod: 'key',
      };
      addServer(newServer);

      const loaded = loadConfig();
      expect(loaded.servers.length).toBeGreaterThan(0);
      expect(loaded.servers.find(s => s.id === 'new-server-test')).toBeDefined();
    });

    it('should throw on duplicate ID', () => {
      const initialConfig: Config = {
        servers: [{
          id: 'existing-test',
          name: 'Existing',
          host: 'existing.com',
          port: 22,
          username: 'admin',
          authMethod: 'key',
        }],
        settings: {
          defaultConnectTimeout: 30000,
          defaultKeepaliveInterval: 60000,
          commandTimeout: 60000,
          maxConnections: 5,
          autoReconnect: false,
          logCommands: true,
        },
      };
      saveConfig(initialConfig);

      const duplicateServer: ServerConfig = {
        id: 'existing-test',
        name: 'Duplicate',
        host: 'dup.com',
        port: 22,
        username: 'admin',
        authMethod: 'key',
      };
      expect(() => addServer(duplicateServer)).toThrow('already exists');
    });
  });

  describe('removeServer', () => {
    it('should remove a server', () => {
      const initialConfig: Config = {
        servers: [{
          id: 'to-remove-test',
          name: 'To Remove',
          host: 'remove.com',
          port: 22,
          username: 'admin',
          authMethod: 'key',
        }],
        settings: {
          defaultConnectTimeout: 30000,
          defaultKeepaliveInterval: 60000,
          commandTimeout: 60000,
          maxConnections: 5,
          autoReconnect: false,
          logCommands: true,
        },
      };
      saveConfig(initialConfig);

      removeServer('to-remove-test');

      const loaded = loadConfig();
      expect(loaded.servers.find(s => s.id === 'to-remove-test')).toBeUndefined();
    });

    it('should throw on non-existent server', () => {
      const initialConfig: Config = {
        servers: [],
        settings: {
          defaultConnectTimeout: 30000,
          defaultKeepaliveInterval: 60000,
          commandTimeout: 60000,
          maxConnections: 5,
          autoReconnect: false,
          logCommands: true,
        },
      };
      saveConfig(initialConfig);

      expect(() => removeServer('non-existent-test')).toThrow('not found');
    });
  });

  describe('updateServer', () => {
    it('should update a server', () => {
      const initialConfig: Config = {
        servers: [{
          id: 'to-update-test',
          name: 'Original',
          host: 'original.com',
          port: 22,
          username: 'admin',
          authMethod: 'key',
        }],
        settings: {
          defaultConnectTimeout: 30000,
          defaultKeepaliveInterval: 60000,
          commandTimeout: 60000,
          maxConnections: 5,
          autoReconnect: false,
          logCommands: true,
        },
      };
      saveConfig(initialConfig);

      updateServer('to-update-test', { name: 'Updated', host: 'updated.com' });

      const loaded = loadConfig();
      const updated = loaded.servers.find(s => s.id === 'to-update-test');
      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated');
      expect(updated?.host).toBe('updated.com');
    });

    it('should throw on non-existent server', () => {
      const initialConfig: Config = {
        servers: [],
        settings: {
          defaultConnectTimeout: 30000,
          defaultKeepaliveInterval: 60000,
          commandTimeout: 60000,
          maxConnections: 5,
          autoReconnect: false,
          logCommands: true,
        },
      };
      saveConfig(initialConfig);

      expect(() => updateServer('non-existent-test', { name: 'New' })).toThrow('not found');
    });
  });
});
