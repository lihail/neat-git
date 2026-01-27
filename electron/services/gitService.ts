import path from "node:path";
import fs from "node:fs";
import * as git from "isomorphic-git";
import { execGitCommand } from "./dugiteService";
import { listFilesRecursively } from "../utils/files";

type FileStatus = {
  path: string;
  status: "modified" | "added" | "deleted";
  hasStaged: boolean;
  hasUnstaged: boolean;
  oldPath?: string;
  unstagedStatus?: "modified" | "added" | "deleted";
};

export const getGlobalConfig = async () => {
  try {
    let userName = "";
    let userEmail = "";

    const nameResult = await execGitCommand(["config", "--global", "user.name"]);
    if (nameResult.success) {
      userName = nameResult.output.trim();
    }

    const emailResult = await execGitCommand(["config", "--global", "user.email"]);
    if (emailResult.success) {
      userEmail = emailResult.output.trim();
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
    console.error("Error details:", error instanceof Error ? error.stack : error);
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

    // Use git status --porcelain=v2 for rename detection
    // -M flag enables rename detection with default 50% similarity threshold
    const statusResult = await execGitCommand(["status", "--porcelain=v2", "-M"], repoPath);
    if (!statusResult.success) {
      throw new Error(`git status failed: ${statusResult.error}`);
    }
    const statusOutput = statusResult.output;

    const fileMap = new Map<string, FileStatus>();

    const lines = statusOutput.trim().split("\n").filter(Boolean);

    for (const line of lines) {
      // Porcelain v2 format:
      // 1 <XY> ... <path> - ordinary changed entries
      // 2 <XY> ... <path>\t<origPath> - renamed/copied entries
      // ? <path> - untracked files

      if (line.startsWith("1 ")) {
        // Ordinary changed entry: 1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>
        const parts = line.split(" ");
        const xy = parts[1];
        const hashHead = parts[6]; // Content hash in HEAD
        const hashIndex = parts[7]; // Content hash in index (staged)
        const filePath = parts.slice(8).join(" ");

        const stagedCode = xy[0];
        const unstagedCode = xy[1];

        // Check if staged change is mode-only (no content change)
        // If hashes match but staged code shows change, it's mode-only
        const isModeOnlyStaged = stagedCode !== "." && hashHead === hashIndex;

        // Filter out mode-only staged changes
        const hasStaged = stagedCode !== "." && !isModeOnlyStaged;
        const hasUnstaged = unstagedCode !== ".";

        // Skip entirely if only mode changed and no unstaged changes
        if (isModeOnlyStaged && !hasUnstaged) {
          continue;
        }

        // Determine staged status based on staged code
        let status: "modified" | "added" | "deleted";
        if (stagedCode === "D") {
          status = "deleted";
        } else if (stagedCode === "A") {
          status = "added";
        } else if (stagedCode === "M" || stagedCode === "T") {
          status = "modified";
        } else {
          // Fallback for when there's no staged change - use unstaged code
          if (unstagedCode === "D") {
            status = "deleted";
          } else if (unstagedCode === "A") {
            status = "added";
          } else {
            status = "modified";
          }
        }

        // Determine unstaged status if there are unstaged changes
        let unstagedStatus: "modified" | "added" | "deleted" | undefined;
        if (hasUnstaged) {
          if (unstagedCode === "D") {
            unstagedStatus = "deleted";
          } else if (unstagedCode === "A") {
            unstagedStatus = "added";
          } else if (unstagedCode === "M" || unstagedCode === "T") {
            unstagedStatus = "modified";
          }
        }

        fileMap.set(filePath, {
          path: filePath,
          status,
          hasStaged,
          hasUnstaged,
          unstagedStatus,
        });
      } else if (line.startsWith("2 ")) {
        // Renamed entry: 2 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <X><score> <path>\t<origPath>
        const parts = line.split(" ");
        const xy = parts[1];
        const renameInfo = parts[8]; // e.g., "R100" or "R095"
        const pathPart = parts.slice(9).join(" ");
        const [newFilePath, oldFilePath] = pathPart.split("\t");

        const stagedCode = xy[0];
        const unstagedCode = xy[1];
        const hasStaged = stagedCode !== ".";
        const hasUnstaged = unstagedCode !== ".";

        // Staged status: based on rename similarity
        // - If similarity < 100%, the rename included content changes → "modified"
        // - Otherwise it's a pure rename → "added"
        const similarity = parseInt(renameInfo.slice(1), 10);
        const status: "modified" | "added" | "deleted" = similarity === 100 ? "added" : "modified";

        // Unstaged status: based on unstaged code (only if there are unstaged changes)
        let unstagedStatus: "modified" | "added" | "deleted" | undefined;
        if (hasUnstaged) {
          if (unstagedCode === "D") {
            unstagedStatus = "deleted";
          } else if (unstagedCode === "M") {
            unstagedStatus = "modified";
          } else if (unstagedCode === "A") {
            unstagedStatus = "added";
          }
        }

        fileMap.set(newFilePath, {
          path: newFilePath,
          status,
          hasStaged,
          hasUnstaged,
          oldPath: oldFilePath,
          unstagedStatus,
        });
      } else if (line.startsWith("? ")) {
        // Untracked file or directory
        const filePath = line.slice(2);

        // Check if this is a directory (ends with /)
        if (filePath.endsWith("/")) {
          // Recursively list all files within it
          const dirPath = path.join(repoPath, filePath);
          const untrackedFiles = listFilesRecursively(dirPath, filePath);
          for (const untrackedFile of untrackedFiles) {
            fileMap.set(untrackedFile, {
              path: untrackedFile,
              status: "added",
              hasStaged: false,
              hasUnstaged: true,
            });
          }
        } else {
          fileMap.set(filePath, {
            path: filePath,
            status: "added",
            hasStaged: false,
            hasUnstaged: true,
          });
        }
      }
    }

    return Array.from(fileMap.values());
  } catch (error) {
    console.error("Error getting git status:", error);
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

export const unstageChange = async (repoPath: string, filepath: string, oldFilePath?: string) => {
  try {
    const paths = oldFilePath ? [filepath, oldFilePath] : [filepath];
    await Promise.all(paths.map((path) => git.resetIndex({ fs, dir: repoPath, filepath: path })));
    return { success: true };
  } catch (error) {
    console.error("Error unstaging change:", error);
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

    // If also renaming remote, push new branch and delete old one using git CLI
    if (alsoRenameRemote && upstreamBranch) {
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
          throw new Error(`Failed to push branch during rename: ${pushResult.error}`);
        }

        // Delete the old branch from remote using the actual remote branch name
        const deleteResult = await execGitCommand(
          ["push", remoteName, "--delete", remoteBranchName],
          repoPath
        );
        if (!deleteResult.success) {
          // Check if the error is due to trying to delete the default branch
          if (deleteResult.error.includes("refusing to delete the current branch")) {
            throw new Error(
              `Local branch renamed to "${newName}" and pushed to remote, but could not delete old branch "${remoteBranchName}" because it is the default branch on the remote. Please change the default branch on your Git hosting service first, then delete "${remoteBranchName}" manually.`
            );
          }
          throw new Error(`Failed to delete remote branch during rename: ${deleteResult.error}`);
        }
      } catch (remoteError) {
        console.error("Error renaming branch on remote:", remoteError);
        throw remoteError;
      }
    } else if (upstreamBranch && !alsoRenameRemote) {
      // Not renaming on remote, just restore the existing upstream tracking
      const setUpstreamResult = await execGitCommand(
        ["branch", `--set-upstream-to=${upstreamBranch}`, newName],
        repoPath
      );
      if (!setUpstreamResult.success) {
        console.error("Error restoring upstream tracking during rename:", setUpstreamResult.error);
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
        const checkoutResult = await execGitCommand(["checkout", branchName], repoPath);
        if (!checkoutResult.success) {
          console.error("Error checking out branch:", checkoutResult.error);
          throw new Error(`Failed to checkout branch: ${checkoutResult.error}`);
        }
        console.log("Checked out branch:", checkoutResult.output);
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
          const checkoutResult = await execGitCommand(
            ["checkout", "-b", branchName, `origin/${branchName}`],
            repoPath
          );
          if (!checkoutResult.success) {
            console.error("Error creating tracking branch:", checkoutResult.error);
            throw new Error(`Failed to checkout remote branch: ${checkoutResult.error}`);
          }
          console.log("Created tracking branch:", checkoutResult.output);
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

export const commit = async (repoPath: string, message: string, description?: string) => {
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
      authorName = (await git.getConfig({ fs, dir: repoPath, path: "user.name" })) || "User";
      authorEmail =
        (await git.getConfig({ fs, dir: repoPath, path: "user.email" })) || "user@example.com";
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
  oldFilePath?: string
) => {
  try {
    let diffArgs: string[];

    if (staged && oldFilePath) {
      // For staged renamed files, compare HEAD's old path with staged new path
      diffArgs = ["diff", `-U${contextLines}`, `HEAD:${oldFilePath}`, `:${filepath}`];
    } else if (staged) {
      diffArgs = ["diff", "--cached", `-U${contextLines}`, "--", filepath];
    } else {
      diffArgs = ["diff", `-U${contextLines}`, "--", filepath];
    }

    const diffResult = await execGitCommand(diffArgs, repoPath);
    if (!diffResult.success) {
      return [];
    }
    const diffOutput = diffResult.output;

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
        // Extract starting line numbers from hunk header: @@ -oldStart,oldCount +newStart,newCount @@
        const match = line.match(/@@\s*-(\d+)(?:,\d+)?\s+\+(\d+)/);
        if (match) {
          oldLineNumber = parseInt(match[1]) - 1; // Will be incremented for first line
          newLineNumber = parseInt(match[2]) - 1; // Will be incremented for first line
        }
        continue;
      }

      if (!inHunk) continue;

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

    // Handle trailing newline representation
    // Only show empty line for trailing newline if it was actually added/removed
    const hasDeletedLines = diffLines.some((l) => l.type === "delete");
    const hasAddedLines = diffLines.some((l) => l.type === "add");

    // Add empty deleted line if:
    // - File was completely deleted (no added lines) and old file had trailing newline
    // - OR trailing newline was removed (old had it, new doesn't)
    const oldHadTrailingNewline = !oldFileHadNoNewline;
    const newHasTrailingNewline = !newFileHasNoNewline;

    if (hasDeletedLines && oldHadTrailingNewline) {
      // Only add if file is deleted OR new file lost the trailing newline
      if (!hasAddedLines || !newHasTrailingNewline) {
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

    // Add empty added line if:
    // - File was completely added (no deleted lines) and new file has trailing newline
    // - OR trailing newline was added (old didn't have it, new does)
    if (hasAddedLines && newHasTrailingNewline) {
      // Only add if file is new OR old file didn't have trailing newline
      if (!hasDeletedLines || !oldHadTrailingNewline) {
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

        if (seconds < 60) dateStr = "just now";
        else if (minutes < 60) dateStr = `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
        else if (hours < 24) dateStr = `${hours} hour${hours !== 1 ? "s" : ""} ago`;
        else if (days === 1) dateStr = "1 day ago";
        else dateStr = `${days} days ago`;
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

    // Ensure git config has author info (isomorphic-git stash requires it)
    const authorName = await git.getConfig({
      fs,
      dir: repoPath,
      path: "user.name",
    });
    const authorEmail = await git.getConfig({
      fs,
      dir: repoPath,
      path: "user.email",
    });

    if (!authorName) {
      await git.setConfig({
        fs,
        dir: repoPath,
        path: "user.name",
        value: "User",
      });
    }
    if (!authorEmail) {
      await git.setConfig({
        fs,
        dir: repoPath,
        path: "user.email",
        value: "user@example.com",
      });
    }

    await git.stash({ fs, dir: repoPath, op: "push", message });

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
          fs.writeFileSync(reflogPath, lines.join("\n") + "\n");
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
      throw new Error(`Failed to pop stash: ${result.error}`);
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
      throw new Error(`Failed to delete stash: ${result.error}`);
    }
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
      const endIdx = Math.min(workdirLines.length, targetLineIdx + contextAfter + 1);

      const oldStart = startIdx + 1;
      const oldLines = endIdx - startIdx - 1; // Don't count the new line
      const newStart = startIdx + 1;
      const newLines = endIdx - startIdx;

      patchLines.push(`@@ -${oldStart},${oldLines} +${newStart},${newLines} @@`);

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
      const endIdx = Math.min(headLines.length, targetLineIdx + contextAfter + 1);

      const oldStart = startIdx + 1;
      const oldLines = endIdx - startIdx;
      const newStart = startIdx + 1;
      const newLines = endIdx - startIdx - 1; // One less due to deletion

      patchLines.push(`@@ -${oldStart},${oldLines} +${newStart},${newLines} @@`);

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

    const applyResult = await execGitCommand(["apply", "--cached", tempPatchPath], repoPath);
    if (!applyResult.success) {
      console.error("Patch application failed, falling back to full file staging");
      // Fallback: stage the whole file
      await git.add({ fs, dir: repoPath, filepath });
    }

    if (fs.existsSync(tempPatchPath)) {
      fs.unlinkSync(tempPatchPath);
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

    // Build git args with credential helper config
    const cloneArgs: string[] = [];
    if (!saveCredentials && isHttpsUrl) {
      // Only apply credential helper config for HTTPS URLs
      // SSH doesn't use credential helpers
      cloneArgs.push("-c", "credential.helper=");
    }
    cloneArgs.push("clone", cloneUrl, destination);

    // Execute git clone
    const result = await execGitCommand(cloneArgs, process.cwd());
    if (!result.success) {
      throw { stderr: result.error, message: result.error };
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
      return { success: false, error: result.error };
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
    const remoteResult = await execGitCommand(["remote", "get-url", "origin"], repoPath);
    if (!remoteResult.success) {
      // No remote configured
      return {
        success: false,
        error: "No remote repository configured.",
        needsAuth: false,
      };
    }
    remoteUrl = remoteResult.output.trim();
    originalRemoteUrl = remoteUrl;

    const isHttpsUrl = remoteUrl.startsWith("https://") || remoteUrl.startsWith("http://");

    // Build fetch args
    const fetchArgs = ["fetch", "--all", "--prune"];

    // Check if credentials are provided (not null, undefined, or empty)
    if (username && password && isHttpsUrl) {
      // For HTTPS URLs with credentials, temporarily set the remote URL with embedded credentials
      try {
        const urlObj = new URL(remoteUrl);
        urlObj.username = encodeURIComponent(username);
        urlObj.password = encodeURIComponent(password);
        const authenticatedUrl = urlObj.toString();

        // Build fetch args with credential helper config if not saving
        const authFetchArgs = !saveCredentials
          ? ["-c", "credential.helper=", ...fetchArgs]
          : [...fetchArgs];

        // Temporarily update the remote URL, fetch, then restore it
        await execGitCommand(["remote", "set-url", "origin", authenticatedUrl], repoPath);

        const fetchResult = await execGitCommand(authFetchArgs, repoPath);

        // Restore original URL
        if (originalRemoteUrl) {
          const restoreResult = await execGitCommand(
            ["remote", "set-url", "origin", originalRemoteUrl],
            repoPath
          );
          if (!restoreResult.success) {
            console.error("Failed to restore original remote URL:", restoreResult.error);
          }
        }

        if (!fetchResult.success) {
          throw { stderr: fetchResult.error, message: fetchResult.error };
        }
      } catch (error) {
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
      const noCredFetchArgs =
        !saveCredentials && isHttpsUrl
          ? ["-c", "credential.helper=", ...fetchArgs]
          : [...fetchArgs];

      const fetchResult = await execGitCommand(noCredFetchArgs, repoPath);
      if (!fetchResult.success) {
        throw { stderr: fetchResult.error, message: fetchResult.error };
      }
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
    const remoteResult = await execGitCommand(["remote", "get-url", "origin"], repoPath);
    if (!remoteResult.success) {
      // No remote configured
      return {
        success: false,
        error: "No remote repository configured.",
        needsAuth: false,
      };
    }
    remoteUrl = remoteResult.output.trim();
    originalRemoteUrl = remoteUrl;

    const isHttpsUrl = remoteUrl.startsWith("https://") || remoteUrl.startsWith("http://");

    // Check if credentials are provided (not null, undefined, or empty)
    if (username && password && isHttpsUrl) {
      // For HTTPS URLs with credentials, temporarily set the remote URL with embedded credentials
      try {
        const urlObj = new URL(remoteUrl);
        urlObj.username = encodeURIComponent(username);
        urlObj.password = encodeURIComponent(password);
        const authenticatedUrl = urlObj.toString();

        // Build push args with credential helper config if not saving
        const authPushArgs = saveCredentials ? ["push"] : ["-c", "credential.helper=", "push"];

        // Temporarily update the remote URL, push, then restore it
        await execGitCommand(["remote", "set-url", "origin", authenticatedUrl], repoPath);

        const pushResult = await execGitCommand(authPushArgs, repoPath);

        // Restore original URL
        if (originalRemoteUrl) {
          const restoreResult = await execGitCommand(
            ["remote", "set-url", "origin", originalRemoteUrl],
            repoPath
          );
          if (!restoreResult.success) {
            console.error("Failed to restore original remote URL:", restoreResult.error);
          }
        }

        if (!pushResult.success) {
          throw { stderr: pushResult.error, message: pushResult.error };
        }
      } catch (error) {
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
      const noCredPushArgs =
        !saveCredentials && isHttpsUrl ? ["-c", "credential.helper=", "push"] : ["push"];

      const pushResult = await execGitCommand(noCredPushArgs, repoPath);
      if (!pushResult.success) {
        throw { stderr: pushResult.error, message: pushResult.error };
      }
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
    } else if (lowerError.includes("no upstream") || lowerError.includes("no tracking")) {
      cleanError = "No upstream branch configured. Use 'git push --set-upstream' first.";
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
    const remoteResult = await execGitCommand(["remote", "get-url", "origin"], repoPath);
    if (!remoteResult.success) {
      // No remote configured
      return {
        success: false,
        error: "No remote repository configured.",
        needsAuth: false,
      };
    }
    remoteUrl = remoteResult.output.trim();
    originalRemoteUrl = remoteUrl;

    const isHttpsUrl = remoteUrl.startsWith("https://") || remoteUrl.startsWith("http://");

    // If branchName is provided, use fetch to update specific branch without checking it out
    // Otherwise, use pull to update and merge current branch
    const operationArgs = branchName
      ? ["fetch", "origin", `${branchName}:${branchName}`]
      : ["pull"];

    // Check if credentials are provided (not null, undefined, or empty)
    if (username && password && isHttpsUrl) {
      // For HTTPS URLs with credentials, temporarily set the remote URL with embedded credentials
      try {
        const urlObj = new URL(remoteUrl);
        urlObj.username = encodeURIComponent(username);
        urlObj.password = encodeURIComponent(password);
        const authenticatedUrl = urlObj.toString();

        // Build args with credential helper config if not saving
        const authOperationArgs = !saveCredentials
          ? ["-c", "credential.helper=", ...operationArgs]
          : [...operationArgs];

        // Temporarily update the remote URL, execute git operation, then restore it
        await execGitCommand(["remote", "set-url", "origin", authenticatedUrl], repoPath);

        const operationResult = await execGitCommand(authOperationArgs, repoPath);

        // Restore original URL
        if (originalRemoteUrl) {
          const restoreResult = await execGitCommand(
            ["remote", "set-url", "origin", originalRemoteUrl],
            repoPath
          );
          if (!restoreResult.success) {
            console.error("Failed to restore original remote URL:", restoreResult.error);
          }
        }

        if (!operationResult.success) {
          throw {
            stderr: operationResult.error,
            message: operationResult.error,
          };
        }
      } catch (error) {
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
      const noCredOperationArgs =
        !saveCredentials && isHttpsUrl
          ? ["-c", "credential.helper=", ...operationArgs]
          : [...operationArgs];

      const operationResult = await execGitCommand(noCredOperationArgs, repoPath);
      if (!operationResult.success) {
        throw { stderr: operationResult.error, message: operationResult.error };
      }
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
