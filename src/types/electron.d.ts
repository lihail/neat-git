export interface IpcRenderer {
  on(channel: string, listener: (event: any, ...args: any[]) => void): void;
  off(channel: string, listener: (event: any, ...args: any[]) => void): void;
  send(channel: string, ...args: any[]): void;
  invoke(channel: string, ...args: any[]): Promise<any>;
}

export interface ElectronAPI {
  platform: string;
  versions: NodeJS.ProcessVersions;
  openFolderDialog: () => Promise<{ success: true; path: string } | { success: false; error: string | null }>;
  selectFolderDialog: () => Promise<{ success: true; path: string } | { success: false; error: string | null }>;
}

declare global {
  interface Window {
    ipcRenderer: IpcRenderer;
    electronAPI: ElectronAPI;
  }
}

