/**
 * Electron API Type Declarations
 * Types for the APIs exposed via contextBridge
 */

import type { HostResponse, HostRequest } from '../lib/host-api-types';

export interface IpcRenderer {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, callback: (...args: unknown[]) => void): (() => void) | void;
  once(channel: string, callback: (...args: unknown[]) => void): void;
  off(channel: string, callback?: (...args: unknown[]) => void): void;
}

export interface ElectronAPI {
  ipcRenderer: IpcRenderer;
  openExternal: (url: string) => Promise<void>;
  getPathForFile: (file: File) => string;
  platform: NodeJS.Platform;
  isDev: boolean;
}

export type HostInvokeErrorCode = 'VALIDATION' | 'UNSUPPORTED' | 'INTERNAL';
export type HostInvokeRequest = HostRequest;
export type HostInvokeResponse<T = unknown> = HostResponse<T>;

declare global {
  interface Window {
    electron: ElectronAPI;
    mclaw?: {
      hostInvoke: <T = unknown>(request: HostInvokeRequest) => Promise<HostInvokeResponse<T>>;
      // 客户端 HMAC 签名密钥（绑 mclaw 客户端），提交给后端 IssueRuntimeKey 绑定 runtime key
      getDeviceSecret?: () => Promise<string>;
      // 数据 API key（通用 X-API-Key，不绑客户端），ensureDataApiKey 严谨流程用
      dataApiKey?: {
        get: () => Promise<string | null>;
        save: (key: string) => Promise<void>;
        clear: () => Promise<void>;
      };
    };
  }
}

export {};
