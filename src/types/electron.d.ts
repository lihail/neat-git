// Type definitions for Electron IPC API

export interface Branch {
  name: string;
  current: boolean;
  behind?: number;
  ahead?: number;
  hasUpstream?: boolean;
  upstream?: string;
}

export interface FileChange {
  path: string;
  status: "modified" | "added" | "deleted";
  hasStaged: boolean;
  hasUnstaged: boolean;
  oldPath?: string;
  unstagedStatus?: "modified" | "added" | "deleted";
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  email: string;
  date: string;
  timestamp: number;
}

export interface Stash {
  index: number;
  message: string;
  date: string;
  sha: string;
}

export interface DiffLine {
  type: "add" | "delete" | "context";
  content: string;
  lineNumber?: number;
  oldLineNumber?: number;
  newLineNumber?: number;
  hunkIndex?: number;
  hunkHeader?: string;
}

export interface ElectronAPI {
  openSelectGitRepositoryFolderDialog: () => Promise<
    { success: true; path: string } | { success: false; error: string | null }
  >;
  openSelectParentFolderDialog: () => Promise<
    { success: true; path: string } | { success: false; error: string | null }
  >;
  getGlobalConfig: () => Promise<{
    success: boolean;
    userName?: string;
    userEmail?: string;
    error?: string;
  }>;
  setGlobalConfig: (
    userName: string,
    userEmail: string
  ) => Promise<{ success: boolean; error?: string }>;
  getCurrentBranch: (repoPath: string) => Promise<string>;
  listLocalBranches: (repoPath: string) => Promise<Branch[]>;
  listRemoteBranches: (repoPath: string) => Promise<Branch[]>;
  createBranch: (repoPath: string, branchName: string) => Promise<{ success: true }>;
  deleteBranch: (repoPath: string, branchName: string) => Promise<{ success: true }>;
  renameBranch: (
    repoPath: string,
    oldName: string,
    newName: string,
    alsoRenameRemote: boolean
  ) => Promise<{ success: true }>;
  checkout: (repoPath: string, branchName: string) => Promise<{ success: true }>;
  getStatus: (repoPath: string) => Promise<FileChange[]>;
  stageFile: (repoPath: string, filepath: string) => Promise<{ success: true }>;
  stageAllFiles: (repoPath: string) => Promise<{ success: true }>;
  unstageChange: (
    repoPath: string,
    filepath: string,
    oldFilePath?: string | null
  ) => Promise<{ success: true }>;
  unstageAllFiles: (repoPath: string) => Promise<{ success: true }>;
  discardChanges: (repoPath: string, filepath: string) => Promise<{ success: true }>;
  stageLines: (
    repoPath: string,
    filepath: string,
    lines: DiffLine[]
  ) => Promise<{ success: boolean; error?: string }>;
  unstageLines: (
    repoPath: string,
    filepath: string,
    lines: DiffLine[]
  ) => Promise<{ success: boolean; error?: string }>;
  stageHunk: (
    repoPath: string,
    filepath: string,
    hunkIndex: number
  ) => Promise<{ success: boolean; error?: string }>;
  unstageHunk: (
    repoPath: string,
    filepath: string,
    hunkIndex: number
  ) => Promise<{ success: boolean; error?: string }>;
  commit: (
    repoPath: string,
    message: string,
    description?: string | null
  ) => Promise<{ success: boolean; sha?: string; message?: string }>;
  log: (repoPath: string, limit?: number) => Promise<Commit[]>;
  getDiff: (
    repoPath: string,
    filepath: string,
    staged?: boolean,
    contextLines?: number,
    oldFilePath?: string | null
  ) => Promise<DiffLine[]>;
  listStashes: (repoPath: string) => Promise<Stash[]>;
  stash: (repoPath: string, message: string) => Promise<{ success: boolean; message: string }>;
  popStash: (repoPath: string, index: number) => Promise<{ success: true; message: string }>;
  deleteStash: (repoPath: string, index: number) => Promise<{ success: true; message: string }>;
  createRepository: (
    parentPath: string,
    repoName: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>;
  clone: (
    url: string,
    destination: string,
    username?: string | null,
    password?: string | null,
    saveCredentials?: boolean
  ) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
    needsAuth?: boolean;
    needsSsh?: boolean;
    needsSshTrust?: boolean;
    sshHostname?: string;
  }>;
  getRemoteUrl: (repoPath: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  fetch: (
    repoPath: string,
    username?: string | null,
    password?: string | null,
    saveCredentials?: boolean
  ) => Promise<{ success: boolean; error?: string; needsAuth?: boolean }>;
  push: (
    repoPath: string,
    username?: string | null,
    password?: string | null,
    saveCredentials?: boolean
  ) => Promise<{ success: boolean; error?: string; needsAuth?: boolean }>;
  pullCurrentBranch: (
    repoPath: string,
    username?: string | null,
    password?: string | null,
    saveCredentials?: boolean
  ) => Promise<{ success: boolean; error?: string; needsAuth?: boolean }>;
  pullNonCurrentBranch: (
    repoPath: string,
    branchName: string,
    username?: string | null,
    password?: string | null,
    saveCredentials?: boolean
  ) => Promise<{ success: boolean; error?: string; needsAuth?: boolean }>;
  findSshKeys: () => Promise<{
    success: boolean;
    hasKeys?: boolean;
    keys?: Array<{ name: string; privatePath: string; publicPath: string }>;
    error?: string;
  }>;
  generateSshKey: () => Promise<{
    success: boolean;
    keyPath?: string;
    publicKeyPath?: string;
    error?: string;
  }>;
  readSshPublicKey: (
    keyPath: string
  ) => Promise<{ success: boolean; content?: string; error?: string }>;
  isHostTrusted: (hostname: string) => Promise<{
    success: boolean;
    isTrusted?: boolean;
    error?: string;
  }>;
  trustHost: (hostname: string) => Promise<{ success: boolean; error?: string }>;
  showItemInFolder: (fullPath: string) => Promise<{ success: boolean; error?: string }>;
  openInExternalEditor: (fullPath: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
