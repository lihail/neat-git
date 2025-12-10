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
}

export interface DiffLine {
  type: "add" | "delete" | "context";
  content: string;
  lineNumber: number;
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
 * Get the current branch name via IPC
 */
export async function getCurrentBranch(repoPath: string): Promise<string> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return "main";
  }

  try {
    const branch = await window.ipcRenderer.invoke(
      "git:currentBranch",
      repoPath
    );
    return branch || "main";
  } catch (error) {
    console.error("Error getting current branch:", error);
    throw error;
  }
}

/**
 * List all local branches via IPC
 */
export async function listBranches(repoPath: string): Promise<Branch[]> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return [];
  }

  try {
    const branches = await window.ipcRenderer.invoke(
      "git:listBranches",
      repoPath
    );
    return branches || [];
  } catch (error) {
    console.error("Error listing branches:", error);
    throw error;
  }
}

/**
 * Get git status - list all changed files with their staging status
 */
export async function getStatus(repoPath: string): Promise<FileStatus[]> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return [];
  }

  try {
    const files = await window.ipcRenderer.invoke("git:status", repoPath);
    return files || [];
  } catch (error) {
    console.error("Error getting git status:", error);
    throw error;
  }
}

/**
 * Stage a file
 */
export async function stageFile(
  repoPath: string,
  filepath: string
): Promise<void> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.ipcRenderer.invoke("git:add", repoPath, filepath);
  } catch (error) {
    console.error("Error staging file:", error);
    throw error;
  }
}

/**
 * Unstage a file
 */
export async function unstageFile(
  repoPath: string,
  filepath: string
): Promise<void> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.ipcRenderer.invoke("git:remove", repoPath, filepath);
  } catch (error) {
    console.error("Error unstaging file:", error);
    throw error;
  }
}

/**
 * List remote branches
 */
export async function listRemoteBranches(repoPath: string): Promise<Branch[]> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return [];
  }

  try {
    const branches = await window.ipcRenderer.invoke(
      "git:listRemoteBranches",
      repoPath
    );
    return branches || [];
  } catch (error) {
    console.error("Error listing remote branches:", error);
    return [];
  }
}

/**
 * Get diff for a file
 * @param staged - If true, shows staged changes (HEAD vs staging area). If false, shows unstaged changes (staging area vs working directory)
 * @param contextLines - Number of context lines to show around changes (999999 for full file, 3 for hunks)
 */
export async function getDiff(
  repoPath: string,
  filepath: string,
  staged: boolean = false,
  contextLines: number = 999999
): Promise<DiffLine[]> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return [];
  }

  try {
    const diff = await window.ipcRenderer.invoke(
      "git:diff",
      repoPath,
      filepath,
      staged,
      contextLines
    );
    return diff || [];
  } catch (error) {
    console.error("Error getting diff:", error);
    throw error;
  }
}

/**
 * Create a new branch and checkout to it
 */
export async function createBranch(
  repoPath: string,
  branchName: string
): Promise<void> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.ipcRenderer.invoke("git:createBranch", repoPath, branchName);
  } catch (error) {
    console.error("Error creating branch:", error);
    throw error;
  }
}

/**
 * Checkout an existing branch
 */
export async function checkoutBranch(
  repoPath: string,
  branchName: string
): Promise<void> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.ipcRenderer.invoke("git:checkout", repoPath, branchName);
  } catch (error) {
    console.error("Error checking out branch:", error);
    throw error;
  }
}

/**
 * Delete a branch
 */
export async function deleteBranch(
  repoPath: string,
  branchName: string
): Promise<void> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.ipcRenderer.invoke("git:deleteBranch", repoPath, branchName);
  } catch (error) {
    console.error("Error deleting branch:", error);
    throw error;
  }
}

/**
 * Rename a branch
 */
export async function renameBranch(
  repoPath: string,
  oldName: string,
  newName: string,
  alsoRenameRemote: boolean
): Promise<void> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.ipcRenderer.invoke(
      "git:renameBranch",
      repoPath,
      oldName,
      newName,
      alsoRenameRemote
    );
  } catch (error) {
    console.error("Error renaming branch:", error);
    throw error;
  }
}

/**
 * Stage all files
 */
export async function stageAll(repoPath: string): Promise<void> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.ipcRenderer.invoke("git:add", repoPath, ".");
  } catch (error) {
    console.error("Error staging all files:", error);
    throw error;
  }
}

/**
 * Unstage all files
 */
export async function unstageAll(repoPath: string): Promise<void> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.ipcRenderer.invoke("git:resetHead", repoPath);
  } catch (error) {
    console.error("Error unstaging all files:", error);
    throw error;
  }
}

/**
 * Get commit history
 */
export async function getCommitHistory(
  repoPath: string,
  limit: number = 50
): Promise<Commit[]> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return [];
  }

  try {
    const commits = await window.ipcRenderer.invoke("git:log", repoPath, limit);
    return commits || [];
  } catch (error) {
    console.error("Error getting commit history:", error);
    throw error;
  }
}

/**
 * Commit staged changes
 */
export async function commit(
  repoPath: string,
  message: string,
  description?: string
): Promise<{ success: boolean; sha: string }> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, sha: "" };
  }

  try {
    const result = await window.ipcRenderer.invoke(
      "git:commit",
      repoPath,
      message,
      description
    );
    return result;
  } catch (error) {
    console.error("Error committing:", error);
    throw error;
  }
}

/**
 * Stash all changes (staged and unstaged)
 */
export async function stash(
  repoPath: string,
  message: string
): Promise<{ success: boolean; message: string }> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, message: "Electron API not available" };
  }

  try {
    const result = await window.ipcRenderer.invoke(
      "git:stash",
      repoPath,
      message
    );
    return result;
  } catch (error) {
    console.error("Error stashing changes:", error);
    throw error;
  }
}

/**
 * List all stashes
 */
export async function listStashes(repoPath: string): Promise<Stash[]> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return [];
  }

  try {
    const stashes = await window.ipcRenderer.invoke(
      "git:listStashes",
      repoPath
    );
    return stashes || [];
  } catch (error) {
    console.error("Error listing stashes:", error);
    throw error;
  }
}

/**
 * Pop a stash (restore and delete)
 */
export async function popStash(
  repoPath: string,
  index: number
): Promise<{ success: boolean; message: string }> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, message: "Electron API not available" };
  }

  try {
    const result = await window.ipcRenderer.invoke(
      "git:popStash",
      repoPath,
      index
    );
    return result;
  } catch (error) {
    console.error("Error popping stash:", error);
    throw error;
  }
}

/**
 * Delete a stash
 */
export async function deleteStash(
  repoPath: string,
  index: number
): Promise<{ success: boolean; message: string }> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, message: "Electron API not available" };
  }

  try {
    const result = await window.ipcRenderer.invoke(
      "git:deleteStash",
      repoPath,
      index
    );
    return result;
  } catch (error) {
    console.error("Error deleting stash:", error);
    throw error;
  }
}

/**
 * Stage specific lines from a file
 */
export async function stageLines(
  repoPath: string,
  filepath: string,
  lines: DiffLine[]
): Promise<void> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.ipcRenderer.invoke(
      "git:stageLines",
      repoPath,
      filepath,
      lines
    );
  } catch (error) {
    console.error("Error staging lines:", error);
    throw error;
  }
}

/**
 * Unstage specific lines from a file
 */
export async function unstageLines(
  repoPath: string,
  filepath: string,
  lines: DiffLine[]
): Promise<void> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return;
  }

  try {
    await window.ipcRenderer.invoke(
      "git:unstageLines",
      repoPath,
      filepath,
      lines
    );
  } catch (error) {
    console.error("Error unstaging lines:", error);
    throw error;
  }
}

/**
 * Fetch from remote repository
 */
export async function fetchFromRemote(
  repoPath: string,
  username?: string,
  password?: string,
  saveCredentials: boolean = true
): Promise<{ success: boolean; error?: string; needsAuth?: boolean }> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, error: "Electron API not available" };
  }

  try {
    // Ensure all parameters are serializable primitives
    // Convert undefined to null as Electron's structured clone may have issues with undefined
    const safeRepoPath = String(repoPath);
    const safeUsername = username !== undefined ? String(username) : null;
    const safePassword = password !== undefined ? String(password) : null;
    const safeSaveCredentials = Boolean(saveCredentials);

    const result = await window.ipcRenderer.invoke(
      "git:fetch",
      safeRepoPath,
      safeUsername,
      safePassword,
      safeSaveCredentials
    );
    return result;
  } catch (error) {
    console.error("Error fetching from remote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      needsAuth: false,
    };
  }
}

/**
 * Push to remote repository
 */
export async function pushToRemote(
  repoPath: string,
  username?: string,
  password?: string,
  saveCredentials: boolean = true
): Promise<{ success: boolean; error?: string; needsAuth?: boolean }> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, error: "Electron API not available" };
  }

  try {
    // Ensure all parameters are serializable primitives
    // Convert undefined to null as Electron's structured clone may have issues with undefined
    const safeRepoPath = String(repoPath);
    const safeUsername = username !== undefined ? String(username) : null;
    const safePassword = password !== undefined ? String(password) : null;
    const safeSaveCredentials = Boolean(saveCredentials);

    const result = await window.ipcRenderer.invoke(
      "git:push",
      safeRepoPath,
      safeUsername,
      safePassword,
      safeSaveCredentials
    );
    return result;
  } catch (error) {
    console.error("Error pushing to remote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      needsAuth: false,
    };
  }
}

/**
 * Pull from remote repository
 */
export async function pullFromRemote(
  repoPath: string,
  username?: string,
  password?: string,
  saveCredentials: boolean = true
): Promise<{ success: boolean; error?: string; needsAuth?: boolean }> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, error: "Electron API not available" };
  }

  try {
    // Ensure all parameters are serializable primitives
    // Convert undefined to null as Electron's structured clone may have issues with undefined
    const safeRepoPath = String(repoPath);
    const safeUsername = username !== undefined ? String(username) : null;
    const safePassword = password !== undefined ? String(password) : null;
    const safeSaveCredentials = Boolean(saveCredentials);

    const result = await window.ipcRenderer.invoke(
      "git:pull",
      safeRepoPath,
      safeUsername,
      safePassword,
      safeSaveCredentials
    );
    return result;
  } catch (error) {
    console.error("Error pulling from remote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      needsAuth: false,
    };
  }
}

/**
 * Pull a specific branch without checking it out
 * This fetches the branch and updates the local ref without affecting the working directory
 */
export async function pullBranch(
  repoPath: string,
  branchName: string,
  username?: string,
  password?: string,
  saveCredentials: boolean = true
): Promise<{ success: boolean; error?: string; needsAuth?: boolean }> {
  if (typeof window === "undefined" || !window.electronAPI) {
    console.warn("Electron API not available");
    return { success: false, error: "Electron API not available" };
  }

  try {
    // Ensure all parameters are serializable primitives
    const safeRepoPath = String(repoPath);
    const safeBranchName = String(branchName);
    const safeUsername = username !== undefined ? String(username) : null;
    const safePassword = password !== undefined ? String(password) : null;
    const safeSaveCredentials = Boolean(saveCredentials);

    const result = await window.ipcRenderer.invoke(
      "git:pullBranch",
      safeRepoPath,
      safeBranchName,
      safeUsername,
      safePassword,
      safeSaveCredentials
    );
    return result;
  } catch (error) {
    console.error("Error pulling branch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      needsAuth: false,
    };
  }
}
