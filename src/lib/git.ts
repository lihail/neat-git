export interface Branch {
  name: string;
  current?: boolean;
  behind?: number;
  ahead?: number;
  hasUpstream?: boolean;
  upstream?: string; // actual upstream branch name (e.g., "origin/main")
}

export interface FileStatus {
  path: string;
  status: "modified" | "added" | "deleted";
  hasStaged: boolean; // Has staged changes
  hasUnstaged: boolean; // Has unstaged changes
  oldPath?: string; // Original path before rename
  unstagedStatus?: "modified" | "added" | "deleted"; // Status for unstaged section (when different from staged)
}

export interface DiffLine {
  type: "add" | "delete" | "context";
  content: string;
  lineNumber: number;
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

/**
 * Get the current branch name
 */
export const getCurrentBranch = async (repoPath: string): Promise<string> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return "main";
  }

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
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return [];
  }

  try {
    const branches = await window.electronAPI.listBranches(repoPath);
    return branches || [];
  } catch (error) {
    console.error("Error listing branches:", error);
    throw error;
  }
};

/**
 * Get git status - list all changed files with their staging status
 */
export const getStatus = async (repoPath: string): Promise<FileStatus[]> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return [];
  }

  try {
    const files = await window.electronAPI.getStatus(repoPath);
    return files || [];
  } catch (error) {
    console.error("Error getting git status:", error);
    throw error;
  }
};

/**
 * Stage a file
 */
export const stageFile = async (repoPath: string, filepath: string): Promise<void> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.electronAPI.stageFile(repoPath, filepath);
  } catch (error) {
    console.error("Error staging file:", error);
    throw error;
  }
};

/**
 * Unstage a change
 */
export const unstageChange = async (
  repoPath: string,
  filepath: string,
  oldFilePath?: string
): Promise<void> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    // Ensure all parameters are serializable primitives
    const safeOldFilePath = oldFilePath !== undefined ? String(oldFilePath) : null;
    await window.electronAPI.unstageChange(repoPath, filepath, safeOldFilePath);
  } catch (error) {
    console.error("Error unstaging change:", error);
    throw error;
  }
};

/**
 * List remote branches
 */
export const listRemoteBranches = async (repoPath: string): Promise<Branch[]> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return [];
  }

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
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return [];
  }

  try {
    // Ensure all parameters are serializable primitives
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
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.electronAPI.createBranch(repoPath, branchName);
  } catch (error) {
    console.error("Error creating branch:", error);
    throw error;
  }
};

/**
 * Checkout an existing branch
 */
export const checkoutBranch = async (repoPath: string, branchName: string): Promise<void> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.electronAPI.checkout(repoPath, branchName);
  } catch (error) {
    console.error("Error checking out branch:", error);
    throw error;
  }
};

/**
 * Delete a branch
 */
export const deleteBranch = async (repoPath: string, branchName: string): Promise<void> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.electronAPI.deleteBranch(repoPath, branchName);
  } catch (error) {
    console.error("Error deleting branch:", error);
    throw error;
  }
};

/**
 * Rename a branch
 */
export const renameBranch = async (
  repoPath: string,
  oldName: string,
  newName: string,
  alsoRenameRemote: boolean
): Promise<void> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.electronAPI.renameBranch(repoPath, oldName, newName, alsoRenameRemote);
  } catch (error) {
    console.error("Error renaming branch:", error);
    throw error;
  }
};

/**
 * Stage all files
 */
export const stageAll = async (repoPath: string): Promise<void> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.electronAPI.stageFile(repoPath, ".");
  } catch (error) {
    console.error("Error staging all files:", error);
    throw error;
  }
};

/**
 * Unstage all files
 */
export const unstageAll = async (repoPath: string): Promise<void> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.electronAPI.unstageAllFiles(repoPath);
  } catch (error) {
    console.error("Error unstaging all files:", error);
    throw error;
  }
};

/**
 * Get commit history
 */
export const getCommitHistory = async (repoPath: string, limit: number = 50): Promise<Commit[]> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return [];
  }

  try {
    const commits = await window.electronAPI.log(repoPath, limit);
    return commits || [];
  } catch (error) {
    console.error("Error getting commit history:", error);
    throw error;
  }
};

/**
 * Commit staged changes
 */
export const commit = async (
  repoPath: string,
  message: string,
  description?: string
): Promise<{ success: boolean; sha: string }> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, sha: "" };
  }

  try {
    // Ensure all parameters are serializable primitives
    const safeDescription = description !== undefined ? String(description) : null;
    return await window.electronAPI.commit(repoPath, message, safeDescription);
  } catch (error) {
    console.error("Error committing:", error);
    throw error;
  }
};

/**
 * Stash all changes (staged and unstaged)
 */
export const stash = async (
  repoPath: string,
  message: string
): Promise<{ success: boolean; message: string }> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, message: "Electron API not available" };
  }

  try {
    return await window.electronAPI.stash(repoPath, message);
  } catch (error) {
    console.error("Error stashing changes:", error);
    throw error;
  }
};

/**
 * List all stashes
 */
export const listStashes = async (repoPath: string): Promise<Stash[]> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return [];
  }

  try {
    const stashes = await window.electronAPI.listStashes(repoPath);
    return stashes || [];
  } catch (error) {
    console.error("Error listing stashes:", error);
    throw error;
  }
};

/**
 * Pop a stash (restore and delete)
 */
export const popStash = async (
  repoPath: string,
  index: number
): Promise<{ success: boolean; message: string }> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, message: "Electron API not available" };
  }

  try {
    return await window.electronAPI.popStash(repoPath, index);
  } catch (error) {
    console.error("Error popping stash:", error);
    throw error;
  }
};

/**
 * Delete a stash
 */
export const deleteStash = async (
  repoPath: string,
  index: number
): Promise<{ success: boolean; message: string }> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, message: "Electron API not available" };
  }

  try {
    return await window.electronAPI.deleteStash(repoPath, index);
  } catch (error) {
    console.error("Error deleting stash:", error);
    throw error;
  }
};

/**
 * Stage specific lines from a file
 */
export const stageLines = async (
  repoPath: string,
  filepath: string,
  lines: DiffLine[]
): Promise<void> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.electronAPI.stageLines(repoPath, filepath, lines);
  } catch (error) {
    console.error("Error staging lines:", error);
    throw error;
  }
};

/**
 * Unstage specific lines from a file
 */
export const unstageLines = async (
  repoPath: string,
  filepath: string,
  lines: DiffLine[]
): Promise<void> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.electronAPI.unstageLines(repoPath, filepath, lines);
  } catch (error) {
    console.error("Error unstaging lines:", error);
    throw error;
  }
};

/**
 * Fetch from remote repository
 */
export const fetchFromRemote = async (
  repoPath: string,
  username?: string,
  password?: string,
  saveCredentials?: boolean
): Promise<{ success: boolean; error?: string; needsAuth?: boolean }> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, error: "Electron API not available" };
  }

  try {
    // Ensure all parameters are serializable primitives
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

/**
 * Push to remote repository
 */
export const pushToRemote = async (
  repoPath: string,
  username?: string,
  password?: string,
  saveCredentials?: boolean
): Promise<{ success: boolean; error?: string; needsAuth?: boolean }> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, error: "Electron API not available" };
  }

  try {
    // Ensure all parameters are serializable primitives
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

/**
 * Pull from remote repository
 */
export const pullFromRemote = async (
  repoPath: string,
  username?: string,
  password?: string,
  saveCredentials?: boolean
): Promise<{ success: boolean; error?: string; needsAuth?: boolean }> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, error: "Electron API not available" };
  }

  try {
    // Ensure all parameters are serializable primitives
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

/**
 * Pull a specific branch without checking it out
 * This fetches the branch and updates the local ref without affecting the working directory
 */
export const pullNonCurrentBranch = async (
  repoPath: string,
  branchName: string,
  username?: string,
  password?: string,
  saveCredentials?: boolean
): Promise<{ success: boolean; error?: string; needsAuth?: boolean }> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, error: "Electron API not available" };
  }

  try {
    // Ensure all parameters are serializable primitives
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
