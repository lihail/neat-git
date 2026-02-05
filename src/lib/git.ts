import { FileChange } from "@/types/git";

export interface Branch {
  name: string;
  current?: boolean;
  behind?: number;
  ahead?: number;
  hasUpstream?: boolean;
  upstream?: string; // actual upstream branch name (e.g., "origin/main")
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

export const getCurrentBranch = async (repoPath: string): Promise<string> => {
  try {
    const branch = await window.electronAPI.getCurrentBranch(repoPath);
    return branch || "main";
  } catch (error) {
    console.error("Error getting current branch:", error);
    throw error;
  }
};

/**
 * List all local branches
 */
export const listBranches = async (repoPath: string): Promise<Branch[]> => {
  try {
    const branches = await window.electronAPI.listBranches(repoPath);
    return branches || [];
  } catch (error) {
    console.error("Error listing branches:", error);
    throw error;
  }
};

export const getStatus = async (repoPath: string): Promise<FileChange[]> => {
  try {
    const files = await window.electronAPI.getStatus(repoPath);
    return files || [];
  } catch (error) {
    console.error("Error getting git status:", error);
    throw error;
  }
};

export const stageFile = async (repoPath: string, filepath: string): Promise<void> => {
  try {
    await window.electronAPI.stageFile(repoPath, filepath);
  } catch (error) {
    console.error("Error staging file:", error);
    throw error;
  }
};

export const unstageChange = async (
  repoPath: string,
  filepath: string,
  oldFilePath?: string
): Promise<void> => {
  try {
    // Ensure all parameters are serializable
    const safeOldFilePath = oldFilePath !== undefined ? String(oldFilePath) : null;
    await window.electronAPI.unstageChange(repoPath, filepath, safeOldFilePath);
  } catch (error) {
    console.error("Error unstaging change:", error);
    throw error;
  }
};

export const listRemoteBranches = async (repoPath: string): Promise<Branch[]> => {
  try {
    const branches = await window.electronAPI.listRemoteBranches(repoPath);
    return branches || [];
  } catch (error) {
    console.error("Error listing remote branches:", error);
    return [];
  }
};

/**
 * Get diff for a file
 * @param staged - If true, shows staged changes (HEAD vs staging area). If false, shows unstaged changes (staging area vs working directory)
 * @param contextLines - Number of context lines to show around changes (999999 for full file, 3 for hunks)
 */
export const getDiff = async (
  repoPath: string,
  filepath: string,
  staged: boolean = false,
  contextLines: number = 999999,
  oldFilePath?: string
): Promise<DiffLine[]> => {
  try {
    // Ensure all parameters are serializable
    const safeOldFilePath = oldFilePath !== undefined ? String(oldFilePath) : null;
    const diff = await window.electronAPI.getDiff(
      repoPath,
      filepath,
      staged,
      contextLines,
      safeOldFilePath
    );
    return diff || [];
  } catch (error) {
    console.error("Error getting diff:", error);
    throw error;
  }
};

/**
 * Create a new branch and checkout to it
 */
export const createBranch = async (repoPath: string, branchName: string): Promise<void> => {
  try {
    await window.electronAPI.createBranch(repoPath, branchName);
  } catch (error) {
    console.error("Error creating branch:", error);
    throw error;
  }
};

export const checkoutBranch = async (repoPath: string, branchName: string): Promise<void> => {
  try {
    await window.electronAPI.checkout(repoPath, branchName);
  } catch (error) {
    console.error("Error checking out branch:", error);
    throw error;
  }
};

export const deleteBranch = async (repoPath: string, branchName: string): Promise<void> => {
  try {
    await window.electronAPI.deleteBranch(repoPath, branchName);
  } catch (error) {
    console.error("Error deleting branch:", error);
    throw error;
  }
};

export const renameBranch = async (
  repoPath: string,
  oldName: string,
  newName: string,
  alsoRenameRemote: boolean
): Promise<void> => {
  try {
    await window.electronAPI.renameBranch(repoPath, oldName, newName, alsoRenameRemote);
  } catch (error) {
    console.error("Error renaming branch:", error);
    throw error;
  }
};

export const stageAllFiles = async (repoPath: string): Promise<void> => {
  try {
    await window.electronAPI.stageAllFiles(repoPath);
  } catch (error) {
    console.error("Error staging all files:", error);
    throw error;
  }
};

export const unstageAllFiles = async (repoPath: string): Promise<void> => {
  try {
    await window.electronAPI.unstageAllFiles(repoPath);
  } catch (error) {
    console.error("Error unstaging all files:", error);
    throw error;
  }
};

export const getCommitHistory = async (repoPath: string, limit: number = 50): Promise<Commit[]> => {
  try {
    const commits = await window.electronAPI.log(repoPath, limit);
    return commits || [];
  } catch (error) {
    console.error("Error getting commit history:", error);
    throw error;
  }
};

export const commit = async (
  repoPath: string,
  message: string,
  description?: string
): Promise<{ success: boolean; sha: string }> => {
  try {
    // Ensure all parameters are serializable
    const safeDescription = description !== undefined ? String(description) : null;
    return await window.electronAPI.commit(repoPath, message, safeDescription);
  } catch (error) {
    console.error("Error committing:", error);
    throw error;
  }
};

export const stash = async (
  repoPath: string,
  message: string
): Promise<{ success: boolean; message: string }> => {
  try {
    return await window.electronAPI.stash(repoPath, message);
  } catch (error) {
    console.error("Error stashing changes:", error);
    throw error;
  }
};

export const listStashes = async (repoPath: string): Promise<Stash[]> => {
  try {
    const stashes = await window.electronAPI.listStashes(repoPath);
    return stashes || [];
  } catch (error) {
    console.error("Error listing stashes:", error);
    throw error;
  }
};

export const popStash = async (
  repoPath: string,
  index: number
): Promise<{ success: boolean; message: string }> => {
  try {
    return await window.electronAPI.popStash(repoPath, index);
  } catch (error) {
    console.error("Error popping stash:", error);
    throw error;
  }
};

export const deleteStash = async (
  repoPath: string,
  index: number
): Promise<{ success: boolean; message: string }> => {
  try {
    return await window.electronAPI.deleteStash(repoPath, index);
  } catch (error) {
    console.error("Error deleting stash:", error);
    throw error;
  }
};

export const stageLines = async (
  repoPath: string,
  filepath: string,
  lines: DiffLine[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    return await window.electronAPI.stageLines(repoPath, filepath, lines);
  } catch (error) {
    console.error("Error staging lines:", error);
    throw error;
  }
};

export const unstageLines = async (
  repoPath: string,
  filepath: string,
  lines: DiffLine[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    return await window.electronAPI.unstageLines(repoPath, filepath, lines);
  } catch (error) {
    console.error("Error unstaging lines:", error);
    throw error;
  }
};

export const stageHunk = async (
  repoPath: string,
  filepath: string,
  hunkIndex: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    return await window.electronAPI.stageHunk(repoPath, filepath, hunkIndex);
  } catch (error) {
    console.error("Error staging hunk:", error);
    throw error;
  }
};

export const unstageHunk = async (
  repoPath: string,
  filepath: string,
  hunkIndex: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    return await window.electronAPI.unstageHunk(repoPath, filepath, hunkIndex);
  } catch (error) {
    console.error("Error unstaging hunk:", error);
    throw error;
  }
};

export const fetch = async (
  repoPath: string,
  username?: string,
  password?: string,
  saveCredentials?: boolean
): Promise<{ success: boolean; error?: string; needsAuth?: boolean }> => {
  try {
    // Ensure all parameters are serializable
    const safeUsername = username !== undefined ? String(username) : null;
    const safePassword = password !== undefined ? String(password) : null;
    const safeSaveCredentials = Boolean(saveCredentials);
    return await window.electronAPI.fetch(
      repoPath,
      safeUsername,
      safePassword,
      safeSaveCredentials
    );
  } catch (error) {
    console.error("Error fetching from remote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      needsAuth: false,
    };
  }
};

export const push = async (
  repoPath: string,
  username?: string,
  password?: string,
  saveCredentials?: boolean
): Promise<{ success: boolean; error?: string; needsAuth?: boolean }> => {
  try {
    // Ensure all parameters are serializable
    const safeUsername = username !== undefined ? String(username) : null;
    const safePassword = password !== undefined ? String(password) : null;
    const safeSaveCredentials = Boolean(saveCredentials);
    return await window.electronAPI.push(repoPath, safeUsername, safePassword, safeSaveCredentials);
  } catch (error) {
    console.error("Error pushing to remote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      needsAuth: false,
    };
  }
};

export const pullCurrentBranch = async (
  repoPath: string,
  username?: string,
  password?: string,
  saveCredentials?: boolean
): Promise<{ success: boolean; error?: string; needsAuth?: boolean }> => {
  try {
    // Ensure all parameters are serializable
    const safeUsername = username !== undefined ? String(username) : null;
    const safePassword = password !== undefined ? String(password) : null;
    const safeSaveCredentials = Boolean(saveCredentials);
    return await window.electronAPI.pullCurrentBranch(
      repoPath,
      safeUsername,
      safePassword,
      safeSaveCredentials
    );
  } catch (error) {
    console.error("Error pulling from remote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      needsAuth: false,
    };
  }
};

export const pullNonCurrentBranch = async (
  repoPath: string,
  branchName: string,
  username?: string,
  password?: string,
  saveCredentials?: boolean
): Promise<{ success: boolean; error?: string; needsAuth?: boolean }> => {
  try {
    // Ensure all parameters are serializable
    const safeUsername = username !== undefined ? String(username) : null;
    const safePassword = password !== undefined ? String(password) : null;
    const safeSaveCredentials = Boolean(saveCredentials);
    return await window.electronAPI.pullNonCurrentBranch(
      repoPath,
      branchName,
      safeUsername,
      safePassword,
      safeSaveCredentials
    );
  } catch (error) {
    console.error("Error pulling branch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      needsAuth: false,
    };
  }
};

export const openSelectGitRepositoryFolderDialog = async (): Promise<
  { success: true; path: string } | { success: false; error: string | null }
> => {
  try {
    return await window.electronAPI.openSelectGitRepositoryFolderDialog();
  } catch (error) {
    console.error("Error opening select git repository folder dialog:", error);
    throw error;
  }
};

export const openSelectParentFolderDialog = async (): Promise<
  { success: true; path: string } | { success: false; error: string | null }
> => {
  try {
    return await window.electronAPI.openSelectParentFolderDialog();
  } catch (error) {
    console.error("Error opening select parent folder dialog:", error);
    throw error;
  }
};

export const clone = async (
  url: string,
  destination: string,
  username?: string,
  password?: string,
  saveCredentials?: boolean
): Promise<{
  success: boolean;
  path?: string;
  error?: string;
  needsAuth?: boolean;
  needsSsh?: boolean;
  needsSshTrust?: boolean;
  sshHostname?: string;
}> => {
  try {
    // Ensure all parameters are serializable
    const safeUsername = username !== undefined ? String(username) : null;
    const safePassword = password !== undefined ? String(password) : null;
    const safeSaveCredentials = Boolean(saveCredentials);
    return await window.electronAPI.clone(
      url,
      destination,
      safeUsername,
      safePassword,
      safeSaveCredentials
    );
  } catch (error) {
    console.error("Error cloning repository:", error);
    throw error;
  }
};

export const isHostTrusted = async (
  hostname: string
): Promise<{ success: boolean; trusted?: boolean; isTrusted?: boolean; error?: string }> => {
  try {
    return await window.electronAPI.isHostTrusted(hostname);
  } catch (error) {
    console.error("Error checking if host is trusted:", error);
    throw error;
  }
};

export const trustHost = async (
  hostname: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    return await window.electronAPI.trustHost(hostname);
  } catch (error) {
    console.error("Error trusting host:", error);
    throw error;
  }
};

export const findSshKeys = async (): Promise<{
  success: boolean;
  hasKeys: boolean;
  keys?: Array<{ path: string; publicPath: string }>;
  keyPath?: string;
  publicKeyPath?: string;
}> => {
  try {
    return await window.electronAPI.findKeys();
  } catch (error) {
    console.error("Error finding SSH keys:", error);
    throw error;
  }
};

export const readSshPublicKey = async (
  publicKeyPath: string
): Promise<{ success: boolean; content?: string; error?: string }> => {
  try {
    return await window.electronAPI.readPublicKey(publicKeyPath);
  } catch (error) {
    console.error("Error reading SSH public key:", error);
    throw error;
  }
};

export const generateSshKey = async (): Promise<{
  success: boolean;
  keyPath?: string;
  publicKeyPath?: string;
  publicKey?: string;
  error?: string;
}> => {
  try {
    return await window.electronAPI.generateKey();
  } catch (error) {
    console.error("Error generating SSH key:", error);
    throw error;
  }
};

export const createRepository = async (
  parentPath: string,
  name: string
): Promise<{ success: boolean; path?: string; error?: string }> => {
  try {
    return await window.electronAPI.createRepository(parentPath, name);
  } catch (error) {
    console.error("Error creating repository:", error);
    throw error;
  }
};

export const getGlobalConfig = async (): Promise<{
  success: boolean;
  userName?: string;
  userEmail?: string;
  error?: string;
}> => {
  try {
    return await window.electronAPI.getGlobalConfig();
  } catch (error) {
    console.error("Error getting global config:", error);
    throw error;
  }
};

export const setGlobalConfig = async (
  userName: string,
  userEmail: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    return await window.electronAPI.setGlobalConfig(userName, userEmail);
  } catch (error) {
    console.error("Error setting global config:", error);
    throw error;
  }
};

export const getRemoteUrl = async (
  repoPath: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    return await window.electronAPI.getRemoteUrl(repoPath);
  } catch (error) {
    console.error("Error getting remote URL:", error);
    throw error;
  }
};
