// Type definitions for Electron IPC API

export interface Branch {
  name: string;
  current: boolean;
  behind?: number;
  ahead?: number;
  upstream?: string;
  hasUpstream?: boolean;
}

export interface FileStatus {
  path: string;
  status: "modified" | "added" | "deleted";
  hasStaged: boolean;
  hasUnstaged: boolean;
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
  lineNumber: number;
  hunkIndex?: number;
  hunkHeader?: string;
}

export interface SSHKeyInfo {
  success: boolean;
  hasKeys: boolean;
  keys?: Array<{ path: string; publicPath: string }>;
  keyPath?: string;
  publicKeyPath?: string;
}

export interface ElectronAPI {
  versions: NodeJS.ProcessVersions;
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
  getCurrentBranch: (repoPath: string) => Promise<string | null>;
  listBranches: (repoPath: string) => Promise<Branch[]>;
  listRemoteBranches: (repoPath: string) => Promise<Branch[]>;
  createBranch: (
    repoPath: string,
    branchName: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteBranch: (
    repoPath: string,
    branchName: string
  ) => Promise<{ success: boolean; error?: string }>;
  renameBranch: (
    repoPath: string,
    oldName: string,
    newName: string,
    alsoRenameRemote: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  checkout: (
    repoPath: string,
    branchName: string
  ) => Promise<{ success: boolean; error?: string }>;
  getStatus: (repoPath: string) => Promise<FileStatus[]>;
  stageFile: (repoPath: string, filepath: string) => Promise<void>;
  unstageFile: (repoPath: string, filepath: string) => Promise<void>;
  unstageAllFiles: (repoPath: string) => Promise<void>;
  stageLines: (
    repoPath: string,
    filepath: string,
    lines: DiffLine[]
  ) => Promise<void>;
  unstageLines: (
    repoPath: string,
    filepath: string,
    lines: DiffLine[]
  ) => Promise<void>;
  commit: (
    repoPath: string,
    message: string,
    description?: string
  ) => Promise<{ success: boolean; sha: string; error?: string }>;
  log: (repoPath: string, limit?: number) => Promise<Commit[]>;
  getDiff: (
    repoPath: string,
    filepath: string,
    staged?: boolean,
    contextLines?: number
  ) => Promise<DiffLine[]>;
  listStashes: (repoPath: string) => Promise<Stash[]>;
  stash: (
    repoPath: string,
    message: string
  ) => Promise<{ success: boolean; message: string; error?: string }>;
  popStash: (
    repoPath: string,
    index: number
  ) => Promise<{ success: boolean; message: string; error?: string }>;
  deleteStash: (
    repoPath: string,
    index: number
  ) => Promise<{ success: boolean; message: string; error?: string }>;
  createRepository: (
    parentPath: string,
    repoName: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>;
  clone: (
    url: string,
    destination: string,
    username?: string,
    password?: string,
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
  getRemoteUrl: (
    repoPath: string
  ) => Promise<{ success: boolean; url?: string; error?: string }>;
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
  findKeys: () => Promise<SSHKeyInfo>;
  generateKey: () => Promise<{
    success: boolean;
    keyPath?: string;
    publicKeyPath?: string;
    publicKey?: string;
    error?: string;
  }>;
  readPublicKey: (
    keyPath: string
  ) => Promise<{ success: boolean; content?: string; error?: string }>;
  isHostTrusted: (hostname: string) => Promise<{
    success: boolean;
    trusted?: boolean;
    isTrusted?: boolean;
    error?: string;
  }>;
  trustHost: (
    hostname: string
  ) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
