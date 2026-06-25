/**
 * Preload Script
 * Exposes safe APIs to the renderer process via contextBridge
 */
import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { HostRequest } from '@shared/host-api/types';
import { HOST_EVENT_CHANNELS } from '@shared/host-events/contract';

const validStaticEventChannels: Set<string> = new Set(
  Object.values(HOST_EVENT_CHANNELS).flatMap((moduleChannels) => Object.values(moduleChannels)),
);
const DYNAMIC_CHANNEL_EVENT_RE = /^channel:[a-z0-9_-]+-(?:qr|success|error)$/i;

function isValidEventChannel(channel: string): boolean {
  return validStaticEventChannels.has(channel)
    || DYNAMIC_CHANNEL_EVENT_RE.test(channel)
    || channel.startsWith('ext:');
}

/**
 * IPC renderer methods exposed to the renderer process
 */
const electronAPI = {
  /**
   * IPC invoke (request-response pattern)
   */
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => {
      const validChannels = [
        // Gateway
        'gateway:status',
        // mclaw
        'mclaw:status',
        // Shell
        'shell:openExternal',
        'shell:showItemInFolder',
        'shell:openPath',
        // Dialog
        'dialog:open',
        'dialog:message',
        // App
        'app:version',
        'app:name',
        'app:platform',
        'app:request',
        // Window controls
        'window:minimize',
        'window:maximize',
        'window:close',
        'window:isMaximized',
        'window:syncTrafficLightPosition',
        // Settings
        'settings:get',
        'settings:set',
        'settings:setMany',
        'settings:getAll',
        'settings:reset',
        'usage:recentTokenHistory',
        // Update
        'update:status',
        'update:version',
        'update:check',
        'update:download',
        'update:install',
        'update:setChannel',
        'update:setAutoDownload',
        'update:cancelAutoInstall',
        // Env
        'env:getConfig',
        'env:setApiKey',
        'env:deleteApiKey',
        // Provider
        'provider:list',
        'provider:get',
        'provider:save',
        'provider:delete',
        'provider:setApiKey',
        'provider:updateWithKey',
        'provider:deleteApiKey',
        'provider:hasApiKey',
        'provider:getApiKey',
        'provider:setDefault',
        'provider:getDefault',
        'provider:validateKey',
        // File preview (sandboxed read/write/list/tree)
        'file:readText',
        'file:readBinary',
        'file:writeText',
        'file:stat',
        'file:listDir',
        'file:listTree',
        // mclaw extras
        'mclaw:getSkillsDir',
        'mclaw:getCliCommand',
      ];

      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }

      throw new Error(`Invalid IPC channel: ${channel}`);
    },

    /**
     * Listen for events from main process
     */
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      if (isValidEventChannel(channel)) {
        const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
          callback(...args);
        };
        ipcRenderer.on(channel, subscription);

        // Return unsubscribe function
        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      }

      throw new Error(`Invalid IPC channel: ${channel}`);
    },

    /**
     * Listen for a single event from main process
     */
    once: (channel: string, callback: (...args: unknown[]) => void) => {
      if (isValidEventChannel(channel)) {
        ipcRenderer.once(channel, (_event, ...args) => callback(...args));
        return;
      }

      throw new Error(`Invalid IPC channel: ${channel}`);
    },

    /**
     * Remove all listeners for a channel
     */
    off: (channel: string, callback?: (...args: unknown[]) => void) => {
      if (callback) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ipcRenderer.removeListener(channel, callback as any);
      } else {
        ipcRenderer.removeAllListeners(channel);
      }
    },
  },

  /**
   * Open external URL in default browser
   */
  openExternal: (url: string) => {
    return ipcRenderer.invoke('shell:openExternal', url);
  },

  /**
   * Resolve the on-disk path for a native drag/drop or <input type="file"> File.
   */
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  /**
   * Get current platform
   */
  platform: process.platform,

  /**
   * Check if running in development
   */
  isDev: process.env.NODE_ENV === 'development' || !!process.env.VITE_DEV_SERVER_URL,
};

const mclawAPI = {
  hostInvoke: (request: HostRequest) => ipcRenderer.invoke('host:invoke', request),
  // 客户端 HMAC 签名密钥（绑 mclaw 客户端），供渲染进程提交给后端 IssueRuntimeKey 绑定 runtime key。
  // 明文仅短暂存在于渲染进程内存，不持久化。
  getDeviceSecret: (): Promise<string> => ipcRenderer.invoke('device-secret:get'),
  // 数据 API key（通用 X-API-Key，不绑客户端）。渲染进程用此三接口做 ensureDataApiKey 严谨流程。
  dataApiKey: {
    get: (): Promise<string | null> => ipcRenderer.invoke('data-api-key:get'),
    save: (key: string): Promise<void> => ipcRenderer.invoke('data-api-key:save', key),
    clear: (): Promise<void> => ipcRenderer.invoke('data-api-key:clear'),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', electronAPI);
contextBridge.exposeInMainWorld('mclaw', mclawAPI);

// Type declarations for the renderer process
export type ElectronAPI = typeof electronAPI;
