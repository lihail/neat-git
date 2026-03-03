import path from "node:path";
import fs from "node:fs";
import { FileChange } from "../../src/types/electron";
import { execGitCommand } from "./dugite";

export const RENAME_SIMILARITY_PERFECT_SCORE = 100;
export const RENAME_SIMILARITY_THRESHOLD = 50;

const getStatusByCode = (code: string): FileChange["status"] | undefined => {
  if (code === ".") {
    return undefined;
  } else if (code === "D") {
    return "deleted";
  } else if (code === "A") {
    return "added";
  }
  return "modified";
};

const createGhostCommit = async (
  repoPath: string,
  commandEnv: Record<string, string>
): Promise<string> => {
  try {
    // Write the current (real) index to a tree object. This returns a SHA-1 hash of the tree
    const treeResult = await execGitCommand(["write-tree"], repoPath, commandEnv);
    if (!treeResult.success) {
      throw new Error(`Failed to write tree: ${treeResult.error.message}`);
    }
    const treeSha = treeResult.output.trim();

    // Create a commit object using that tree. We point it to the current HEAD as its parent
    const commitResult = await execGitCommand(
      ["commit-tree", treeSha, "-p", "HEAD", "-m", "temp commit for rename check"],
      repoPath,
      commandEnv
    );
    if (!commitResult.success) {
      throw new Error(`Failed to commit tree: ${commitResult.error.message}`);
    }

    return commitResult.output.trim();
  } catch (error) {
    console.error("Failed to create ghost commit:", error);
    throw error;
  }
};

const isValidUnstagedRenameFilePair = (
  pair: { oldFilePath: string; newFilePath: string },
  stagedFiles: Map<string, FileChange>
) => {
  const stagedOldFileStatus = stagedFiles.get(pair.oldFilePath)?.status;
  const stagedNewFileStatus = stagedFiles.get(pair.newFilePath)?.status;
  return !(stagedOldFileStatus === "deleted" || stagedNewFileStatus === "added");
};

export const parseOrdinaryChange = (line: string): FileChange => {
  // Ordinary changed entry: 1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>
  const parts = line.split(" ");
  const xy = parts[1];
  const filePath = parts.slice(8).join(" ");

  const stagedCode = xy[0];
  const unstagedCode = xy[1];

  const hasStaged = stagedCode !== ".";
  const hasUnstaged = unstagedCode !== ".";

  const status = getStatusByCode(stagedCode);
  const unstagedStatus = getStatusByCode(unstagedCode);

  return {
    path: filePath,
    status,
    unstagedStatus,
    hasStaged,
    hasUnstaged,
  };
};

export const parseRenameChange = (line: string): FileChange => {
  // Renamed entry: 2 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <X><score> <path>\t<origPath>
  const parts = line.split(" ");
  const xy = parts[1];
  const renameInfo = parts[8];
  const pathPart = parts.slice(9).join(" ");
  const [newPath, oldPath] = pathPart.split("\t");

  const stagedCode = xy[0];
  const unstagedCode = xy[1];

  const hasStaged = stagedCode !== ".";
  const hasUnstaged = unstagedCode !== ".";

  const similarity = parseInt(renameInfo.slice(1), 10);
  const status = similarity === RENAME_SIMILARITY_PERFECT_SCORE ? "renamed-only" : "modified";

  const unstagedStatus = getStatusByCode(unstagedCode);

  return {
    path: newPath,
    status,
    unstagedStatus,
    hasStaged,
    hasUnstaged,
    stagedOldPath: oldPath,
  };
};

export const parseUntrackedFileChange = (line: string): FileChange => {
  // Untracked file: ? <path>
  const filePath = line.slice(2);

  return {
    path: filePath,
    unstagedStatus: "added",
    hasStaged: false,
    hasUnstaged: true,
  };
};

export const detectUnstagedRenames = async (
  stagedFiles: Map<string, FileChange>,
  repoPath: string
): Promise<FileChange[]> => {
  // Use a temporary index file so we don't touch the user's real staging area
  const absoluteRepoPath = path.resolve(repoPath);
  const realIndexPath = path.join(absoluteRepoPath, ".git", "index");
  const tempIndexPath = path.join(absoluteRepoPath, ".git", `rename_check_index_${Date.now()}`);
  const gitTempIndexEnv = {
    GIT_INDEX_FILE: tempIndexPath,
  };

  try {
    if (fs.existsSync(realIndexPath)) {
      fs.copyFileSync(realIndexPath, tempIndexPath);
    }

    // Create a commit from the current staged changes so we could stage the unstaged changes later
    // Without them merging with the current staged changes. This is useful, for example, for
    // detecting unstaged renames on new, staged files
    const ghostCommitSha = await createGhostCommit(repoPath, gitTempIndexEnv);

    // Stage everything so we could use git diff later to detect renames (git diff can detect
    // renames only on staged changes)
    const stageResult = await execGitCommand(["add", "-A"], repoPath, gitTempIndexEnv);
    if (!stageResult.success) {
      throw new Error(`Failed to stage all files: ${stageResult.error.message}`);
    }

    const diffResult = await execGitCommand(
      [
        "-c",
        "core.quotepath=false",
        "diff",
        "--cached",
        "--name-status",
        `-M${RENAME_SIMILARITY_THRESHOLD}%`,
        ghostCommitSha,
      ],
      repoPath,
      gitTempIndexEnv
    );
    if (!diffResult.success) {
      throw new Error(`Failed to get diff: ${diffResult.error.message}`);
    }

    const renameFilePairs = diffResult.output
      .trim()
      .split("\n")
      .filter((line) => line.startsWith("R"))
      .map((line) => {
        const [statusPart, oldFilePath, newFilePath] = line.split("\t");
        return {
          similarity: parseInt(statusPart.slice(1), 10),
          oldFilePath,
          newFilePath,
        };
      });

    const unstagedRenames: FileChange[] = renameFilePairs
      .filter((pair) => isValidUnstagedRenameFilePair(pair, stagedFiles))
      .map((pair) => ({
        path: pair.newFilePath,
        unstagedStatus:
          pair.similarity === RENAME_SIMILARITY_PERFECT_SCORE ? "renamed-only" : "modified",
        hasStaged: false,
        hasUnstaged: true,
        unstagedOldPath: pair.oldFilePath,
      }));

    return unstagedRenames;
  } catch {
    return [];
  } finally {
    // Cleanup the temporary index
    if (fs.existsSync(tempIndexPath)) {
      fs.unlinkSync(tempIndexPath);
    }
  }
};
