import { ipcMain } from "electron";
import {
  getGlobalConfig,
  setGlobalConfig,
  getCurrentBranch,
  listBranches,
  listRemoteBranches,
  getStatus,
  stageFile,
  unstageFile,
  unstageAllFiles,
  createBranch,
  deleteBranch,
  renameBranch,
  checkout,
  commit,
  log,
  getDiff,
  listStashes,
  stash,
  popStash,
  deleteStash,
  stageLines,
  unstageLines,
  createRepository,
  clone,
  getRemoteUrl,
  fetch,
  push,
  pullCurrentBranch,
  pullNonCurrentBranch,
} from "../services/gitService";
import { IPC_CHANNELS } from "../ipcChannels";

export const registerGitHandlers = () => {
  ipcMain.handle(IPC_CHANNELS.GIT_GET_GLOBAL_CONFIG, async () => {
    return await getGlobalConfig();
  });

  ipcMain.handle(
    IPC_CHANNELS.GIT_SET_GLOBAL_CONFIG,
    async (_, userName: string, userEmail: string) => {
      return await setGlobalConfig(userName, userEmail);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_GET_CURRENT_BRANCH,
    async (_, repoPath: string) => {
      return await getCurrentBranch(repoPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_LIST_BRANCHES,
    async (_, repoPath: string) => {
      return await listBranches(repoPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_LIST_REMOTE_BRANCHES,
    async (_, repoPath: string) => {
      return await listRemoteBranches(repoPath);
    }
  );

  ipcMain.handle(IPC_CHANNELS.GIT_GET_STATUS, async (_, repoPath: string) => {
    return await getStatus(repoPath);
  });

  ipcMain.handle(
    IPC_CHANNELS.GIT_STAGE_FILE,
    async (_, repoPath: string, filepath: string) => {
      return await stageFile(repoPath, filepath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_UNSTAGE_FILE,
    async (_, repoPath: string, filepath: string) => {
      return await unstageFile(repoPath, filepath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_UNSTAGE_ALL_FILES,
    async (_, repoPath: string) => {
      return await unstageAllFiles(repoPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_CREATE_BRANCH,
    async (_, repoPath: string, branchName: string) => {
      return await createBranch(repoPath, branchName);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_DELETE_BRANCH,
    async (_, repoPath: string, branchName: string) => {
      return await deleteBranch(repoPath, branchName);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_RENAME_BRANCH,
    async (
      _,
      repoPath: string,
      oldName: string,
      newName: string,
      alsoRenameRemote: boolean
    ) => {
      return await renameBranch(repoPath, oldName, newName, alsoRenameRemote);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_CHECKOUT,
    async (_, repoPath: string, branchName: string) => {
      return await checkout(repoPath, branchName);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_COMMIT,
    async (_, repoPath: string, message: string, description?: string) => {
      return await commit(repoPath, message, description);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_LOG,
    async (_, repoPath: string, limit: number = 50) => {
      return await log(repoPath, limit);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_GET_DIFF,
    async (
      _,
      repoPath: string,
      filepath: string,
      staged: boolean = false,
      contextLines: number = 999999
    ) => {
      return await getDiff(repoPath, filepath, staged, contextLines);
    }
  );

  ipcMain.handle(IPC_CHANNELS.GIT_LIST_STASHES, async (_, repoPath: string) => {
    return await listStashes(repoPath);
  });

  ipcMain.handle(
    IPC_CHANNELS.GIT_STASH,
    async (_, repoPath: string, message: string) => {
      return await stash(repoPath, message);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_POP_STASH,
    async (_, repoPath: string, index: number) => {
      return await popStash(repoPath, index);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_DELETE_STASH,
    async (_, repoPath: string, index: number) => {
      return await deleteStash(repoPath, index);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_STAGE_LINES,
    async (
      _,
      repoPath: string,
      filepath: string,
      lines: Array<{ type: string; content: string; lineNumber: number }>
    ) => {
      return await stageLines(repoPath, filepath, lines);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_UNSTAGE_LINES,
    async (
      _,
      repoPath: string,
      filepath: string,
      lines: Array<{ type: string; content: string; lineNumber: number }>
    ) => {
      return await unstageLines(repoPath, filepath, lines);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_CREATE_REPOSITORY,
    async (_, parentPath: string, repoName: string) => {
      return await createRepository(parentPath, repoName);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_CLONE,
    async (
      _,
      url: string,
      destination: string,
      username?: string,
      password?: string,
      saveCredentials: boolean = true
    ) => {
      return await clone(url, destination, username, password, saveCredentials);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_GET_REMOTE_URL,
    async (_, repoPath: string) => {
      return await getRemoteUrl(repoPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_FETCH,
    async (
      _,
      repoPath: string,
      username?: string | null,
      password?: string | null,
      saveCredentials: boolean = true
    ) => {
      return await fetch(repoPath, username, password, saveCredentials);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_PUSH,
    async (
      _,
      repoPath: string,
      username?: string | null,
      password?: string | null,
      saveCredentials: boolean = true
    ) => {
      return await push(repoPath, username, password, saveCredentials);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_PULL_CURRENT_BRANCH,
    async (
      _,
      repoPath: string,
      username?: string | null,
      password?: string | null,
      saveCredentials: boolean = true
    ) => {
      return await pullCurrentBranch(repoPath, username, password, saveCredentials);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_PULL_NON_CURRENT_BRANCH,
    async (
      _,
      repoPath: string,
      branchName: string,
      username?: string | null,
      password?: string | null,
      saveCredentials: boolean = true
    ) => {
      return await pullNonCurrentBranch(
        repoPath,
        branchName,
        username,
        password,
        saveCredentials
      );
    }
  );
};
