import path from "node:path";
import fs from "node:fs";
import * as git from "isomorphic-git";
import { execGitCommand } from "../utils/dugite";
import { getCredentialHelperConfig, storeCredentials } from "../utils/credentialStore";
import { isHttpRemote } from "../utils/url";
import { getPlatform } from "../utils/platform";
import { isGitRepository } from "../utils/file";
import type { FileChange } from "../../src/types/electron";
import {
  detectUnstagedRenames,
  parseOrdinaryChange,
  parseRenameChange,
  parseUntrackedFileChange,
} from "../utils/gitStatus";

type DiffLineInfo = {
  type: string;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
};

const readGlobalConfig = async () => {
  let userName = "";
  let userEmail = "";

  const [nameResult, emailResult] = await Promise.all([
    execGitCommand(["config", "--global", "user.name"]),
    execGitCommand(["config", "--global", "user.email"]),
  ]);

  if (nameResult.success) {
    userName = nameResult.output.trim();
  }

  if (emailResult.success) {
    userEmail = emailResult.output.trim();
  }

  return {
    userName,
    userEmail,
  };
};

const getUpstreamNameOfCurrentBranch = async (repoPath: string): Promise<string | null> => {
  // This command fails if the branch has no upstream
  const result = await execGitCommand(
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
    repoPath
  );
  if (result.success) {
    return result.output.trim();
  }
  return null;
};

export const getGlobalConfig = async () => {
  try {
    const config = await readGlobalConfig();

    return {
      success: true,
      userName: config.userName,
      userEmail: config.userEmail,
    };
  } catch (error) {
    console.error("Error getting git config:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const setGlobalConfig = async (userName: string, userEmail: string) => {
  try {
    if (userName) {
      await execGitCommand(["config", "--global", "user.name", userName]);
    }

    if (userEmail) {
      await execGitCommand(["config", "--global", "user.email", userEmail]);
    }

    return { success: true };
  } catch (error) {
    console.error("Error setting git config:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getCurrentBranch = async (repoPath: string) => {
  try {
    const branch = await git.currentBranch({
      fs,
      dir: repoPath,
      fullname: false,
    });
    return branch || "main";
  } catch (error) {
    console.error("Error getting current branch:", error);
    throw error;
  }
};

export const isRepository = async (repoPath: string) => {
  try {
    return isGitRepository(repoPath);
  } catch (error) {
    console.error("Error checking repository existence:", error);
    return false;
  }
};

export const listLocalBranches = async (repoPath: string) => {
  try {
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    if (!isGitRepository(repoPath)) {
      throw new Error(`Not a valid Git repository: ${repoPath}`);
    }

    const currentBranch = await git.currentBranch({
      fs,
      dir: repoPath,
      fullname: false,
    });

    // List all local branches (not remote)
    let branchNames = await git.listBranches({
      fs,
      dir: repoPath,
    });

    // Filter out any remote branches (they start with remotes/ or origin/)
    branchNames = branchNames.filter(
      (name) => !name.startsWith("remotes/") && !name.startsWith("origin/")
    );

    // If no branches found (no commits yet), check .git/refs/heads/ for symbolic refs
    if (branchNames.length === 0) {
      const refsHeadsPath = path.join(repoPath, ".git", "refs", "heads");

      // Ensure refs/heads directory exists
      if (!fs.existsSync(refsHeadsPath)) {
        fs.mkdirSync(refsHeadsPath, { recursive: true });
      }

      // If we have a current branch, make sure it has a ref file
      if (currentBranch) {
        const branchRefPath = path.join(refsHeadsPath, currentBranch);
        if (!fs.existsSync(branchRefPath)) {
          fs.writeFileSync(branchRefPath, "");
        }
      }

      // Read all branch names from refs/heads
      const branchFiles = fs.readdirSync(refsHeadsPath);
      branchNames = branchFiles.filter((file) => {
        const filePath = path.join(refsHeadsPath, file);
        return fs.statSync(filePath).isFile();
      });

      // If still no branches but we have a current branch, add it
      if (branchNames.length === 0 && currentBranch) {
        branchNames = [currentBranch];
      }
    }

    const branches = await Promise.all(
      branchNames.map(async (name) => {
        let behind = 0;
        let ahead = 0;
        let hasUpstream = false;
        let upstreamName: string | null = null;

        try {
          // Check if branch has an upstream tracking branch using git for-each-ref
          const upstreamResult = await execGitCommand(
            ["for-each-ref", "--format=%(upstream:short)", `refs/heads/${name}`],
            repoPath
          );
          if (upstreamResult.success) {
            const trimmedResult = upstreamResult.output.trim();
            if (trimmedResult.length > 0) {
              hasUpstream = true;
              upstreamName = trimmedResult.replace(/^origin\//, "");
            }
          }

          // Try to get the tracking branch info
          const localOid = await git.resolveRef({
            fs,
            dir: repoPath,
            ref: name,
          });

          // Try to resolve the remote tracking branch
          const remoteBranchName = upstreamName
            ? `refs/remotes/origin/${upstreamName}`
            : `refs/remotes/origin/${name}`;
          try {
            const remoteOid = await git.resolveRef({
              fs,
              dir: repoPath,
              ref: remoteBranchName,
            });

            // If local and remote are the same, no need to calculate
            if (localOid === remoteOid) {
              behind = 0;
              ahead = 0;
            } else {
              // Find merge base (common ancestor)
              const mergeBase = await git.findMergeBase({
                fs,
                dir: repoPath,
                oids: [localOid, remoteOid],
              });

              // Calculate ahead: commits from merge base to local
              if (mergeBase.length > 0 && mergeBase[0] !== localOid) {
                const aheadCommits = await git.log({
                  fs,
                  dir: repoPath,
                  ref: name,
                });
                // Count commits until we hit the merge base
                ahead = aheadCommits.findIndex((c) => c.oid === mergeBase[0]);
                if (ahead === -1) {
                  ahead = aheadCommits.length;
                }
              }

              // Calculate behind: commits from merge base to remote
              if (mergeBase.length > 0 && mergeBase[0] !== remoteOid) {
                const behindCommits = await git.log({
                  fs,
                  dir: repoPath,
                  ref: remoteBranchName,
                });
                // Count commits until we hit the merge base
                behind = behindCommits.findIndex((c) => c.oid === mergeBase[0]);
                if (behind === -1) {
                  behind = behindCommits.length;
                }
              }
            }
          } catch {
            // Remote branch doesn't exist, which is fine
          }
        } catch {
          // Branch might not have any commits yet, which is fine
        }

        return {
          name,
          current: name === (currentBranch || "main"),
          behind,
          ahead,
          hasUpstream,
          upstream: upstreamName || undefined,
        };
      })
    );
    return branches;
  } catch (error) {
    console.error("Error listing branches:", error);
    console.error("Error details:", error instanceof Error ? error.stack : error);
    throw error;
  }
};

export const listRemoteBranches = async (repoPath: string) => {
  try {
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    if (!isGitRepository(repoPath)) {
      throw new Error(`Not a valid Git repository: ${repoPath}`);
    }

    // List all branches including remote
    const allBranches = await git.listBranches({
      fs,
      dir: repoPath,
      remote: "origin", // Get branches from origin remote
    });

    // The git.listBranches with remote parameter already returns only remote branches
    // without the "remotes/" or "origin/" prefix, so we just need to format them
    const remoteBranches = allBranches
      .filter((name) => name !== "HEAD") // Filter out HEAD
      .map((name) => ({
        name, // Use the branch name as-is
        current: false, // Remote branches are never "current"
      }));

    return remoteBranches;
  } catch (error) {
    console.error("Error listing remote branches:", error);
    return [];
  }
};

export const getStatus = async (repoPath: string): Promise<FileChange[]> => {
  try {
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    if (!isGitRepository(repoPath)) {
      throw new Error(`Not a valid Git repository: ${repoPath}`);
    }

    // Use git status --porcelain=v2 for rename detection
    // -M flag enables rename detection with default 50% similarity threshold
    // -uall shows each untracked file separately, not just directory names
    // -c core.fileMode=false ignores permission-only changes
    const statusResult = await execGitCommand(
      ["-c", "core.fileMode=false", "status", "--porcelain=v2", "-M", "-uall"],
      repoPath
    );
    if (!statusResult.success) {
      throw new Error(`git status failed: ${statusResult.error.message}`);
    }

    const lines = statusResult.output.trim().split("\n").filter(Boolean);
    const fileChanges: FileChange[] = [];
    const stagedFiles = new Map<string, FileChange>();

    for (const line of lines) {
      let change: FileChange | null = null;

      if (line.startsWith("1 ")) {
        change = parseOrdinaryChange(line);

        if (change.hasStaged) {
          stagedFiles.set(change.path, change);
        }
      } else if (line.startsWith("2 ")) {
        change = parseRenameChange(line);

        if (change.hasStaged) {
          stagedFiles.set(change.path, change);
          if (change.stagedOldPath) {
            stagedFiles.set(change.stagedOldPath, change);
          }
        }
      } else if (line.startsWith("? ")) {
        change = parseUntrackedFileChange(line);
      }

      if (change) {
        fileChanges.push(change);
      }
    }

    const unstagedRenames = await detectUnstagedRenames(stagedFiles, repoPath);

    const pathsToExclude = new Set<string>();

    for (const rename of unstagedRenames) {
      pathsToExclude.add(rename.path);
      if (rename.unstagedOldPath) {
        pathsToExclude.add(rename.unstagedOldPath);
      }
    }

    const filteredFileChanges: FileChange[] = [];

    // Create a new array that filters out added and deleted file changes that are part of a rename
    for (const fileChange of fileChanges) {
      if (!pathsToExclude.has(fileChange.path)) {
        filteredFileChanges.push(fileChange);
        continue;
      }
      // Remove the unstaged version of the file change
      fileChange.hasUnstaged = false;
      delete fileChange.unstagedStatus;

      if (fileChange.hasStaged) {
        filteredFileChanges.push(fileChange);
      }
    }

    return [...filteredFileChanges, ...unstagedRenames];
  } catch (error) {
    console.error("Error getting git status:", error);
    throw error;
  }
};

export const stageFile = async (repoPath: string, filepath: string, oldFilePath: string | null) => {
  const paths = oldFilePath ? [filepath, oldFilePath] : [filepath];
  try {
    const stageResult = await execGitCommand(["add", "--", ...paths], repoPath);

    if (!stageResult.success) {
      throw new Error(`Failed to stage file: ${stageResult.error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error(`Error staging file in paths ${paths.join(", ")}:`, error);
    throw error;
  }
};

export const stageAllFiles = async (repoPath: string) => {
  try {
    const stageResult = await execGitCommand(["add", "--all"], repoPath);

    if (!stageResult.success) {
      throw new Error(`Failed to stage all files: ${stageResult.error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error staging all files:", error);
    throw error;
  }
};

export const unstageChange = async (
  repoPath: string,
  filepath: string,
  oldFilePath: string | null
) => {
  const paths = oldFilePath ? [filepath, oldFilePath] : [filepath];
  try {
    const unstageResult = await execGitCommand(["reset", "HEAD", "--", ...paths], repoPath);

    if (!unstageResult.success) {
      throw new Error(`Failed to unstage change: ${unstageResult.error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error(`Error unstaging change in paths ${paths.join(", ")}:`, error);
    throw error;
  }
};

export const unstageAllFiles = async (repoPath: string) => {
  try {
    const unstageResult = await execGitCommand(["reset", "HEAD"], repoPath);

    if (!unstageResult.success) {
      throw new Error(`Failed to unstage all files: ${unstageResult.error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error unstaging all files:", error);
    throw error;
  }
};

export const createBranch = async (repoPath: string, branchName: string) => {
  try {
    // Check if there are any commits by trying to resolve HEAD
    let hasCommits = false;
    try {
      await git.resolveRef({ fs, dir: repoPath, ref: "HEAD" });
      hasCommits = true;
    } catch {
      // No commits yet
      hasCommits = false;
    }

    if (hasCommits) {
      // Repository has commits - create branch normally
      await git.branch({
        fs,
        dir: repoPath,
        ref: branchName,
      });

      await git.checkout({
        fs,
        dir: repoPath,
        ref: branchName,
      });
    } else {
      // No commits yet - just update the symbolic ref (like git checkout -b)
      const gitDir = path.join(repoPath, ".git");
      const headPath = path.join(gitDir, "HEAD");
      const refsHeadsPath = path.join(gitDir, "refs", "heads");

      // Ensure refs/heads directory exists
      if (!fs.existsSync(refsHeadsPath)) {
        fs.mkdirSync(refsHeadsPath, { recursive: true });
      }

      // Create an empty ref file for the branch so it shows up in branch list
      const branchRefPath = path.join(refsHeadsPath, branchName);
      if (!fs.existsSync(branchRefPath)) {
        fs.writeFileSync(branchRefPath, "");
      }

      // Update HEAD to point to the new branch
      fs.writeFileSync(headPath, `ref: refs/heads/${branchName}\n`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating branch:", error);
    throw error;
  }
};

export const deleteBranch = async (repoPath: string, branchName: string) => {
  try {
    // Check if there are any commits
    let hasCommits = false;
    try {
      await git.resolveRef({ fs, dir: repoPath, ref: "HEAD" });
      hasCommits = true;
    } catch {
      hasCommits = false;
    }

    if (hasCommits) {
      // Repository has commits - delete branch normally
      await git.deleteBranch({
        fs,
        dir: repoPath,
        ref: branchName,
      });
    } else {
      // No commits yet - just delete the ref file
      const gitDir = path.join(repoPath, ".git");
      const branchRefPath = path.join(gitDir, "refs", "heads", branchName);
      if (fs.existsSync(branchRefPath)) {
        fs.unlinkSync(branchRefPath);
      }
    }

    return { success: true };
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
) => {
  try {
    // Get the upstream tracking branch before renaming
    let upstreamBranch: string | null = null;
    const upstreamResult = await execGitCommand(
      ["for-each-ref", "--format=%(upstream:short)", `refs/heads/${oldName}`],
      repoPath
    );
    if (upstreamResult.success) {
      const trimmed = upstreamResult.output.trim();
      if (trimmed.length > 0) {
        upstreamBranch = trimmed;
      }
    }

    // Rename local branch
    await git.renameBranch({
      fs,
      dir: repoPath,
      oldref: oldName,
      ref: newName,
    });

    if (!upstreamBranch) {
      return { success: true };
    }

    if (alsoRenameRemote) {
      // If also renaming remote, push new branch and delete old one using git CLI
      try {
        // Extract the actual remote branch name from upstream (e.g., "origin/feature-a" -> "feature-a")
        const remoteBranchName = upstreamBranch.includes("/")
          ? upstreamBranch.split("/").slice(1).join("/")
          : upstreamBranch;

        // Extract remote name (e.g., "origin")
        const remoteName = upstreamBranch.includes("/") ? upstreamBranch.split("/")[0] : "origin";

        // Push the new branch to remote with upstream tracking
        const pushResult = await execGitCommand(["push", "-u", remoteName, newName], repoPath);
        if (!pushResult.success) {
          throw new Error(`Failed to push branch during rename: ${pushResult.error.message}`);
        }

        // Delete the old branch from remote using the actual remote branch name
        const deleteResult = await execGitCommand(
          ["push", remoteName, "--delete", remoteBranchName],
          repoPath
        );
        if (!deleteResult.success) {
          // Check if the error is due to trying to delete the default branch
          if (deleteResult.error.message.includes("refusing to delete the current branch")) {
            throw new Error(
              `Local branch renamed to "${newName}" and pushed to remote, but could not delete old branch "${remoteBranchName}" because it is the default branch on the remote. Please change the default branch on your Git hosting service first, then delete "${remoteBranchName}" manually.`
            );
          }
          throw new Error(
            `Failed to delete remote branch during rename: ${deleteResult.error.message}`
          );
        }
      } catch (remoteError) {
        console.error("Error renaming branch on remote:", remoteError);
        throw remoteError;
      }
    } else {
      // Not renaming on remote, just restore the existing upstream tracking
      const setUpstreamResult = await execGitCommand(
        ["branch", `--set-upstream-to=${upstreamBranch}`, newName],
        repoPath
      );
      if (!setUpstreamResult.success) {
        console.error(
          "Error restoring upstream tracking during rename:",
          setUpstreamResult.error.message
        );
        // Don't fail the whole operation if this fails
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error renaming branch:", error);
    throw error;
  }
};

export const checkout = async (repoPath: string, branchName: string) => {
  try {
    // Check if there are any commits
    let hasCommits = false;
    try {
      await git.resolveRef({ fs, dir: repoPath, ref: "HEAD" });
      hasCommits = true;
    } catch {
      hasCommits = false;
    }

    if (hasCommits) {
      // Repository has commits - need to determine if this is local or remote branch

      // Check if local branch exists
      let localBranchExists = false;
      try {
        await git.resolveRef({
          fs,
          dir: repoPath,
          ref: `refs/heads/${branchName}`,
        });
        localBranchExists = true;
      } catch {
        localBranchExists = false;
      }

      if (localBranchExists) {
        // Local branch exists - checkout using git CLI to ensure index is properly reset
        const checkoutResult = await execGitCommand(["checkout", branchName], repoPath);
        if (!checkoutResult.success) {
          console.error("Error checking out branch:", checkoutResult.error.message);
          throw new Error(`Failed to checkout branch: ${checkoutResult.error.message}`);
        }
      } else {
        // Local branch doesn't exist - check if remote branch exists
        let remoteBranchExists = false;
        try {
          await git.resolveRef({
            fs,
            dir: repoPath,
            ref: `refs/remotes/origin/${branchName}`,
          });
          remoteBranchExists = true;
        } catch {
          remoteBranchExists = false;
        }

        if (remoteBranchExists) {
          // Remote branch exists - create local tracking branch and checkout
          const checkoutResult = await execGitCommand(
            ["checkout", "-b", branchName, `origin/${branchName}`],
            repoPath
          );
          if (!checkoutResult.success) {
            console.error("Error creating tracking branch:", checkoutResult.error.message);
            throw new Error(`Failed to checkout remote branch: ${checkoutResult.error.message}`);
          }
        } else {
          // Neither local nor remote branch exists
          throw new Error(`Branch '${branchName}' not found (checked both local and remote)`);
        }
      }
    } else {
      // No commits yet - just update the symbolic ref
      const gitDir = path.join(repoPath, ".git");
      const headPath = path.join(gitDir, "HEAD");
      fs.writeFileSync(headPath, `ref: refs/heads/${branchName}\n`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error checking out branch:", error);
    throw error;
  }
};

export const commit = async (repoPath: string, message: string, description: string | null) => {
  try {
    // Check status matrix to see what's staged
    const statusMatrix = await git.statusMatrix({
      fs,
      dir: repoPath,
    });

    // Check if there are actually staged changes
    const hasStagedChanges = statusMatrix.some(([_, head, _workdir, stage]) => {
      // Staged changes have stage !== head
      return stage !== head;
    });

    if (!hasStagedChanges) {
      return { success: false, message: "No changes staged for commit" };
    }

    // Combine message and description
    const fullMessage = description ? `${message}\n\n${description}` : message;

    const config = await readGlobalConfig();
    const authorName = config.userName || "User";
    const authorEmail = config.userEmail || "user@example.com";

    const sha = await git.commit({
      fs,
      dir: repoPath,
      message: fullMessage,
      author: {
        name: authorName,
        email: authorEmail,
      },
    });

    return { success: true, sha };
  } catch (error) {
    console.error("Error committing:", error);
    throw error;
  }
};

export const log = async (repoPath: string, limit: number = 50) => {
  try {
    // Check if there are any commits by trying to resolve HEAD
    try {
      await git.resolveRef({ fs, dir: repoPath, ref: "HEAD" });
    } catch {
      // No commits yet or HEAD doesn't exist
      return [];
    }

    const commits = await git.log({
      fs,
      dir: repoPath,
      ref: "HEAD", // Explicitly use HEAD to get current branch commits
      depth: limit,
    });

    return commits.map((commit) => ({
      sha: commit.oid,
      message: commit.commit.message,
      author: commit.commit.author.name,
      email: commit.commit.author.email,
      date: new Date(commit.commit.author.timestamp * 1000).toISOString(),
      timestamp: commit.commit.author.timestamp,
    }));
  } catch (error) {
    // If there are any other errors, log and return empty array
    if (error instanceof Error && error.message.includes("NotFoundError")) {
      // Branch reference not found, return empty
      return [];
    }
    return [];
  }
};

export const getDiff = async (
  repoPath: string,
  filepath: string,
  staged: boolean = false,
  contextLines: number = 999999,
  oldFilePath: string | null
) => {
  try {
    const diffArgs = ["diff"];

    if (staged && oldFilePath) {
      // Staged rename
      diffArgs.push(`-U${contextLines}`, `HEAD:${oldFilePath}`, `:${filepath}`);
    } else if (!staged && oldFilePath) {
      // Unstaged rename
      diffArgs.push(`-U${contextLines}`, `HEAD:${oldFilePath}`, `${filepath}`);
    } else if (staged && !oldFilePath) {
      // Staged non rename change
      diffArgs.push("--cached", `-U${contextLines}`, "--", filepath);
    } else {
      // Unstaged non rename change
      diffArgs.push(`-U${contextLines}`, "--", filepath);
    }

    const diffResult = await execGitCommand(diffArgs, repoPath);
    if (!diffResult.success) {
      return [];
    }
    const diffOutput = diffResult.output.trim();

    if (!diffOutput) {
      const isPureRename = Boolean(oldFilePath);
      if (isPureRename) {
        return [];
      }

      // Check if file is new/untracked by checking if it exists in git
      const fullPath = path.join(repoPath, filepath);
      if (fs.existsSync(fullPath)) {
        try {
          // Try to get file from HEAD
          const headOid = await git.resolveRef({
            fs,
            dir: repoPath,
            ref: "HEAD",
          });
          await git.readBlob({
            fs,
            dir: repoPath,
            oid: headOid,
            filepath,
          });
          // File exists in HEAD, so no changes
          return [];
        } catch {
          // File doesn't exist in HEAD - it's a new file
          // Show entire file as added
          const content = fs.readFileSync(fullPath, "utf8");
          const lines = content.split("\n");
          return lines.map((line, index) => ({
            type: "add" as const,
            content: line,
            lineNumber: index + 1,
            newLineNumber: index + 1,
          }));
        }
      }
      return [];
    }

    // Parse the unified diff format
    const diffLines: Array<{
      type: "add" | "delete" | "context";
      content: string;
      lineNumber: number;
      oldLineNumber?: number;
      newLineNumber?: number;
      hunkIndex?: number;
      hunkHeader?: string;
    }> = [];

    const lines = diffOutput.split("\n");
    let oldLineNumber = 0;
    let newLineNumber = 0;
    let inHunk = false;
    let hunkIndex = -1;
    let currentHunkHeader = "";
    let lastLineType: "add" | "delete" | "context" | null = null;
    let oldFileHadNoNewline = false;
    let newFileHasNoNewline = false;
    let isNewFile = false;
    let isDeletedFile = false;

    for (const line of lines) {
      // Check for new/deleted file indicators before skipping headers
      if (line === "--- /dev/null") {
        isNewFile = true;
      }
      if (line === "+++ /dev/null") {
        isDeletedFile = true;
      }

      // Skip diff headers
      if (
        line.startsWith("diff --git") ||
        line.startsWith("index ") ||
        line.startsWith("---") ||
        line.startsWith("+++")
      ) {
        continue;
      }

      // Parse hunk header (@@ -1,5 +1,6 @@)
      if (line.startsWith("@@")) {
        inHunk = true;
        hunkIndex++;
        currentHunkHeader = line;
        // Extract starting line numbers from hunk header: @@ -oldStart,oldCount +newStart,newCount @@
        const match = line.match(/@@\s*-(\d+)(?:,\d+)?\s+\+(\d+)/);
        if (match) {
          oldLineNumber = parseInt(match[1]) - 1; // Will be incremented for first line
          newLineNumber = parseInt(match[2]) - 1; // Will be incremented for first line
        }
        continue;
      }

      if (!inHunk) {
        continue;
      }

      // Handle "\ No newline at end of file" marker
      if (line.startsWith("\\")) {
        // The marker applies to the previous line type
        if (lastLineType === "delete" || lastLineType === "context") {
          oldFileHadNoNewline = true;
        }
        if (lastLineType === "add" || lastLineType === "context") {
          newFileHasNoNewline = true;
        }
        continue;
      }

      // Parse diff lines
      if (line.startsWith("+")) {
        // Added line - increment and use new line number
        newLineNumber++;
        diffLines.push({
          type: "add",
          content: line.substring(1), // Remove the + prefix
          lineNumber: newLineNumber,
          newLineNumber,
          hunkIndex,
          hunkHeader: currentHunkHeader,
        });
        lastLineType = "add";
      } else if (line.startsWith("-")) {
        // Deleted line - increment and use old line number
        oldLineNumber++;
        diffLines.push({
          type: "delete",
          content: line.substring(1), // Remove the - prefix
          lineNumber: oldLineNumber,
          oldLineNumber,
          hunkIndex,
          hunkHeader: currentHunkHeader,
        });
        lastLineType = "delete";
      } else if (line.startsWith(" ")) {
        // Context line (unchanged) - increment both
        oldLineNumber++;
        newLineNumber++;
        diffLines.push({
          type: "context",
          content: line.substring(1), // Remove the space prefix
          lineNumber: newLineNumber,
          oldLineNumber,
          newLineNumber,
          hunkIndex,
          hunkHeader: currentHunkHeader,
        });
        lastLineType = "context";
      }
      // Note: Empty strings from split("\n") are ignored - actual empty lines
      // in the file have a space prefix in unified diff format
    }

    // Handle trailing newline-only changes: when git shows -line/+line with identical
    // content, it means only the trailing newline status changed. Convert to context line.
    // This can happen anywhere in the diff when a file's trailing newline changes.
    for (let i = 0; i < diffLines.length - 1; i++) {
      const currentLine = diffLines[i];
      const nextLine = diffLines[i + 1];

      if (
        currentLine.type === "delete" &&
        nextLine.type === "add" &&
        currentLine.content === nextLine.content
      ) {
        // This is a trailing newline-only change - convert to context
        const contextLine = {
          type: "context" as const,
          content: nextLine.content,
          lineNumber: nextLine.newLineNumber!,
          oldLineNumber: currentLine.oldLineNumber,
          newLineNumber: nextLine.newLineNumber,
          hunkIndex: nextLine.hunkIndex,
          hunkHeader: nextLine.hunkHeader,
        };
        // Replace the delete+add pair with a single context line
        diffLines.splice(i, 2, contextLine);
        // Don't increment i since we replaced 2 items with 1
      }
    }

    // Handle trailing newline representation to match editor line count
    const oldHadTrailingNewline = !oldFileHadNoNewline;
    const newHasTrailingNewline = !newFileHasNoNewline;

    // Case 1: Deleted file - show trailing empty line if old file had one
    if (isDeletedFile) {
      if (oldHadTrailingNewline) {
        oldLineNumber++;
        diffLines.push({
          type: "delete",
          content: "",
          lineNumber: oldLineNumber,
          oldLineNumber,
          hunkIndex,
          hunkHeader: currentHunkHeader,
        });
      }
    }
    // Case 2: New file - show trailing empty line if new file has one
    else if (isNewFile) {
      if (newHasTrailingNewline) {
        newLineNumber++;
        diffLines.push({
          type: "add",
          content: "",
          lineNumber: newLineNumber,
          newLineNumber,
          hunkIndex,
          hunkHeader: currentHunkHeader,
        });
      }
    }
    // Case 3: Modified file - handle based on what changed
    else {
      // Check if the diff ends with additions - if so, the old trailing newline
      // is preserved as the line terminator for the original last line
      const lastDiffLine = diffLines[diffLines.length - 1];
      const endsWithAdditions = lastDiffLine?.type === "add";

      // If old had trailing newline, show it (as delete if removed, or context if kept)
      if (oldHadTrailingNewline && !newHasTrailingNewline) {
        // Only show deleted empty line if no new content was added at the end
        // If content was added, the old trailing newline is preserved as part of
        // the existing file structure
        if (!endsWithAdditions) {
          // Trailing newline was removed without adding new content - show deleted empty line
          oldLineNumber++;
          diffLines.push({
            type: "delete",
            content: "",
            lineNumber: oldLineNumber,
            oldLineNumber,
            hunkIndex,
            hunkHeader: currentHunkHeader,
          });
        }
      } else if (!oldHadTrailingNewline && newHasTrailingNewline) {
        // Trailing newline was added - show added empty line
        newLineNumber++;
        diffLines.push({
          type: "add",
          content: "",
          lineNumber: newLineNumber,
          newLineNumber,
          hunkIndex,
          hunkHeader: currentHunkHeader,
        });
      } else if (oldHadTrailingNewline && newHasTrailingNewline) {
        // Both have trailing newline - show context empty line to match editor line count
        oldLineNumber++;
        newLineNumber++;
        diffLines.push({
          type: "context",
          content: "",
          lineNumber: newLineNumber,
          oldLineNumber,
          newLineNumber,
          hunkIndex,
          hunkHeader: currentHunkHeader,
        });
      }
      // If neither has trailing newline, no extra line needed
    }

    return diffLines;
  } catch (error) {
    console.error("Error getting diff:", error);
    throw error;
  }
};

export const listStashes = async (repoPath: string) => {
  try {
    const stashList = (await git.stash({ fs, dir: repoPath, op: "list" })) as
      | Array<{ reflogId: string; message: string }>
      | undefined;

    if (!stashList || stashList.length === 0) {
      return [];
    }

    const stashes: Array<{
      index: number;
      message: string;
      date: string;
      sha: string;
    }> = [];

    // Read reflog to get timestamps and SHAs
    const gitDir = path.join(repoPath, ".git");
    const reflogPath = path.join(gitDir, "logs", "refs", "stash");

    const reflogEntries: Array<{ sha: string; timestamp: number }> = [];
    if (fs.existsSync(reflogPath)) {
      const reflogContent = fs.readFileSync(reflogPath, "utf8");
      const lines = reflogContent.trim().split("\n").filter(Boolean);

      // Parse reflog entries (oldest first in file, we want newest first)
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const match = line.match(/^[a-f0-9]+ ([a-f0-9]+) .+ (\d+) [+-]\d+\t/);
        if (match) {
          reflogEntries.push({
            sha: match[1],
            timestamp: parseInt(match[2]) * 1000,
          });
        }
      }
    }

    for (let i = 0; i < stashList.length; i++) {
      const entry = stashList[i];
      const reflogEntry = reflogEntries[i];

      let dateStr = "";
      let sha = "";

      if (reflogEntry) {
        sha = reflogEntry.sha;
        const timestamp = reflogEntry.timestamp;
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) {
          dateStr = "just now";
        } else if (minutes < 60) {
          dateStr = `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
        } else if (hours < 24) {
          dateStr = `${hours} hour${hours !== 1 ? "s" : ""} ago`;
        } else if (days === 1) {
          dateStr = "1 day ago";
        } else {
          dateStr = `${days} days ago`;
        }
      }

      const message = entry.message || entry.reflogId || "Stash";
      stashes.push({
        index: i,
        message: message.replace(/^WIP on .+?: /, "").replace(/^On .+?: /, ""),
        date: dateStr,
        sha,
      });
    }

    return stashes;
  } catch (error) {
    console.error("Error listing stashes:", error);
    return [];
  }
};

export const stash = async (repoPath: string, message: string) => {
  try {
    const statusMatrix = await git.statusMatrix({
      fs,
      dir: repoPath,
    });

    const hasChanges = statusMatrix.some(([_, head, workdir, stage]) => {
      return !(head === 1 && workdir === 1 && stage === 1);
    });

    if (!hasChanges) {
      return { success: false, message: "No changes to stash" };
    }

    await execGitCommand(["stash", "push", "--include-untracked", "-m", message], repoPath);

    // Fix isomorphic-git's reflog entry (it has bugs with chaining and author format)
    const gitDir = path.join(repoPath, ".git");
    const reflogPath = path.join(gitDir, "logs", "refs", "stash");

    if (fs.existsSync(reflogPath)) {
      const reflogContent = fs.readFileSync(reflogPath, "utf8");
      const lines = reflogContent.trim().split("\n");

      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];

        // Get previous stash SHA for proper chaining
        let prevSha = "0000000000000000000000000000000000000000";
        if (lines.length > 1) {
          const prevMatch = lines[lines.length - 2].match(/^[a-f0-9]+ ([a-f0-9]+)/);
          if (prevMatch) {
            prevSha = prevMatch[1];
          }
        }

        // Fix the last entry: proper chaining + author format with angle brackets
        // Format: <old-sha> <new-sha> <author> <timestamp> <tz>\t<message>
        const match = lastLine.match(/^[a-f0-9]+ ([a-f0-9]+) (.+?) (\d+ [+-]\d+)\t(.+)$/);
        if (match) {
          const [, newSha, author, timestamp, msg] = match;
          // Fix author format: "User user@example.com" -> "User <user@example.com>"
          const fixedAuthor = author.includes("<")
            ? author
            : author.replace(/^(.+?) (.+@.+)$/, "$1 <$2>");
          const fixedLine = `${prevSha} ${newSha} ${fixedAuthor} ${timestamp}\t${msg}`;
          lines[lines.length - 1] = fixedLine;
          fs.writeFileSync(reflogPath, `${lines.join("\n")}\n`);
        }
      }
    }

    return { success: true, message: "Changes stashed successfully" };
  } catch (error) {
    console.error("Error stashing changes:", error);
    throw error;
  }
};

export const popStash = async (repoPath: string, index: number) => {
  try {
    const result = await execGitCommand(["stash", "pop", `stash@{${index}}`], repoPath);
    if (!result.success) {
      throw new Error(`Failed to pop stash: ${result.error.message}`);
    }
    return { success: true, message: "Stash popped successfully" };
  } catch (error) {
    console.error("Error popping stash:", error);
    throw error;
  }
};

export const deleteStash = async (repoPath: string, index: number) => {
  try {
    const result = await execGitCommand(["stash", "drop", `stash@{${index}}`], repoPath);
    if (!result.success) {
      throw new Error(`Failed to delete stash: ${result.error.message}`);
    }
    return { success: true, message: "Stash deleted successfully" };
  } catch (error) {
    console.error("Error deleting stash:", error);
    throw error;
  }
};

export const discardChanges = async (
  repoPath: string,
  filepath: string,
  oldFilePath: string | null
) => {
  try {
    const fullPath = path.join(repoPath, filepath);

    const lsFilesResult = await execGitCommand(["ls-files", "--", filepath], repoPath);
    const isTracked = lsFilesResult.success && lsFilesResult.output.trim().length > 0;

    if (!isTracked) {
      const fileExists = fs.existsSync(fullPath);
      if (fileExists) {
        fs.rmSync(fullPath, {
          recursive: true, // Delete folders and their contents
          force: true, // Don't throw an error if the path doesn't exist
        });
      }
      if (!oldFilePath) {
        return { success: true };
      }
    }

    const filePathToRestore = oldFilePath ?? filepath;
    const restoreResult = await execGitCommand(["restore", "--", filePathToRestore], repoPath);
    if (!restoreResult.success) {
      throw new Error(`Failed to discard changes: ${restoreResult.error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error discarding changes:", error);
    throw error;
  }
};

const buildPatchForLines = (diffOutput: string, linesToInclude: DiffLineInfo[]): string | null => {
  if (linesToInclude.length === 0 || linesToInclude.every((l) => l.type === "context")) {
    return null;
  }

  // Create sets for matching by type+content+lineNumber for precise matching
  // Delete lines use oldLineNumber, Add lines use newLineNumber
  const linesToIncludeSet = new Set(
    linesToInclude
      .filter((l) => l.type !== "context")
      .map((l) => {
        const lineNum = l.type === "delete" ? l.oldLineNumber : l.newLineNumber;
        return `${l.type}:${l.content}:${lineNum}`;
      })
  );

  const isLineIncluded = (type: string, content: string, lineNum: number) => {
    return linesToIncludeSet.has(`${type}:${content}:${lineNum}`);
  };

  const rawLines = diffOutput.split("\n");
  const patchLines: string[] = [];
  let inHunk = false;
  let currentHunkLines: Array<{
    raw: string;
    type: string;
    content: string;
    lineNum: number;
  }> = [];
  let hunkOldStart = 0;
  let hunkNewStart = 0;
  let oldLineNum = 0;
  let newLineNum = 0;

  const flushHunk = () => {
    if (currentHunkLines.length === 0) {
      return;
    }

    // Check if any changes are included
    const hasIncludedChanges = currentHunkLines.some(
      (line) =>
        (line.type === "add" || line.type === "delete") &&
        isLineIncluded(line.type, line.content, line.lineNum)
    );

    if (!hasIncludedChanges) {
      currentHunkLines = [];
      return;
    }

    // Build patch for STAGING (git diff: old=INDEX, new=working tree)
    // Within change blocks (consecutive deletes+adds), we pair deletes with adds
    // and output each pair adjacently to preserve correct line ordering in the INDEX.
    // - Non-selected deletes: convert to context (line exists in INDEX/old side)
    // - Non-selected adds: skip entirely (line doesn't exist in INDEX/old side)
    const outputLines: string[] = [];
    let oldCount = 0;
    let newCount = 0;

    type HunkLine = (typeof currentHunkLines)[number];
    type CollectedLine = { line: HunkLine; meta?: HunkLine };

    let j = 0;
    while (j < currentHunkLines.length) {
      const line = currentHunkLines[j];

      if (line.type === "context") {
        outputLines.push(line.raw);
        oldCount++;
        newCount++;
        j++;
      } else if (line.type === "meta") {
        outputLines.push(line.raw);
        j++;
      } else {
        // Change block: collect consecutive deletes, then consecutive adds
        // Attach trailing meta lines (e.g. "\ No newline at end of file") to each
        const deleteLines: CollectedLine[] = [];
        const addLines: CollectedLine[] = [];

        while (j < currentHunkLines.length && currentHunkLines[j].type === "delete") {
          const entry: CollectedLine = { line: currentHunkLines[j] };
          j++;
          if (j < currentHunkLines.length && currentHunkLines[j].type === "meta") {
            entry.meta = currentHunkLines[j];
            j++;
          }
          deleteLines.push(entry);
        }
        while (j < currentHunkLines.length && currentHunkLines[j].type === "add") {
          const entry: CollectedLine = { line: currentHunkLines[j] };
          j++;
          if (j < currentHunkLines.length && currentHunkLines[j].type === "meta") {
            entry.meta = currentHunkLines[j];
            j++;
          }
          addLines.push(entry);
        }

        // Pair deletes with adds (1:1 from top), matching frontend grouping logic
        const minPairs = Math.min(deleteLines.length, addLines.length);

        // Process paired lines - output delete+add adjacently to preserve line order
        for (let k = 0; k < minPairs; k++) {
          const del = deleteLines[k];
          const add = addLines[k];
          const delIncluded = isLineIncluded(del.line.type, del.line.content, del.line.lineNum);
          const addIncluded = isLineIncluded(add.line.type, add.line.content, add.line.lineNum);

          if (delIncluded) {
            outputLines.push(del.line.raw);
            if (del.meta) {
              outputLines.push(del.meta.raw);
            }
            oldCount++;
          } else {
            outputLines.push(` ${del.line.content}`);
            oldCount++;
            newCount++;
          }

          if (addIncluded) {
            outputLines.push(add.line.raw);
            if (add.meta) {
              outputLines.push(add.meta.raw);
            }
            newCount++;
          }
        }

        // Process unpaired deletes (more deletes than adds)
        for (let k = minPairs; k < deleteLines.length; k++) {
          const del = deleteLines[k];
          const delIncluded = isLineIncluded(del.line.type, del.line.content, del.line.lineNum);
          if (delIncluded) {
            outputLines.push(del.line.raw);
            if (del.meta) {
              outputLines.push(del.meta.raw);
            }
            oldCount++;
          } else {
            outputLines.push(` ${del.line.content}`);
            oldCount++;
            newCount++;
          }
        }

        // Process unpaired adds (more adds than deletes)
        for (let k = minPairs; k < addLines.length; k++) {
          const add = addLines[k];
          const addIncluded = isLineIncluded(add.line.type, add.line.content, add.line.lineNum);
          if (addIncluded) {
            outputLines.push(add.line.raw);
            if (add.meta) {
              outputLines.push(add.meta.raw);
            }
            newCount++;
          }
        }
      }
    }

    // Only output hunk if it has actual changes
    const hasChanges = outputLines.some((l) => l.startsWith("-") || l.startsWith("+"));
    if (hasChanges && outputLines.length > 0) {
      patchLines.push(`@@ -${hunkOldStart},${oldCount} +${hunkNewStart},${newCount} @@`);
      patchLines.push(...outputLines);
    }

    currentHunkLines = [];
  };

  for (const rawLine of rawLines) {
    if (rawLine.startsWith("diff --git")) {
      flushHunk();
      patchLines.push(rawLine);
      inHunk = false;
    } else if (
      rawLine.startsWith("index ") ||
      rawLine.startsWith("---") ||
      rawLine.startsWith("+++")
    ) {
      patchLines.push(rawLine);
    } else if (rawLine.startsWith("@@")) {
      flushHunk();
      inHunk = true;
      const match = rawLine.match(/@@\s*-(\d+)(?:,\d+)?\s+\+(\d+)/);
      if (match) {
        hunkOldStart = parseInt(match[1]);
        hunkNewStart = parseInt(match[2]);
        oldLineNum = hunkOldStart - 1;
        newLineNum = hunkNewStart - 1;
      }
    } else if (inHunk) {
      if (rawLine.startsWith("+")) {
        newLineNum++;
        currentHunkLines.push({
          raw: rawLine,
          type: "add",
          content: rawLine.substring(1),
          lineNum: newLineNum,
        });
      } else if (rawLine.startsWith("-")) {
        oldLineNum++;
        currentHunkLines.push({
          raw: rawLine,
          type: "delete",
          content: rawLine.substring(1),
          lineNum: oldLineNum,
        });
      } else if (rawLine.startsWith(" ")) {
        oldLineNum++;
        newLineNum++;
        currentHunkLines.push({
          raw: rawLine,
          type: "context",
          content: rawLine.substring(1),
          lineNum: oldLineNum, // context lines exist in both, use oldLineNum
        });
      } else if (rawLine.startsWith("\\")) {
        currentHunkLines.push({
          raw: rawLine,
          type: "meta",
          content: rawLine,
          lineNum: 0, // meta lines don't have line numbers
        });
      }
    }
  }
  flushHunk();

  if (patchLines.length <= 4) {
    return null;
  }

  return `${patchLines.join("\n")}\n`;
};

export const stageLines = async (repoPath: string, filepath: string, lines: DiffLineInfo[]) => {
  try {
    if (lines.length === 0 || lines.every((l) => l.type === "context")) {
      return { success: true };
    }

    // Use large context to match frontend's view (which uses 999999 for full/split modes)
    const diffResult = await execGitCommand(["diff", "-U999999", "--", filepath], repoPath);
    if (!diffResult.success || !diffResult.output.trim()) {
      return { success: false, error: "No unstaged changes to stage" };
    }

    const patch = buildPatchForLines(diffResult.output, lines);
    if (!patch) {
      return { success: false, error: "Could not build patch for selected lines" };
    }

    const tempPatchPath = path.join(repoPath, ".git", "temp_stage.patch");
    fs.writeFileSync(tempPatchPath, patch);

    try {
      const applyResult = await execGitCommand(
        ["apply", "--cached", "--unidiff-zero", tempPatchPath],
        repoPath
      );
      if (!applyResult.success) {
        const errorMsg = applyResult.error?.message || "Failed to apply patch";
        return { success: false, error: errorMsg };
      }
      return { success: true };
    } finally {
      if (fs.existsSync(tempPatchPath)) {
        fs.unlinkSync(tempPatchPath);
      }
    }
  } catch (error) {
    console.error("Error staging lines:", error);
    throw error;
  }
};

export const unstageLines = async (repoPath: string, filepath: string, lines: DiffLineInfo[]) => {
  try {
    if (lines.length === 0 || lines.every((l) => l.type === "context")) {
      return { success: true };
    }

    // Strategy: Rebuild INDEX from HEAD by applying only changes that should STAY staged
    // 1. Get HEAD content as base
    // 2. Parse the full staged diff
    // 3. Apply changes that are NOT being unstaged
    // 4. Write result to INDEX

    // Get HEAD content as the base
    const headResult = await execGitCommand(["show", `HEAD:${filepath}`], repoPath);
    if (!headResult.success) {
      return { success: false, error: "Could not read HEAD file content" };
    }

    // Get the full diff with maximum context
    const diffResult = await execGitCommand(
      ["diff", "--cached", "-U999999", "--", filepath],
      repoPath
    );
    if (!diffResult.success || !diffResult.output.trim()) {
      return { success: false, error: "No staged changes to unstage" };
    }

    // Build set of lines to unstage by type+content+lineNumber for precise matching
    // Delete lines use oldLineNumber, Add lines use newLineNumber
    const linesToUnstage = new Set(
      lines
        .filter((l) => l.type !== "context")
        .map((l) => {
          const lineNum = l.type === "delete" ? l.oldLineNumber : l.newLineNumber;
          return `${l.type}:${l.content}:${lineNum}`;
        })
    );

    // Parse the diff into structured lines first
    const diffLines = diffResult.output.split("\n");
    type ParsedLine = {
      raw: string;
      type: "context" | "delete" | "add" | "meta";
      content: string;
      lineNum: number;
    };
    const parsedLines: ParsedLine[] = [];
    let inHunk = false;
    let oldLineNum = 0;
    let newLineNum = 0;

    for (const line of diffLines) {
      if (
        line.startsWith("diff --git") ||
        line.startsWith("index ") ||
        line.startsWith("---") ||
        line.startsWith("+++")
      ) {
        continue;
      }

      if (line.startsWith("@@")) {
        inHunk = true;
        const match = line.match(/@@\s*-(\d+)(?:,\d+)?\s+\+(\d+)/);
        if (match) {
          oldLineNum = parseInt(match[1]) - 1;
          newLineNum = parseInt(match[2]) - 1;
        }
        continue;
      }

      if (!inHunk) {
        continue;
      }

      if (line.startsWith(" ")) {
        oldLineNum++;
        newLineNum++;
        parsedLines.push({ raw: line, type: "context", content: line.substring(1), lineNum: 0 });
      } else if (line.startsWith("-")) {
        oldLineNum++;
        parsedLines.push({
          raw: line,
          type: "delete",
          content: line.substring(1),
          lineNum: oldLineNum,
        });
      } else if (line.startsWith("+")) {
        newLineNum++;
        parsedLines.push({
          raw: line,
          type: "add",
          content: line.substring(1),
          lineNum: newLineNum,
        });
      } else if (line.startsWith("\\")) {
        parsedLines.push({ raw: line, type: "meta", content: line, lineNum: 0 });
      }
    }

    // Build new INDEX content by processing change blocks with correct pairing
    const newIndexLines: string[] = [];
    let lastLineType: string | null = null;
    let noTrailingNewline = false;

    const isUnstaging = (type: string, content: string, lineNum: number) =>
      linesToUnstage.has(`${type}:${content}:${lineNum}`);

    type CollectedLine = { parsed: ParsedLine; meta?: ParsedLine };

    let pi = 0;
    while (pi < parsedLines.length) {
      const pl = parsedLines[pi];

      if (pl.type === "context") {
        newIndexLines.push(pl.content);
        lastLineType = "context";
        pi++;
      } else if (pl.type === "meta") {
        if (
          lastLineType === "context" ||
          lastLineType === "add-kept" ||
          lastLineType === "delete-restored"
        ) {
          noTrailingNewline = true;
        }
        pi++;
      } else {
        // Change block: collect consecutive deletes then adds, with trailing meta
        const deleteLines: CollectedLine[] = [];
        const addLines: CollectedLine[] = [];

        while (pi < parsedLines.length && parsedLines[pi].type === "delete") {
          const entry: CollectedLine = { parsed: parsedLines[pi] };
          pi++;
          if (pi < parsedLines.length && parsedLines[pi].type === "meta") {
            entry.meta = parsedLines[pi];
            pi++;
          }
          deleteLines.push(entry);
        }
        while (pi < parsedLines.length && parsedLines[pi].type === "add") {
          const entry: CollectedLine = { parsed: parsedLines[pi] };
          pi++;
          if (pi < parsedLines.length && parsedLines[pi].type === "meta") {
            entry.meta = parsedLines[pi];
            pi++;
          }
          addLines.push(entry);
        }

        // Pair deletes with adds and process each pair together
        const minPairs = Math.min(deleteLines.length, addLines.length);

        for (let k = 0; k < minPairs; k++) {
          const del = deleteLines[k];
          const add = addLines[k];
          const delUnstaging = isUnstaging(del.parsed.type, del.parsed.content, del.parsed.lineNum);
          const addUnstaging = isUnstaging(add.parsed.type, add.parsed.content, add.parsed.lineNum);

          // For the paired position, output what should be in INDEX:
          // - Keep add (not unstaging): output add content
          // - Unstage add (remove from INDEX): don't output
          // - Unstage delete (restore to INDEX): output delete content
          // - Keep delete (stays deleted): don't output
          // Order: kept add first (it was in INDEX at this position), then restored delete
          if (!addUnstaging) {
            newIndexLines.push(add.parsed.content);
            lastLineType = "add-kept";
            if (add.meta) {
              noTrailingNewline = true;
            }
          }
          if (delUnstaging) {
            newIndexLines.push(del.parsed.content);
            lastLineType = "delete-restored";
            if (del.meta) {
              noTrailingNewline = true;
            }
          }
        }

        // Unpaired deletes
        for (let k = minPairs; k < deleteLines.length; k++) {
          const del = deleteLines[k];
          if (isUnstaging(del.parsed.type, del.parsed.content, del.parsed.lineNum)) {
            newIndexLines.push(del.parsed.content);
            lastLineType = "delete-restored";
            if (del.meta) {
              noTrailingNewline = true;
            }
          } else {
            lastLineType = "delete-kept";
          }
        }

        // Unpaired adds
        for (let k = minPairs; k < addLines.length; k++) {
          const add = addLines[k];
          if (!isUnstaging(add.parsed.type, add.parsed.content, add.parsed.lineNum)) {
            newIndexLines.push(add.parsed.content);
            lastLineType = "add-kept";
            if (add.meta) {
              noTrailingNewline = true;
            }
          } else {
            lastLineType = "add-removed";
          }
        }
      }
    }

    // Write new content to object store
    let newContent = newIndexLines.join("\n");
    // Add trailing newline unless the file shouldn't have one
    if (newIndexLines.length > 0 && !noTrailingNewline) {
      newContent += "\n";
    }

    const tempFilePath = path.join(repoPath, ".git", "temp_index_content");
    fs.writeFileSync(tempFilePath, newContent);

    try {
      // Hash the new content
      const hashResult = await execGitCommand(["hash-object", "-w", tempFilePath], repoPath);
      if (!hashResult.success || !hashResult.output.trim()) {
        return { success: false, error: "Failed to hash new content" };
      }
      const newHash = hashResult.output.trim();

      // Get the file mode from current index
      const lsFilesResult = await execGitCommand(["ls-files", "-s", "--", filepath], repoPath);
      let mode = "100644"; // default
      if (lsFilesResult.success && lsFilesResult.output.trim()) {
        const modeMatch = lsFilesResult.output.match(/^(\d+)/);
        if (modeMatch) {
          mode = modeMatch[1];
        }
      }

      // Update the index
      const updateResult = await execGitCommand(
        ["update-index", "--cacheinfo", `${mode},${newHash},${filepath}`],
        repoPath
      );
      if (!updateResult.success) {
        const errorMsg = updateResult.error?.message || "Failed to update index";
        return { success: false, error: errorMsg };
      }

      return { success: true };
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  } catch (error) {
    console.error("Error unstaging lines:", error);
    throw error;
  }
};

const buildPatchForHunk = (diffOutput: string, targetHunkIndex: number): string | null => {
  const rawLines = diffOutput.split("\n");
  const patchLines: string[] = [];
  let currentHunkIndex = -1;
  let inTargetHunk = false;

  for (const rawLine of rawLines) {
    if (
      rawLine.startsWith("diff --git") ||
      rawLine.startsWith("index ") ||
      rawLine.startsWith("---") ||
      rawLine.startsWith("+++")
    ) {
      patchLines.push(rawLine);
    } else if (rawLine.startsWith("@@")) {
      currentHunkIndex++;
      inTargetHunk = currentHunkIndex === targetHunkIndex;
      if (inTargetHunk) {
        patchLines.push(rawLine);
      }
    } else if (inTargetHunk) {
      if (
        rawLine.startsWith("+") ||
        rawLine.startsWith("-") ||
        rawLine.startsWith(" ") ||
        rawLine.startsWith("\\")
      ) {
        patchLines.push(rawLine);
      }
    }
  }

  if (patchLines.length <= 4) {
    return null;
  }

  return `${patchLines.join("\n")}\n`;
};

export const stageHunk = async (repoPath: string, filepath: string, hunkIndex: number) => {
  try {
    const diffResult = await execGitCommand(["diff", "-U3", "--", filepath], repoPath);
    if (!diffResult.success || !diffResult.output.trim()) {
      return { success: false, error: "No unstaged changes to stage" };
    }

    const patch = buildPatchForHunk(diffResult.output, hunkIndex);
    if (!patch) {
      return { success: false, error: "Could not build patch for hunk" };
    }

    const tempPatchPath = path.join(repoPath, ".git", "temp_stage_hunk.patch");
    fs.writeFileSync(tempPatchPath, patch);

    try {
      const applyResult = await execGitCommand(["apply", "--cached", tempPatchPath], repoPath);
      if (!applyResult.success) {
        const errorMsg = applyResult.error?.message || "Failed to apply patch";
        return { success: false, error: errorMsg };
      }
      return { success: true };
    } finally {
      if (fs.existsSync(tempPatchPath)) {
        fs.unlinkSync(tempPatchPath);
      }
    }
  } catch (error) {
    console.error("Error staging hunk:", error);
    throw error;
  }
};

export const unstageHunk = async (repoPath: string, filepath: string, hunkIndex: number) => {
  try {
    const diffResult = await execGitCommand(["diff", "--cached", "-U3", "--", filepath], repoPath);
    if (!diffResult.success || !diffResult.output.trim()) {
      return { success: false, error: "No staged changes to unstage" };
    }

    const patch = buildPatchForHunk(diffResult.output, hunkIndex);
    if (!patch) {
      return { success: false, error: "Could not build patch for hunk" };
    }

    const tempPatchPath = path.join(repoPath, ".git", "temp_unstage_hunk.patch");
    fs.writeFileSync(tempPatchPath, patch);

    try {
      const applyResult = await execGitCommand(
        ["apply", "--cached", "--reverse", tempPatchPath],
        repoPath
      );
      if (!applyResult.success) {
        const errorMsg = applyResult.error?.message || "Failed to apply reverse patch";
        return { success: false, error: errorMsg };
      }
      return { success: true };
    } finally {
      if (fs.existsSync(tempPatchPath)) {
        fs.unlinkSync(tempPatchPath);
      }
    }
  } catch (error) {
    console.error("Error unstaging hunk:", error);
    throw error;
  }
};

export const createRepository = async (parentPath: string, repoName: string) => {
  try {
    // Create the full path for the new repository
    const repoPath = path.join(parentPath, repoName);

    // Check if the directory already exists
    if (fs.existsSync(repoPath)) {
      return {
        success: false,
        error: "A folder with this name already exists",
      };
    }

    // Create the directory
    fs.mkdirSync(repoPath, { recursive: true });

    // Initialize git repository
    await git.init({
      fs,
      dir: repoPath,
      defaultBranch: "main",
    });

    // Create initial .gitignore file
    const gitignorePath = path.join(repoPath, ".gitignore");
    fs.writeFileSync(
      gitignorePath,
      "# Dependencies\nnode_modules/\n\n# Build outputs\ndist/\nbuild/\n\n# Environment\n.env\n.env.local\n"
    );

    return { success: true, path: repoPath };
  } catch (error) {
    console.error("Error creating repository:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const clone = async (
  url: string,
  destination: string,
  username: string | null,
  password: string | null,
  saveCredentials: boolean
) => {
  try {
    const isHttpUrl = isHttpRemote(url);

    const cloneArgs: string[] = [];

    const credentialConfig = getCredentialHelperConfig(isHttpUrl, username, password);
    cloneArgs.push(...credentialConfig.args);

    // Strip any existing credentials from URL to avoid double-injection or plaintext exposure
    let cloneUrl = url;
    if (isHttpUrl) {
      try {
        const urlObj = new URL(url);
        urlObj.username = "";
        urlObj.password = "";
        cloneUrl = urlObj.toString();
      } catch {
        // If URL parsing fails, use as-is
        cloneUrl = url;
      }
    }

    cloneArgs.push("clone", cloneUrl, destination);

    // Execute git clone with credential environment if provided
    const cloneResult = await execGitCommand(cloneArgs, process.cwd(), credentialConfig.env);

    if (cloneResult.success && isHttpUrl && username && password && saveCredentials) {
      await storeCredentials(cloneUrl, destination, username, password);
    }

    if (!cloneResult.success) {
      throw { stderr: cloneResult.error.message, message: cloneResult.error.message };
    }

    return { success: true, path: destination };
  } catch (error) {
    console.error("Error cloning repository:", error);

    const errorMessage = error.stderr || error.message || String(error);
    const lowerError = errorMessage.toLowerCase();

    // Check for specific error types and return user-friendly messages
    let cleanError: string;
    let isAuthError = false;

    // Authentication errors - treat 404/not found as auth errors too
    // GitHub returns 404 for both non-existent repos AND private repos you can't access
    if (
      lowerError.includes("authentication failed") ||
      lowerError.includes("401") ||
      lowerError.includes("403") ||
      lowerError.includes("404") ||
      lowerError.includes("not found") ||
      (lowerError.includes("repository") && lowerError.includes("does not exist")) ||
      lowerError.includes("authentication required") ||
      lowerError.includes("could not read username") ||
      lowerError.includes("could not read password")
    ) {
      cleanError =
        "Authentication required. Please provide your credentials to access this repository.";
      isAuthError = true;
    }
    // Permission denied
    else if (lowerError.includes("permission denied") || lowerError.includes("access denied")) {
      cleanError = "Permission denied. You don't have access to this repository.";
    }
    // Network errors
    else if (
      lowerError.includes("could not resolve host") ||
      lowerError.includes("unable to access")
    ) {
      cleanError = "Network error. Please check your internet connection.";
    }
    // Invalid URL
    else if (lowerError.includes("invalid") && lowerError.includes("url")) {
      cleanError = "Invalid repository URL.";
    }
    // Directory already exists
    else if (
      lowerError.includes("already exists") &&
      lowerError.includes("not an empty directory")
    ) {
      cleanError =
        "Destination folder already exists and is not empty. Please choose a different location or remove the existing folder.";
    }
    // Generic error - show the actual error but clean it up
    else {
      // Extract just the fatal/error line from git output
      const lines = errorMessage.split("\n");
      const fatalLine = lines.find((line) => line.includes("fatal:") || line.includes("error:"));
      if (fatalLine) {
        const extracted = fatalLine.replace(/^.*?(fatal:|error:)\s*/i, "");
        // Capitalize first letter
        cleanError = extracted.charAt(0).toUpperCase() + extracted.slice(1);
      } else {
        cleanError = "Failed to clone repository. Please try again.";
      }
    }

    // Check for SSH unknown host (first time connecting)
    if (
      errorMessage.includes("authenticity of host") &&
      errorMessage.includes("can't be established")
    ) {
      // Extract hostname from error message
      // Format: "The authenticity of host 'github.com (20.217.135.5)' can't be established."
      const hostMatch = errorMessage.match(/host '([^']+)'/);
      const hostname = hostMatch ? hostMatch[1].split(" ")[0] : "unknown";

      return {
        success: false,
        error: cleanError,
        needsAuth: false,
        needsSshTrust: true,
        sshHostname: hostname,
      };
    }

    // Check for SSH permission denied errors
    if (lowerError.includes("permission denied") && lowerError.includes("publickey")) {
      return {
        success: false,
        error: cleanError,
        needsAuth: false,
        needsSsh: true, // New flag for SSH errors
      };
    }

    return {
      success: false,
      error: cleanError,
      needsAuth: isAuthError,
    };
  }
};

export const getRemoteUrl = async (repoPath: string) => {
  try {
    const result = await execGitCommand(["remote", "get-url", "origin"], repoPath);
    if (!result.success) {
      return { success: false, error: result.error.message };
    }
    return { success: true, url: result.output.trim() };
  } catch (error) {
    console.error("Error getting remote URL:", error);
    const errorMessage = String(error.message || error);
    return {
      success: false,
      error: errorMessage,
    };
  }
};

export const fetch = async (
  repoPath: string,
  username: string | null,
  password: string | null,
  saveCredentials: boolean
) => {
  // Wrap entire handler to ensure we NEVER throw across IPC boundary
  try {
    // Verify the repo path exists
    if (!fs.existsSync(repoPath)) {
      return {
        success: false,
        error: "Repository path does not exist.",
        needsAuth: false,
      };
    }

    if (!isGitRepository(repoPath)) {
      return {
        success: false,
        error: "Not a valid Git repository.",
        needsAuth: false,
      };
    }

    // Get remote URL to check if it's HTTPS
    const remoteResult = await execGitCommand(["remote", "get-url", "origin"], repoPath);
    if (!remoteResult.success) {
      // No remote configured
      return {
        success: false,
        error: "No remote repository configured.",
        needsAuth: false,
      };
    }
    const remoteUrl = remoteResult.output.trim();

    const isHttpUrl = isHttpRemote(remoteUrl);

    const fetchArgs: string[] = [];

    const credentialConfig = getCredentialHelperConfig(isHttpUrl, username, password);
    fetchArgs.push(...credentialConfig.args);
    fetchArgs.push("fetch", "--all", "--prune");

    const fetchResult = await execGitCommand(fetchArgs, repoPath, credentialConfig.env);

    if (fetchResult.success && isHttpUrl && username && password && saveCredentials) {
      await storeCredentials(remoteUrl, repoPath, username, password);
    }

    if (!fetchResult.success) {
      const errorMessage = fetchResult.error.message || "";
      const lowerError = errorMessage.toLowerCase();

      const platform = getPlatform();
      if (platform === "win" && lowerError.includes("user cancelled dialog")) {
        return {
          success: false,
          error: "Authentication was canceled",
          needsAuth: true,
        };
      }

      // Check if this is an authentication error
      if (
        lowerError.includes("authentication failed") ||
        lowerError.includes("invalid username") ||
        lowerError.includes("invalid credentials") ||
        lowerError.includes("remote: invalid") ||
        lowerError.includes("401") ||
        lowerError.includes("403")
      ) {
        return {
          success: false,
          error: "Invalid username, password, or token",
          needsAuth: false,
        };
      }

      throw { stderr: errorMessage, message: errorMessage };
    }

    return { success: true };
  } catch (error) {
    console.error("Error fetching from remote:", error);

    // Ensure we always return a serializable object
    const errorMessage = String(error.stderr || error.message || error);
    const lowerError = errorMessage.toLowerCase();

    let cleanError: string;
    let isAuthError = false;

    // Check for specific error types
    if (
      lowerError.includes("no remote") ||
      lowerError.includes("does not appear to be a git repository")
    ) {
      cleanError = "No remote repository configured.";
    } else if (
      lowerError.includes("could not resolve host") ||
      lowerError.includes("unable to access")
    ) {
      cleanError = "Network error. Please check your internet connection.";
    } else if (
      lowerError.includes("authentication failed") ||
      lowerError.includes("401") ||
      lowerError.includes("403") ||
      lowerError.includes("could not read username") ||
      lowerError.includes("could not read password") ||
      lowerError.includes("authentication required")
    ) {
      cleanError =
        "Authentication required. Please provide your credentials to access this repository.";
      isAuthError = true;
    } else if (lowerError.includes("permission denied")) {
      cleanError = "Permission denied. Please check your access rights.";
    } else {
      // Extract the actual error message
      const lines = errorMessage.split("\n");
      const fatalLine = lines.find(
        (line: string) => line.includes("fatal:") || line.includes("error:")
      );
      if (fatalLine) {
        cleanError = fatalLine.replace(/^.*?(fatal:|error:)\s*/i, "");
        cleanError = cleanError.charAt(0).toUpperCase() + cleanError.slice(1);
      } else {
        cleanError = errorMessage || "Failed to fetch from remote.";
      }
    }

    // Always return a plain serializable object
    return {
      success: false,
      error: String(cleanError),
      needsAuth: Boolean(isAuthError),
    };
  }
};

export const push = async (
  repoPath: string,
  username: string | null,
  password: string | null,
  saveCredentials: boolean
) => {
  // Wrap entire handler to ensure we NEVER throw across IPC boundary
  try {
    // Verify the repo path exists
    if (!fs.existsSync(repoPath)) {
      return {
        success: false,
        error: "Repository path does not exist.",
        needsAuth: false,
      };
    }

    if (!isGitRepository(repoPath)) {
      return {
        success: false,
        error: "Not a valid Git repository.",
        needsAuth: false,
      };
    }

    // Get remote URL to check if it's HTTPS
    const remoteResult = await execGitCommand(["remote", "get-url", "origin"], repoPath);
    if (!remoteResult.success) {
      // No remote configured
      return {
        success: false,
        error: "No remote repository configured.",
        needsAuth: false,
      };
    }
    const remoteUrl = remoteResult.output.trim();
    const isHttpUrl = isHttpRemote(remoteUrl);

    let upstreamBranchName = await getUpstreamNameOfCurrentBranch(repoPath);
    if (upstreamBranchName) {
      upstreamBranchName = upstreamBranchName.replace(/^origin\//, "");
    }

    const pushArgs: string[] = [];
    const credentialConfig = getCredentialHelperConfig(isHttpUrl, username, password);
    pushArgs.push(...credentialConfig.args);
    pushArgs.push("push");
    if (upstreamBranchName) {
      pushArgs.push(...["origin", `HEAD:${upstreamBranchName}`]);
    } else {
      pushArgs.push(...["--set-upstream", "origin", "HEAD"]);
    }

    const pushResult = await execGitCommand(pushArgs, repoPath, credentialConfig.env);

    if (pushResult.success && isHttpUrl && username && password && saveCredentials) {
      await storeCredentials(remoteUrl, repoPath, username, password);
    }

    if (!pushResult.success) {
      const errorMessage = pushResult.error.message || "";
      const lowerError = errorMessage.toLowerCase();

      const platform = getPlatform();
      if (platform === "win" && lowerError.includes("user cancelled dialog")) {
        return {
          success: false,
          error: "Authentication was canceled",
          needsAuth: true,
        };
      }

      // Check if this is an authentication error
      if (
        lowerError.includes("authentication failed") ||
        lowerError.includes("invalid username") ||
        lowerError.includes("invalid credentials") ||
        lowerError.includes("remote: invalid") ||
        lowerError.includes("401") ||
        lowerError.includes("403")
      ) {
        return {
          success: false,
          error: "Invalid username, password, or token",
          needsAuth: false,
        };
      }

      throw { stderr: errorMessage, message: errorMessage };
    }

    return { success: true };
  } catch (error) {
    console.error("Error pushing to remote:", error);

    // Ensure we always return a serializable object
    const errorMessage = String(error.stderr || error.message || error);
    const lowerError = errorMessage.toLowerCase();

    let cleanError: string;
    let isAuthError = false;

    // Check for specific error types
    if (
      lowerError.includes("no remote") ||
      lowerError.includes("does not appear to be a git repository")
    ) {
      cleanError = "No remote repository configured.";
    } else if (
      lowerError.includes("could not resolve host") ||
      lowerError.includes("unable to access")
    ) {
      cleanError = "Network error. Please check your internet connection.";
    } else if (
      lowerError.includes("authentication failed") ||
      lowerError.includes("401") ||
      lowerError.includes("403") ||
      lowerError.includes("could not read username") ||
      lowerError.includes("could not read password") ||
      lowerError.includes("authentication required")
    ) {
      cleanError =
        "Authentication required. Please provide your credentials to access this repository.";
      isAuthError = true;
    } else if (lowerError.includes("permission denied")) {
      cleanError = "Permission denied. Please check your access rights.";
    } else if (lowerError.includes("failed to push") || lowerError.includes("rejected")) {
      // Check for common push rejection scenarios
      if (lowerError.includes("non-fast-forward")) {
        cleanError = "Push rejected: Remote has changes. Please pull first.";
      } else if (lowerError.includes("fetch first")) {
        cleanError = "Push rejected: Remote has changes. Please fetch/pull first.";
      } else {
        cleanError = "Push rejected. The remote may have changes or you may need to pull first.";
      }
    } else {
      // Extract the actual error message
      const lines = errorMessage.split("\n");
      const fatalLine = lines.find(
        (line: string) => line.includes("fatal:") || line.includes("error:")
      );
      if (fatalLine) {
        cleanError = fatalLine.replace(/^.*?(fatal:|error:)\s*/i, "");
        cleanError = cleanError.charAt(0).toUpperCase() + cleanError.slice(1);
      } else {
        cleanError = errorMessage || "Failed to push to remote.";
      }
    }

    // Always return a plain serializable object
    return {
      success: false,
      error: String(cleanError),
      needsAuth: Boolean(isAuthError),
    };
  }
};

const pull = async (
  repoPath: string,
  username: string | null,
  password: string | null,
  saveCredentials: boolean,
  branchName?: string
) => {
  // Wrap entire handler to ensure we NEVER throw across IPC boundary
  try {
    // Verify the repo path exists
    if (!fs.existsSync(repoPath)) {
      return {
        success: false,
        error: "Repository path does not exist.",
        needsAuth: false,
      };
    }

    if (!isGitRepository(repoPath)) {
      return {
        success: false,
        error: "Not a valid Git repository.",
        needsAuth: false,
      };
    }

    // Get remote URL to check if it's HTTPS
    const remoteResult = await execGitCommand(["remote", "get-url", "origin"], repoPath);
    if (!remoteResult.success) {
      // No remote configured
      return {
        success: false,
        error: "No remote repository configured.",
        needsAuth: false,
      };
    }
    const remoteUrl = remoteResult.output.trim();

    const isHttpUrl = isHttpRemote(remoteUrl);

    // If branchName is provided, use fetch to update specific branch without checking it out
    // Otherwise, use pull to update and merge current branch
    const baseOperationArgs = branchName
      ? ["fetch", "origin", `${branchName}:${branchName}`]
      : ["pull"];

    const operationArgs: string[] = [];

    const credentialConfig = getCredentialHelperConfig(isHttpUrl, username, password);
    operationArgs.push(...credentialConfig.args);
    operationArgs.push(...baseOperationArgs);

    const operationResult = await execGitCommand(operationArgs, repoPath, credentialConfig.env);

    if (operationResult.success && isHttpUrl && username && password && saveCredentials) {
      await storeCredentials(remoteUrl, repoPath, username, password);
    }

    if (!operationResult.success) {
      const errorMessage = operationResult.error.message || "";
      const lowerError = errorMessage.toLowerCase();

      const platform = getPlatform();
      if (platform === "win" && lowerError.includes("user cancelled dialog")) {
        return {
          success: false,
          error: "Authentication was canceled",
          needsAuth: true,
        };
      }

      // Check if this is an authentication error
      if (
        lowerError.includes("authentication failed") ||
        lowerError.includes("invalid username") ||
        lowerError.includes("invalid credentials") ||
        lowerError.includes("remote: invalid") ||
        lowerError.includes("401") ||
        lowerError.includes("403")
      ) {
        return {
          success: false,
          error: "Invalid username, password, or token",
          needsAuth: false,
        };
      }

      throw { stderr: errorMessage, message: errorMessage };
    }

    return { success: true };
  } catch (error) {
    console.error(branchName ? "Error pulling branch:" : "Error pulling from remote:", error);

    // Ensure we always return a serializable object
    const errorMessage = String(error.stderr || error.message || error);
    const lowerError = errorMessage.toLowerCase();

    let cleanError: string;
    let isAuthError = false;

    // Check for specific error types
    if (
      lowerError.includes("no remote") ||
      lowerError.includes("does not appear to be a git repository")
    ) {
      cleanError = "No remote repository configured.";
    } else if (
      lowerError.includes("could not resolve host") ||
      lowerError.includes("unable to access")
    ) {
      cleanError = "Network error. Please check your internet connection.";
    } else if (
      lowerError.includes("authentication failed") ||
      lowerError.includes("401") ||
      lowerError.includes("403") ||
      lowerError.includes("could not read username") ||
      lowerError.includes("could not read password") ||
      lowerError.includes("authentication required")
    ) {
      cleanError =
        "Authentication required. Please provide your credentials to access this repository.";
      isAuthError = true;
    } else if (lowerError.includes("permission denied")) {
      cleanError = "Permission denied. Please check your access rights.";
    } else if (branchName) {
      // Error handling specific to pulling non-current branch
      if (lowerError.includes("rejected") || lowerError.includes("non-fast-forward")) {
        cleanError =
          "Cannot pull: branch has diverged. Switch to this branch and resolve conflicts manually.";
      } else if (
        lowerError.includes("refusing to fetch") ||
        lowerError.includes("refusing to update")
      ) {
        cleanError = "Cannot update branch. It may have diverged from remote.";
      } else {
        // Extract the actual error message
        const lines = errorMessage.split("\n");
        const fatalLine = lines.find(
          (line: string) => line.includes("fatal:") || line.includes("error:")
        );
        if (fatalLine) {
          cleanError = fatalLine.replace(/^.*?(fatal:|error:)\s*/i, "");
          cleanError = cleanError.charAt(0).toUpperCase() + cleanError.slice(1);
        } else {
          cleanError = errorMessage || "Failed to pull branch.";
        }
      }
    } else {
      // Error handling specific to pulling current branch
      if (
        lowerError.includes("merge conflict") ||
        lowerError.includes("conflict") ||
        lowerError.includes("automatic merge failed")
      ) {
        cleanError = "Pull resulted in merge conflicts. Please resolve conflicts manually.";
      } else if (
        lowerError.includes("uncommitted changes") ||
        lowerError.includes("overwritten by merge")
      ) {
        cleanError = "You have uncommitted changes. Please commit or stash them before pulling.";
      } else if (
        lowerError.includes("no tracking information") ||
        lowerError.includes("no upstream")
      ) {
        cleanError = "No upstream branch configured. Please set up tracking first.";
      } else {
        // Extract the actual error message
        const lines = errorMessage.split("\n");
        const fatalLine = lines.find(
          (line: string) => line.includes("fatal:") || line.includes("error:")
        );
        if (fatalLine) {
          cleanError = fatalLine.replace(/^.*?(fatal:|error:)\s*/i, "");
          cleanError = cleanError.charAt(0).toUpperCase() + cleanError.slice(1);
        } else {
          cleanError = errorMessage || "Failed to pull from remote.";
        }
      }
    }

    // Always return a plain serializable object
    return {
      success: false,
      error: String(cleanError),
      needsAuth: Boolean(isAuthError),
    };
  }
};

export const pullCurrentBranch = async (
  repoPath: string,
  username: string | null,
  password: string | null,
  saveCredentials: boolean
) => {
  return pull(repoPath, username, password, saveCredentials);
};

export const pullNonCurrentBranch = async (
  repoPath: string,
  branchName: string,
  username: string | null,
  password: string | null,
  saveCredentials: boolean
) => {
  return pull(repoPath, username, password, saveCredentials, branchName);
};
