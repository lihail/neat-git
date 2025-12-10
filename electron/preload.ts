import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "./ipcChannels";

// --------- Expose a type-safe API to the Renderer process ---------
contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  versions: process.versions,
  openSelectGitRepositoryFolderDialog: () =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_SELECT_GIT_REPOSITORY_FOLDER),
  openSelectParentFolderDialog: () =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_SELECT_PARENT_FOLDER),
  getGlobalConfig: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_GLOBAL_CONFIG),
  setGlobalConfig: (userName: string, userEmail: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_SET_GLOBAL_CONFIG, userName, userEmail),
  getCurrentBranch: (repoPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_CURRENT_BRANCH, repoPath),
  listBranches: (repoPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_LIST_BRANCHES, repoPath),
  listRemoteBranches: (repoPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_LIST_REMOTE_BRANCHES, repoPath),
  createBranch: (repoPath: string, branchName: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_CREATE_BRANCH, repoPath, branchName),
  deleteBranch: (repoPath: string, branchName: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_DELETE_BRANCH, repoPath, branchName),
  renameBranch: (
    repoPath: string,
    oldName: string,
    newName: string,
    alsoRenameRemote: boolean
  ) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.GIT_RENAME_BRANCH,
      repoPath,
      oldName,
      newName,
      alsoRenameRemote
    ),
  checkout: (repoPath: string, branchName: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_CHECKOUT, repoPath, branchName),
  getStatus: (repoPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_STATUS, repoPath),
  stageFile: (repoPath: string, filepath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE_FILE, repoPath, filepath),
  unstageFile: (repoPath: string, filepath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_UNSTAGE_FILE, repoPath, filepath),
  unstageAllFiles: (repoPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_UNSTAGE_ALL_FILES, repoPath),
  stageLines: (
    repoPath: string,
    filepath: string,
    lines: Array<{ type: string; content: string; lineNumber: number }>
  ) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE_LINES, repoPath, filepath, lines),
  unstageLines: (
    repoPath: string,
    filepath: string,
    lines: Array<{ type: string; content: string; lineNumber: number }>
  ) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.GIT_UNSTAGE_LINES,
      repoPath,
      filepath,
      lines
    ),
  commit: (repoPath: string, message: string, description?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_COMMIT, repoPath, message, description),
  log: (repoPath: string, limit?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_LOG, repoPath, limit),
  getDiff: (
    repoPath: string,
    filepath: string,
    staged?: boolean,
    contextLines?: number
  ) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.GIT_GET_DIFF,
      repoPath,
      filepath,
      staged,
      contextLines
    ),
  listStashes: (repoPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_LIST_STASHES, repoPath),
  stash: (repoPath: string, message: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_STASH, repoPath, message),
  popStash: (repoPath: string, index: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_POP_STASH, repoPath, index),
  deleteStash: (repoPath: string, index: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_DELETE_STASH, repoPath, index),
  createRepository: (parentPath: string, repoName: string) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.GIT_CREATE_REPOSITORY,
      parentPath,
      repoName
    ),
  clone: (
    url: string,
    destination: string,
    username?: string,
    password?: string,
    saveCredentials?: boolean
  ) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.GIT_CLONE,
      url,
      destination,
      username,
      password,
      saveCredentials
    ),
  getRemoteUrl: (repoPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_REMOTE_URL, repoPath),
  fetch: (
    repoPath: string,
    username?: string | null,
    password?: string | null,
    saveCredentials?: boolean
  ) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.GIT_FETCH,
      repoPath,
      username,
      password,
      saveCredentials
    ),
  push: (
    repoPath: string,
    username?: string | null,
    password?: string | null,
    saveCredentials?: boolean
  ) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.GIT_PUSH,
      repoPath,
      username,
      password,
      saveCredentials
    ),
  pullCurrentBranch: (
    repoPath: string,
    username?: string | null,
    password?: string | null,
    saveCredentials?: boolean
  ) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.GIT_PULL_CURRENT_BRANCH,
      repoPath,
      username,
      password,
      saveCredentials
    ),
  pullNonCurrentBranch: (
    repoPath: string,
    branchName: string,
    username?: string | null,
    password?: string | null,
    saveCredentials?: boolean
  ) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.GIT_PULL_NON_CURRENT_BRANCH,
      repoPath,
      branchName,
      username,
      password,
      saveCredentials
    ),
  findKeys: () => ipcRenderer.invoke(IPC_CHANNELS.SSH_FIND_KEYS),
  generateKey: () => ipcRenderer.invoke(IPC_CHANNELS.SSH_GENERATE_KEY),
  readPublicKey: (keyPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_READ_PUBLIC_KEY, keyPath),
  isHostTrusted: (hostname: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_IS_HOST_TRUSTED, hostname),
  trustHost: (hostname: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_TRUST_HOST, hostname),
});
