import path from "node:path";
import fs from "node:fs";
import * as git from "isomorphic-git";
import { execSync, exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export const getGlobalConfig = async () => {
  try {
    let userName = "";
    let userEmail = "";

    try {
      userName = execSync("git config --global user.name", {
        encoding: "utf8",
      }).trim();
    } catch (error) {
      // user.name not set
    }

    try {
      userEmail = execSync("git config --global user.email", {
        encoding: "utf8",
      }).trim();
    } catch (error) {
      // user.email not set
    }

    return {
      success: true,
      userName,
      userEmail,
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
      execSync(`git config --global user.name "${userName}"`, {
        encoding: "utf8",
      });
    }

    if (userEmail) {
      execSync(`git config --global user.email "${userEmail}"`, {
        encoding: "utf8",
      });
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
    throw error; // Re-throw so frontend can see the error
  }
};

export const listBranches = async (repoPath: string) => {
  try {
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    const gitPath = path.join(repoPath, ".git");
    if (!fs.existsSync(gitPath)) {
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
          try {
            const result = execSync(
              `git -C "${repoPath}" for-each-ref --format='%(upstream:short)' "refs/heads/${name}"`,
              {
                encoding: "utf8",
                stdio: ["pipe", "pipe", "pipe"],
              }
            );
            // If the result is not empty, the branch has an upstream
            const trimmedResult = result.trim();
            if (trimmedResult.length > 0) {
              hasUpstream = true;
              upstreamName = trimmedResult.replace(/^origin\//, "");
            }
          } catch (upstreamError) {
            // Error checking upstream, assume no upstream
            hasUpstream = false;
          }

          // Try to get the tracking branch info
          const localOid = await git.resolveRef({
            fs,
            dir: repoPath,
            ref: name,
          });

          // Try to resolve the remote tracking branch
          const remoteBranchName = `refs/remotes/origin/${name}`;
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
                if (ahead === -1) ahead = aheadCommits.length;
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
                if (behind === -1) behind = behindCommits.length;
              }
            }
          } catch (remoteError) {
            // Remote branch doesn't exist, which is fine
          }
        } catch (error) {
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
    console.error(
      "Error details:",
      error instanceof Error ? error.stack : error
    );
    throw error; // Re-throw so frontend can see the error
  }
};

export const listRemoteBranches = async (repoPath: string) => {
  try {
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    const gitPath = path.join(repoPath, ".git");
    if (!fs.existsSync(gitPath)) {
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
    // Return empty array if there are no remotes configured
    return [];
  }
};

export const getStatus = async (repoPath: string) => {
  try {
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    const gitPath = path.join(repoPath, ".git");
    if (!fs.existsSync(gitPath)) {
      throw new Error(`Not a valid Git repository: ${repoPath}`);
    }

    // Get the status matrix - returns [filepath, HEADStatus, WorkdirStatus, StageStatus]
    const statusMatrix = await git.statusMatrix({
      fs,
      dir: repoPath,
    });

    const files = statusMatrix
      .filter(([filepath, head, workdir, stage]) => {
        // Filter out unmodified files (1,1,1)
        return !(head === 1 && workdir === 1 && stage === 1);
      })
      .map(([filepath, head, workdir, stage]) => {
        // Determine status and staging
        let status: "modified" | "added" | "deleted";
        let hasStaged = false;
        let hasUnstaged = false;

        // Check if file has staged changes (stage differs from head)
        // stage === 2 or 3: staged modifications/additions
        // head === 1 && stage === 0: staged deletion
        hasStaged = stage === 2 || stage === 3 || (head === 1 && stage === 0);

        // Check if file has unstaged changes (workdir has changes and differs from stage)
        // workdir === 2: file is modified or added in working directory
        // workdir === 0: file is deleted in working directory
        // Must also differ from stage to be considered unstaged changes
        hasUnstaged = (workdir === 2 || workdir === 0) && workdir !== stage;

        // Determine the file status based on what's in the working directory
        if (head === 0 && (workdir === 2 || stage === 2)) {
          // New file (either in workdir or staged)
          status = "added";
        } else if (
          workdir === 0 ||
          (head === 1 && stage === 0 && workdir === 1)
        ) {
          // File deleted in workdir, or deletion staged but workdir caught up
          status = "deleted";
        } else {
          // File modified
          status = "modified";
        }

        return {
          path: filepath,
          status,
          hasStaged,
          hasUnstaged,
        };
      });

    return files;
  } catch (error) {
    console.error("Error getting git status:", error);
    console.error(
      "Error details:",
      error instanceof Error ? error.stack : error
    );
    throw error;
  }
};

export const stageFile = async (repoPath: string, filepath: string) => {
  try {
    // Check if the file exists in the working directory
    const fullPath = path.join(repoPath, filepath);
    const fileExists = fs.existsSync(fullPath);

    if (!fileExists) {
      // File was deleted - stage the deletion using git.remove
      // This removes the file from the index (stages the deletion)
      await git.remove({
        fs,
        dir: repoPath,
        filepath,
      });
    } else {
      // File exists - stage normally
      await git.add({
        fs,
        dir: repoPath,
        filepath,
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Error staging file:", error);
    throw error;
  }
};

export const unstageFile = async (repoPath: string, filepath: string) => {
  try {
    // Use resetIndex to unstage the file (keep workdir changes)
    await git.resetIndex({
      fs,
      dir: repoPath,
      filepath,
    });
    return { success: true };
  } catch (error) {
    console.error("Error unstaging file:", error);
    throw error;
  }
};

export const unstageAllFiles = async (repoPath: string) => {
  try {
    // Get all files in the status matrix
    const statusMatrix = await git.statusMatrix({
      fs,
      dir: repoPath,
    });

    // Unstage each staged file
    for (const [filepath, head, workdir, stage] of statusMatrix) {
      // Check if the file is staged (stage !== head or stage === 2)
      if (stage === 2 || (stage !== head && stage !== 1)) {
        await git.resetIndex({
          fs,
          dir: repoPath,
          filepath,
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error resetting HEAD:", error);
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
    } catch (error) {
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
    } catch (error) {
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
    try {
      const result = execSync(
        `git -C "${repoPath}" for-each-ref --format='%(upstream:short)' "refs/heads/${oldName}"`,
        {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
      const trimmed = result.trim();
      if (trimmed.length > 0) {
        upstreamBranch = trimmed;
      }
    } catch (error) {
      // No upstream configured, which is fine
    }

    // Rename local branch
    await git.renameBranch({
      fs,
      dir: repoPath,
      oldref: oldName,
      ref: newName,
    });

    // If also renaming remote, push new branch and delete old one using git CLI
    if (alsoRenameRemote && upstreamBranch) {
      try {
        // Extract the actual remote branch name from upstream (e.g., "origin/feature-a" -> "feature-a")
        const remoteBranchName = upstreamBranch.includes("/")
          ? upstreamBranch.split("/").slice(1).join("/")
          : upstreamBranch;

        // Extract remote name (e.g., "origin")
        const remoteName = upstreamBranch.includes("/")
          ? upstreamBranch.split("/")[0]
          : "origin";

        // Push the new branch to remote with upstream tracking
        await execAsync(`git push -u ${remoteName} ${newName}`, {
          cwd: repoPath,
          encoding: "utf8",
        });

        // Delete the old branch from remote using the actual remote branch name
        try {
          await execAsync(
            `git push ${remoteName} --delete ${remoteBranchName}`,
            {
              cwd: repoPath,
              encoding: "utf8",
            }
          );
        } catch (deleteError: any) {
          // Check if the error is due to trying to delete the default branch
          const errorMessage = deleteError.message || String(deleteError);
          if (errorMessage.includes("refusing to delete the current branch")) {
            throw new Error(
              `Local branch renamed to "${newName}" and pushed to remote, but could not delete old branch "${remoteBranchName}" because it is the default branch on the remote. Please change the default branch on GitHub/GitLab first, then delete "${remoteBranchName}" manually.`
            );
          }
          throw deleteError;
        }
      } catch (remoteError) {
        console.error("Error renaming branch on remote:", remoteError);
        throw remoteError;
      }
    } else if (upstreamBranch && !alsoRenameRemote) {
      // Not renaming on remote, just restore the existing upstream tracking
      try {
        execSync(
          `git -C "${repoPath}" branch --set-upstream-to="${upstreamBranch}" "${newName}"`,
          {
            stdio: ["pipe", "pipe", "pipe"],
          }
        );
      } catch (error) {
        console.error("Error restoring upstream tracking:", error);
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
    } catch (error) {
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
      } catch (error) {
        localBranchExists = false;
      }

      if (localBranchExists) {
        // Local branch exists - checkout using git CLI to ensure index is properly reset
        try {
          const { stdout, stderr } = await execAsync(
            `git checkout "${branchName}"`,
            {
              cwd: repoPath,
              encoding: "utf8",
            }
          );
          console.log("Checked out branch:", stdout);
        } catch (error) {
          console.error("Error checking out branch:", error);
          throw new Error(
            `Failed to checkout branch: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
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
        } catch (error) {
          remoteBranchExists = false;
        }

        if (remoteBranchExists) {
          // Remote branch exists - create local tracking branch and checkout
          // Using git CLI for this as it's more reliable for setting up tracking
          try {
            const { stdout, stderr } = await execAsync(
              `git checkout -b "${branchName}" "origin/${branchName}"`,
              {
                cwd: repoPath,
                encoding: "utf8",
              }
            );
            console.log("Created tracking branch:", stdout);
          } catch (error) {
            console.error("Error creating tracking branch:", error);
            throw new Error(
              `Failed to checkout remote branch: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        } else {
          // Neither local nor remote branch exists
          throw new Error(
            `Branch '${branchName}' not found (checked both local and remote)`
          );
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

export const commit = async (
  repoPath: string,
  message: string,
  description?: string
) => {
  try {
    // Check status matrix to see what's staged
    const statusMatrix = await git.statusMatrix({
      fs,
      dir: repoPath,
    });

    // Check if there are actually staged changes
    const hasStagedChanges = statusMatrix.some(([_, head, workdir, stage]) => {
      // Staged changes have stage !== head
      return stage !== head;
    });

    if (!hasStagedChanges) {
      return { success: false, message: "No changes staged for commit" };
    }

    // Combine message and description
    const fullMessage = description ? `${message}\n\n${description}` : message;

    // Get git config for author (use defaults if not set)
    let authorName = "User";
    let authorEmail = "user@example.com";

    try {
      authorName =
        (await git.getConfig({ fs, dir: repoPath, path: "user.name" })) ||
        "User";
      authorEmail =
        (await git.getConfig({ fs, dir: repoPath, path: "user.email" })) ||
        "user@example.com";
    } catch (error) {
      console.warn("Could not get git config, using defaults");
    }

    const sha = await git.commit({
      fs,
      dir: repoPath,
      message: fullMessage,
      author: {
        name: authorName,
        email: authorEmail,
      },
    });

    // Verify the branch ref was updated
    const currentBranch = await git.currentBranch({
      fs,
      dir: repoPath,
      fullname: false,
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
    let headRef;
    try {
      headRef = await git.resolveRef({ fs, dir: repoPath, ref: "HEAD" });
    } catch (error) {
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
  contextLines: number = 999999
) => {
  try {
    // Use git diff to get the actual diff
    const diffCommand = staged
      ? `git diff --cached -U${contextLines} -- "${filepath}"` // --cached for staged
      : `git diff -U${contextLines} -- "${filepath}"`; // unstaged changes

    let diffOutput = "";
    try {
      diffOutput = execSync(diffCommand, {
        cwd: repoPath,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (error: any) {
      // Git diff exits with code 1 when there are differences, which is normal
      if (error.stdout) {
        diffOutput = error.stdout;
      } else {
        // No diff or error
        return [];
      }
    }

    // If no diff output, check if it's a new file
    if (!diffOutput.trim()) {
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
      hunkIndex?: number;
      hunkHeader?: string;
    }> = [];

    const lines = diffOutput.split("\n");
    let lineNumber = 0;
    let inHunk = false;
    let hunkIndex = -1;
    let currentHunkHeader = "";

    for (const line of lines) {
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
        // Extract starting line number from hunk header
        const match = line.match(/@@\s*-\d+(?:,\d+)?\s+\+(\d+)/);
        if (match) {
          lineNumber = parseInt(match[1]) - 1; // Will be incremented for first line
        }
        continue;
      }

      if (!inHunk) continue;

      // Parse diff lines
      if (line.startsWith("+")) {
        // Added line
        lineNumber++;
        diffLines.push({
          type: "add",
          content: line.substring(1), // Remove the + prefix
          lineNumber,
          hunkIndex,
          hunkHeader: currentHunkHeader,
        });
      } else if (line.startsWith("-")) {
        // Deleted line (don't increment line number for deletions)
        diffLines.push({
          type: "delete",
          content: line.substring(1), // Remove the - prefix
          lineNumber: lineNumber + 1, // Show at next line position
          hunkIndex,
          hunkHeader: currentHunkHeader,
        });
      } else if (line.startsWith(" ")) {
        // Context line (unchanged)
        lineNumber++;
        diffLines.push({
          type: "context",
          content: line.substring(1), // Remove the space prefix
          lineNumber,
          hunkIndex,
          hunkHeader: currentHunkHeader,
        });
      } else if (line === "") {
        // Empty line in context
        lineNumber++;
        diffLines.push({
          type: "context",
          content: "",
          lineNumber,
          hunkIndex,
          hunkHeader: currentHunkHeader,
        });
      }
    }

    return diffLines;
  } catch (error) {
    console.error("Error getting diff:", error);
    throw error;
  }
};

export const listStashes = async (repoPath: string) => {
  try {
    const gitDir = path.join(repoPath, ".git");
    const stashDir = path.join(gitDir, "refs", "stash");

    // Check if stash path exists
    if (!fs.existsSync(stashDir)) {
      return [];
    }

    // Check if it's a directory (not a file)
    const stats = fs.statSync(stashDir);
    if (!stats.isDirectory()) {
      // If it's a file instead of a directory, delete it and recreate as directory
      fs.unlinkSync(stashDir);
      fs.mkdirSync(stashDir, { recursive: true });
      return [];
    }

    // Read all stash files
    const stashFiles = fs.readdirSync(stashDir);

    // Sort by timestamp (filename is timestamp)
    stashFiles.sort((a, b) => parseInt(b) - parseInt(a));

    const stashes: Array<{
      index: number;
      message: string;
      date: string;
      sha: string;
    }> = [];
    for (let i = 0; i < stashFiles.length; i++) {
      const stashFile = stashFiles[i];
      const stashPath = path.join(stashDir, stashFile);
      const sha = fs.readFileSync(stashPath, "utf8").trim();

      try {
        // Read the commit to get the message and timestamp
        const commit = await git.readCommit({
          fs,
          dir: repoPath,
          oid: sha,
        });

        // Parse timestamp from message or use file timestamp
        const timestamp = parseInt(stashFile);
        const date = new Date(timestamp);
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        let dateStr = "";
        if (seconds < 60) dateStr = "just now";
        else if (minutes < 60)
          dateStr = `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
        else if (hours < 24)
          dateStr = `${hours} hour${hours !== 1 ? "s" : ""} ago`;
        else if (days === 1) dateStr = "1 day ago";
        else dateStr = `${days} days ago`;

        stashes.push({
          index: i,
          message: commit.commit.message,
          date: dateStr,
          sha,
        });
      } catch (error) {
        console.warn(`Could not read stash ${sha}:`, error);
      }
    }

    return stashes;
  } catch (error) {
    console.error("Error listing stashes:", error);
    return [];
  }
};

export const stash = async (repoPath: string, message: string) => {
  try {
    // Get the status matrix to find all changed files
    const statusMatrix = await git.statusMatrix({
      fs,
      dir: repoPath,
    });

    // Check if there are any changes to stash
    const hasChanges = statusMatrix.some(([_, head, workdir, stage]) => {
      return !(head === 1 && workdir === 1 && stage === 1);
    });

    if (!hasChanges) {
      return { success: false, message: "No changes to stash" };
    }

    // Stage all files (including unstaged and untracked)
    for (const [filepath, head, workdir, stage] of statusMatrix) {
      // Skip unmodified files
      if (head === 1 && workdir === 1 && stage === 1) continue;

      // Stage the file if it exists in workdir (this includes untracked files)
      // Untracked: head=0, workdir=2, stage=0
      // Modified unstaged: head=1, workdir=2, stage=1
      // Already staged: head=1, workdir=2, stage=2 (will stage again to ensure it's included)
      if (workdir === 2) {
        await git.add({
          fs,
          dir: repoPath,
          filepath,
        });
      } else if (workdir === 0 && head === 1) {
        // Deleted files - stage the deletion using git.remove
        // This removes the file from the index (stages the deletion)
        await git.remove({
          fs,
          dir: repoPath,
          filepath,
        });
      }
    }

    // Get git config for author (use defaults if not set)
    let authorName = "User";
    let authorEmail = "user@example.com";

    try {
      authorName =
        (await git.getConfig({ fs, dir: repoPath, path: "user.name" })) ||
        "User";
      authorEmail =
        (await git.getConfig({ fs, dir: repoPath, path: "user.email" })) ||
        "user@example.com";
    } catch (error) {
      console.warn("Could not get git config, using defaults");
    }

    // Create a commit with the stash message
    const sha = await git.commit({
      fs,
      dir: repoPath,
      message,
      author: {
        name: authorName,
        email: authorEmail,
      },
    });

    // Get current branch BEFORE we do anything that might detach HEAD
    const gitDir = path.join(repoPath, ".git");
    const currentBranch = await git.currentBranch({
      fs,
      dir: repoPath,
      fullname: false,
    });

    // Get the commit we just created
    const stashCommit = await git.readCommit({
      fs,
      dir: repoPath,
      oid: sha,
    });

    // Save stash reference
    const stashDir = path.join(gitDir, "refs", "stash");
    if (!fs.existsSync(stashDir)) {
      fs.mkdirSync(stashDir, { recursive: true });
    }

    // Save stash with timestamp as filename
    const stashFile = path.join(stashDir, Date.now().toString());
    fs.writeFileSync(stashFile, sha);

    // Reset to the parent commit (before the stash commit)
    const parentOid = stashCommit.commit.parent[0];

    if (parentOid && currentBranch) {
      // Update the branch ref to point to parent FIRST (before checkout)
      const branchRefPath = path.join(gitDir, "refs", "heads", currentBranch);
      fs.writeFileSync(branchRefPath, parentOid);

      // Now checkout the parent commit's tree (using branch name to avoid detached HEAD)
      await git.checkout({
        fs,
        dir: repoPath,
        ref: currentBranch,
        force: true,
      });

      // Reset the index to match HEAD
      const statusMatrixAfter = await git.statusMatrix({
        fs,
        dir: repoPath,
      });

      for (const [filepath] of statusMatrixAfter) {
        try {
          await git.resetIndex({
            fs,
            dir: repoPath,
            filepath,
          });
        } catch (error) {
          // Ignore errors for untracked files
        }
      }
    }

    return { success: true, sha, message: "Changes stashed successfully" };
  } catch (error) {
    console.error("Error stashing changes:", error);
    throw error;
  }
};

export const popStash = async (repoPath: string, index: number) => {
  try {
    const gitDir = path.join(repoPath, ".git");
    const stashDir = path.join(gitDir, "refs", "stash");

    if (!fs.existsSync(stashDir)) {
      return { success: false, message: "No stashes found" };
    }

    // Read all stash files
    const stashFiles = fs.readdirSync(stashDir);
    stashFiles.sort((a, b) => parseInt(b) - parseInt(a));

    if (index >= stashFiles.length) {
      return { success: false, message: "Stash not found" };
    }

    const stashFile = stashFiles[index];
    const stashPath = path.join(stashDir, stashFile);
    const sha = fs.readFileSync(stashPath, "utf8").trim();

    // Read the stash commit
    const stashCommit = await git.readCommit({
      fs,
      dir: repoPath,
      oid: sha,
    });

    // Get the tree from the stash commit
    const { tree: stashTree } = stashCommit.commit;

    // Get all files from the stash tree
    const stashFiles_set = new Set<string>();
    async function collectStashFiles(treeOid: string, basePath: string = "") {
      const { tree: treeEntries } = await git.readTree({
        fs,
        dir: repoPath,
        oid: treeOid,
      });

      for (const entry of treeEntries) {
        const filepath = basePath ? `${basePath}/${entry.path}` : entry.path;

        if (entry.type === "tree") {
          await collectStashFiles(entry.oid, filepath);
        } else if (entry.type === "blob") {
          stashFiles_set.add(filepath);
        }
      }
    }
    await collectStashFiles(stashTree);

    // Get all files from current HEAD tree to find deletions
    const headFiles_set = new Set<string>();
    try {
      const headOid = await git.resolveRef({ fs, dir: repoPath, ref: "HEAD" });
      const headCommit = await git.readCommit({
        fs,
        dir: repoPath,
        oid: headOid,
      });

      async function collectHeadFiles(treeOid: string, basePath: string = "") {
        const { tree: treeEntries } = await git.readTree({
          fs,
          dir: repoPath,
          oid: treeOid,
        });

        for (const entry of treeEntries) {
          const filepath = basePath ? `${basePath}/${entry.path}` : entry.path;

          if (entry.type === "tree") {
            await collectHeadFiles(entry.oid, filepath);
          } else if (entry.type === "blob") {
            headFiles_set.add(filepath);
          }
        }
      }
      await collectHeadFiles(headCommit.commit.tree);
    } catch (error) {
      // No HEAD commit yet, that's okay
    }

    // Delete files that exist in HEAD but not in stash (these were deleted in the stash)
    for (const filepath of headFiles_set) {
      if (!stashFiles_set.has(filepath)) {
        const fullPath = path.join(repoPath, filepath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    }

    // Recursively restore all files from the stash commit's tree
    async function restoreTree(treeOid: string, basePath: string = "") {
      const { tree: treeEntries } = await git.readTree({
        fs,
        dir: repoPath,
        oid: treeOid,
      });

      for (const entry of treeEntries) {
        const filepath = basePath ? `${basePath}/${entry.path}` : entry.path;

        if (entry.type === "tree") {
          // It's a directory, recurse into it
          const dirPath = path.join(repoPath, filepath);
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }
          await restoreTree(entry.oid, filepath);
        } else if (entry.type === "blob") {
          // It's a file, restore it
          const { blob } = await git.readBlob({
            fs,
            dir: repoPath,
            oid: entry.oid,
          });
          const fullPath = path.join(repoPath, filepath);
          fs.writeFileSync(fullPath, blob);
        }
      }
    }

    // Restore all files from the stash
    await restoreTree(stashTree);

    // Delete the stash file
    fs.unlinkSync(stashPath);

    return { success: true, message: "Stash popped successfully" };
  } catch (error) {
    console.error("Error popping stash:", error);
    throw error;
  }
};

export const deleteStash = async (repoPath: string, index: number) => {
  try {
    const gitDir = path.join(repoPath, ".git");
    const stashDir = path.join(gitDir, "refs", "stash");

    if (!fs.existsSync(stashDir)) {
      return { success: false, message: "No stashes found" };
    }

    // Read all stash files
    const stashFiles = fs.readdirSync(stashDir);
    stashFiles.sort((a, b) => parseInt(b) - parseInt(a));

    if (index >= stashFiles.length) {
      return { success: false, message: "Stash not found" };
    }

    const stashFile = stashFiles[index];
    const stashPath = path.join(stashDir, stashFile);

    // Delete the stash file
    fs.unlinkSync(stashPath);

    return { success: true, message: "Stash deleted successfully" };
  } catch (error) {
    console.error("Error deleting stash:", error);
    throw error;
  }
};

export const stageLines = async (
  repoPath: string,
  filepath: string,
  lines: Array<{ type: string; content: string; lineNumber: number }>
) => {
  try {
    const line = lines[0];

    if (line.type === "context") {
      return { success: true };
    }

    // Get the current diff between working directory and index
    const fullPath = path.join(repoPath, filepath);
    if (!fs.existsSync(fullPath)) {
      throw new Error("File does not exist");
    }

    // Read current file content and HEAD content to build a targeted patch
    const workdirContent = fs.readFileSync(fullPath, "utf8");
    const workdirLines = workdirContent.split("\n");

    let headContent = "";
    try {
      const headOid = await git.resolveRef({
        fs,
        dir: repoPath,
        ref: "HEAD",
      });
      const { blob } = await git.readBlob({
        fs,
        dir: repoPath,
        oid: headOid,
        filepath,
      });
      headContent = new TextDecoder().decode(blob);
    } catch {
      headContent = "";
    }
    const headLines = headContent.split("\n");

    // Build a patch that includes only the selected line
    // We'll create a minimal valid patch
    const patchLines: string[] = [];
    patchLines.push(`diff --git a/${filepath} b/${filepath}`);
    patchLines.push(`index 0000000..0000000 100644`);
    patchLines.push(`--- a/${filepath}`);
    patchLines.push(`+++ b/${filepath}`);

    // Find the position and context for our line
    const targetLineIdx = line.lineNumber - 1;
    const contextBefore = 3;
    const contextAfter = 3;

    if (line.type === "add") {
      // For additions, we need to show where to insert
      const startIdx = Math.max(0, targetLineIdx - contextBefore);
      const endIdx = Math.min(
        workdirLines.length,
        targetLineIdx + contextAfter + 1
      );

      const oldStart = startIdx + 1;
      const oldLines = endIdx - startIdx - 1; // Don't count the new line
      const newStart = startIdx + 1;
      const newLines = endIdx - startIdx;

      patchLines.push(
        `@@ -${oldStart},${oldLines} +${newStart},${newLines} @@`
      );

      for (let i = startIdx; i < endIdx; i++) {
        if (i === targetLineIdx) {
          patchLines.push(`+${workdirLines[i]}`);
        } else if (i < targetLineIdx) {
          patchLines.push(` ${headLines[i] || workdirLines[i] || ""}`);
        } else {
          patchLines.push(` ${workdirLines[i] || ""}`);
        }
      }
    } else if (line.type === "delete") {
      // For deletions, we show the line being removed
      const startIdx = Math.max(0, targetLineIdx - contextBefore);
      const endIdx = Math.min(
        headLines.length,
        targetLineIdx + contextAfter + 1
      );

      const oldStart = startIdx + 1;
      const oldLines = endIdx - startIdx;
      const newStart = startIdx + 1;
      const newLines = endIdx - startIdx - 1; // One less due to deletion

      patchLines.push(
        `@@ -${oldStart},${oldLines} +${newStart},${newLines} @@`
      );

      for (let i = startIdx; i < endIdx; i++) {
        if (i === targetLineIdx) {
          patchLines.push(`-${headLines[i]}`);
        } else {
          patchLines.push(` ${headLines[i] || ""}`);
        }
      }
    }

    const patchContent = patchLines.join("\n") + "\n";
    const tempPatchPath = path.join(repoPath, ".git", "temp_stage.patch");
    fs.writeFileSync(tempPatchPath, patchContent);

    try {
      execSync(`git apply --cached "${tempPatchPath}"`, {
        cwd: repoPath,
        stdio: "pipe",
      });
    } catch (applyError) {
      console.error(
        "Patch application failed, falling back to full file staging"
      );
      // Fallback: stage the whole file
      await git.add({ fs, dir: repoPath, filepath });
    } finally {
      if (fs.existsSync(tempPatchPath)) {
        fs.unlinkSync(tempPatchPath);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error staging lines:", error);
    throw error;
  }
};

export const unstageLines = async (
  repoPath: string,
  filepath: string,
  lines: Array<{ type: string; content: string; lineNumber: number }>
) => {
  try {
    // For unstaging, we apply the reverse of what was staged
    // Simply unstage the whole file for now
    // True line-level unstaging requires reconstructing the index state
    await git.resetIndex({ fs, dir: repoPath, filepath });

    return { success: true };
  } catch (error) {
    console.error("Error unstaging lines:", error);
    throw error;
  }
};

export const createRepository = async (
  parentPath: string,
  repoName: string
) => {
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
  username?: string,
  password?: string,
  saveCredentials: boolean = true
) => {
  try {
    // Build the clone URL with credentials if provided
    let cloneUrl = url;
    const isHttpsUrl = url.startsWith("https://") || url.startsWith("http://");

    if (username && password && isHttpsUrl) {
      // Only inject credentials for HTTPS/HTTP URLs
      // SSH URLs use keys, not username/password

      // Parse URL and STRIP any existing credentials to avoid double-injection
      const urlObj = new URL(url);
      urlObj.username = encodeURIComponent(username);
      urlObj.password = encodeURIComponent(password);
      cloneUrl = urlObj.toString();
    } else if (isHttpsUrl) {
      // No credentials provided, but URL might have embedded credentials
      // Just use the URL as-is (embedded credentials will be used by git)
      cloneUrl = url;
    }

    // Build git command with credential helper config
    let gitCommand = "git";
    if (!saveCredentials && isHttpsUrl) {
      // Only apply credential helper config for HTTPS URLs
      // SSH doesn't use credential helpers
      gitCommand = `git -c "credential.helper="`;
    }

    // Execute git clone asynchronously
    await execAsync(`${gitCommand} clone "${cloneUrl}" "${destination}"`, {
      encoding: "utf8",
    });

    return { success: true, path: destination };
  } catch (error: any) {
    console.error("Error cloning repository:", error);

    // execAsync errors include stderr which has the actual git error
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
      (lowerError.includes("repository") &&
        lowerError.includes("does not exist")) ||
      lowerError.includes("authentication required") ||
      lowerError.includes("could not read username") ||
      lowerError.includes("could not read password")
    ) {
      cleanError =
        "Authentication required. Please provide your credentials to access this repository.";
      isAuthError = true;
    }
    // Permission denied
    else if (
      lowerError.includes("permission denied") ||
      lowerError.includes("access denied")
    ) {
      cleanError =
        "Permission denied. You don't have access to this repository.";
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
      const fatalLine = lines.find(
        (line) => line.includes("fatal:") || line.includes("error:")
      );
      if (fatalLine) {
        let extracted = fatalLine.replace(/^.*?(fatal:|error:)\s*/i, "");
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
    if (
      lowerError.includes("permission denied") &&
      lowerError.includes("publickey")
    ) {
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
    const { stdout } = await execAsync("git remote get-url origin", {
      cwd: repoPath,
      encoding: "utf8",
    });
    return { success: true, url: String(stdout).trim() };
  } catch (error: any) {
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
  username?: string | null,
  password?: string | null,
  saveCredentials: boolean = true
) => {
  // Wrap entire handler to ensure we NEVER throw across IPC boundary
  try {
    let originalRemoteUrl: string | null = null;

    // Verify the repo path exists
    if (!fs.existsSync(repoPath)) {
      return {
        success: false,
        error: "Repository path does not exist.",
        needsAuth: false,
      };
    }

    const gitPath = path.join(repoPath, ".git");
    if (!fs.existsSync(gitPath)) {
      return {
        success: false,
        error: "Not a valid Git repository.",
        needsAuth: false,
      };
    }

    // Get remote URL to check if it's HTTPS
    let remoteUrl = "";
    try {
      const { stdout } = await execAsync("git remote get-url origin", {
        cwd: repoPath,
        encoding: "utf8",
      });
      remoteUrl = stdout.trim();
      originalRemoteUrl = remoteUrl;
    } catch (error) {
      // No remote configured
      return {
        success: false,
        error: "No remote repository configured.",
        needsAuth: false,
      };
    }

    const isHttpsUrl =
      remoteUrl.startsWith("https://") || remoteUrl.startsWith("http://");

    // Build git command with credentials if provided
    let gitCommand = "git";
    let fetchCommand = "fetch --all --prune";

    // Check if credentials are provided (not null, undefined, or empty)
    if (username && password && isHttpsUrl) {
      // For HTTPS URLs with credentials, temporarily set the remote URL with embedded credentials
      try {
        const urlObj = new URL(remoteUrl);
        urlObj.username = encodeURIComponent(username);
        urlObj.password = encodeURIComponent(password);
        const authenticatedUrl = urlObj.toString();

        // Use -c credential.helper to manage credential storage
        if (!saveCredentials) {
          gitCommand = `git -c "credential.helper="`;
        }

        // Temporarily update the remote URL, fetch, then restore it
        await execAsync(`git remote set-url origin "${authenticatedUrl}"`, {
          cwd: repoPath,
          encoding: "utf8",
        });

        try {
          await execAsync(`${gitCommand} ${fetchCommand}`, {
            cwd: repoPath,
            encoding: "utf8",
          });
        } catch (fetchError: any) {
          // Restore original URL before re-throwing
          if (originalRemoteUrl) {
            try {
              await execAsync(
                `git remote set-url origin "${originalRemoteUrl}"`,
                {
                  cwd: repoPath,
                  encoding: "utf8",
                }
              );
            } catch (restoreError) {
              console.error(
                "Failed to restore original remote URL:",
                restoreError
              );
            }
          }
          throw fetchError;
        }

        // Restore original URL after successful fetch
        if (originalRemoteUrl) {
          try {
            await execAsync(
              `git remote set-url origin "${originalRemoteUrl}"`,
              {
                cwd: repoPath,
                encoding: "utf8",
              }
            );
          } catch (restoreError) {
            console.error(
              "Failed to restore original remote URL:",
              restoreError
            );
          }
        }
      } catch (error: any) {
        // If URL parsing or remote setting fails, return a clean error
        const errorMessage = error.stderr || error.message || String(error);
        const lowerError = errorMessage.toLowerCase();

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

        return {
          success: false,
          error: `Failed to configure authentication: ${errorMessage}`,
          needsAuth: false,
        };
      }
    } else {
      // No credentials or SSH URL - fetch normally
      if (!saveCredentials && isHttpsUrl) {
        gitCommand = `git -c "credential.helper="`;
      }

      await execAsync(`${gitCommand} ${fetchCommand}`, {
        cwd: repoPath,
        encoding: "utf8",
      });
    }

    return { success: true };
  } catch (error: any) {
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
  username?: string | null,
  password?: string | null,
  saveCredentials: boolean = true
) => {
  // Wrap entire handler to ensure we NEVER throw across IPC boundary
  try {
    let originalRemoteUrl: string | null = null;

    // Verify the repo path exists
    if (!fs.existsSync(repoPath)) {
      return {
        success: false,
        error: "Repository path does not exist.",
        needsAuth: false,
      };
    }

    const gitPath = path.join(repoPath, ".git");
    if (!fs.existsSync(gitPath)) {
      return {
        success: false,
        error: "Not a valid Git repository.",
        needsAuth: false,
      };
    }

    // Get remote URL to check if it's HTTPS
    let remoteUrl = "";
    try {
      const { stdout } = await execAsync("git remote get-url origin", {
        cwd: repoPath,
        encoding: "utf8",
      });
      remoteUrl = stdout.trim();
      originalRemoteUrl = remoteUrl;
    } catch (error) {
      // No remote configured
      return {
        success: false,
        error: "No remote repository configured.",
        needsAuth: false,
      };
    }

    const isHttpsUrl =
      remoteUrl.startsWith("https://") || remoteUrl.startsWith("http://");

    // Build git command with credentials if provided
    let gitCommand = "git";
    let pushCommand = "push";

    // Check if credentials are provided (not null, undefined, or empty)
    if (username && password && isHttpsUrl) {
      // For HTTPS URLs with credentials, temporarily set the remote URL with embedded credentials
      try {
        const urlObj = new URL(remoteUrl);
        urlObj.username = encodeURIComponent(username);
        urlObj.password = encodeURIComponent(password);
        const authenticatedUrl = urlObj.toString();

        // Use -c credential.helper to manage credential storage
        if (!saveCredentials) {
          gitCommand = `git -c "credential.helper="`;
        }

        // Temporarily update the remote URL, push, then restore it
        await execAsync(`git remote set-url origin "${authenticatedUrl}"`, {
          cwd: repoPath,
          encoding: "utf8",
        });

        try {
          await execAsync(`${gitCommand} ${pushCommand}`, {
            cwd: repoPath,
            encoding: "utf8",
          });
        } catch (pushError: any) {
          // Restore original URL before re-throwing
          if (originalRemoteUrl) {
            try {
              await execAsync(
                `git remote set-url origin "${originalRemoteUrl}"`,
                {
                  cwd: repoPath,
                  encoding: "utf8",
                }
              );
            } catch (restoreError) {
              console.error(
                "Failed to restore original remote URL:",
                restoreError
              );
            }
          }
          throw pushError;
        }

        // Restore original URL after successful push
        if (originalRemoteUrl) {
          try {
            await execAsync(
              `git remote set-url origin "${originalRemoteUrl}"`,
              {
                cwd: repoPath,
                encoding: "utf8",
              }
            );
          } catch (restoreError) {
            console.error(
              "Failed to restore original remote URL:",
              restoreError
            );
          }
        }
      } catch (error: any) {
        // If URL parsing or remote setting fails, return a clean error
        const errorMessage = error.stderr || error.message || String(error);
        const lowerError = errorMessage.toLowerCase();

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

        return {
          success: false,
          error: `Failed to configure authentication: ${errorMessage}`,
          needsAuth: false,
        };
      }
    } else {
      // No credentials or SSH URL - push normally
      if (!saveCredentials && isHttpsUrl) {
        gitCommand = `git -c "credential.helper="`;
      }

      await execAsync(`${gitCommand} ${pushCommand}`, {
        cwd: repoPath,
        encoding: "utf8",
      });
    }

    return { success: true };
  } catch (error: any) {
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
    } else if (
      lowerError.includes("failed to push") ||
      lowerError.includes("rejected")
    ) {
      // Check for common push rejection scenarios
      if (lowerError.includes("non-fast-forward")) {
        cleanError = "Push rejected: Remote has changes. Please pull first.";
      } else if (lowerError.includes("fetch first")) {
        cleanError =
          "Push rejected: Remote has changes. Please fetch/pull first.";
      } else {
        cleanError =
          "Push rejected. The remote may have changes or you may need to pull first.";
      }
    } else if (
      lowerError.includes("no upstream") ||
      lowerError.includes("no tracking")
    ) {
      cleanError =
        "No upstream branch configured. Use 'git push --set-upstream' first.";
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
  username?: string | null,
  password?: string | null,
  saveCredentials: boolean = true,
  branchName?: string
) => {
  // Wrap entire handler to ensure we NEVER throw across IPC boundary
  try {
    let originalRemoteUrl: string | null = null;

    // Verify the repo path exists
    if (!fs.existsSync(repoPath)) {
      return {
        success: false,
        error: "Repository path does not exist.",
        needsAuth: false,
      };
    }

    const gitPath = path.join(repoPath, ".git");
    if (!fs.existsSync(gitPath)) {
      return {
        success: false,
        error: "Not a valid Git repository.",
        needsAuth: false,
      };
    }

    // Get remote URL to check if it's HTTPS
    let remoteUrl = "";
    try {
      const { stdout } = await execAsync("git remote get-url origin", {
        cwd: repoPath,
        encoding: "utf8",
      });
      remoteUrl = stdout.trim();
      originalRemoteUrl = remoteUrl;
    } catch (error) {
      // No remote configured
      return {
        success: false,
        error: "No remote repository configured.",
        needsAuth: false,
      };
    }

    const isHttpsUrl =
      remoteUrl.startsWith("https://") || remoteUrl.startsWith("http://");

    // Build git command with credentials if provided
    let gitCommand = "git";
    // If branchName is provided, use fetch to update specific branch without checking it out
    // Otherwise, use pull to update and merge current branch
    const gitOperation = branchName
      ? `fetch origin ${branchName}:${branchName}`
      : "pull";

    // Check if credentials are provided (not null, undefined, or empty)
    if (username && password && isHttpsUrl) {
      // For HTTPS URLs with credentials, temporarily set the remote URL with embedded credentials
      try {
        const urlObj = new URL(remoteUrl);
        urlObj.username = encodeURIComponent(username);
        urlObj.password = encodeURIComponent(password);
        const authenticatedUrl = urlObj.toString();

        // Use -c credential.helper to manage credential storage
        if (!saveCredentials) {
          gitCommand = `git -c "credential.helper="`;
        }

        // Temporarily update the remote URL, execute git operation, then restore it
        await execAsync(`git remote set-url origin "${authenticatedUrl}"`, {
          cwd: repoPath,
          encoding: "utf8",
        });

        try {
          await execAsync(`${gitCommand} ${gitOperation}`, {
            cwd: repoPath,
            encoding: "utf8",
          });
        } catch (operationError: any) {
          // Restore original URL before re-throwing
          if (originalRemoteUrl) {
            try {
              await execAsync(
                `git remote set-url origin "${originalRemoteUrl}"`,
                {
                  cwd: repoPath,
                  encoding: "utf8",
                }
              );
            } catch (restoreError) {
              console.error(
                "Failed to restore original remote URL:",
                restoreError
              );
            }
          }
          throw operationError;
        }

        // Restore original URL after successful operation
        if (originalRemoteUrl) {
          try {
            await execAsync(
              `git remote set-url origin "${originalRemoteUrl}"`,
              {
                cwd: repoPath,
                encoding: "utf8",
              }
            );
          } catch (restoreError) {
            console.error(
              "Failed to restore original remote URL:",
              restoreError
            );
          }
        }
      } catch (error: any) {
        // If URL parsing or remote setting fails, return a clean error
        const errorMessage = error.stderr || error.message || String(error);
        const lowerError = errorMessage.toLowerCase();

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

        return {
          success: false,
          error: `Failed to configure authentication: ${errorMessage}`,
          needsAuth: false,
        };
      }
    } else {
      // No credentials or SSH URL - execute git operation normally
      if (!saveCredentials && isHttpsUrl) {
        gitCommand = `git -c "credential.helper="`;
      }

      await execAsync(`${gitCommand} ${gitOperation}`, {
        cwd: repoPath,
        encoding: "utf8",
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error(
      branchName ? "Error pulling branch:" : "Error pulling from remote:",
      error
    );

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
      if (
        lowerError.includes("rejected") ||
        lowerError.includes("non-fast-forward")
      ) {
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
        cleanError =
          "Pull resulted in merge conflicts. Please resolve conflicts manually.";
      } else if (
        lowerError.includes("uncommitted changes") ||
        lowerError.includes("overwritten by merge")
      ) {
        cleanError =
          "You have uncommitted changes. Please commit or stash them before pulling.";
      } else if (
        lowerError.includes("no tracking information") ||
        lowerError.includes("no upstream")
      ) {
        cleanError =
          "No upstream branch configured. Please set up tracking first.";
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
  username?: string | null,
  password?: string | null,
  saveCredentials: boolean = true
) => {
  return pull(repoPath, username, password, saveCredentials);
};

export const pullNonCurrentBranch = async (
  repoPath: string,
  branchName: string,
  username?: string | null,
  password?: string | null,
  saveCredentials: boolean = true
) => {
  return pull(repoPath, username, password, saveCredentials, branchName);
};
