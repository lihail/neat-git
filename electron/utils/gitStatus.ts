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
  stagedFiles: Set<string>,
  repoPath: string
): Promise<FileChange[]> => {
  // Use a temporary index file so we don't touch the user's real staging area
  const tempIndex = path.join(".git", `index_rename_check_${Date.now()}`);
  process.env.GIT_INDEX_FILE = tempIndex;

  try {
    // Copy the real index to our temp index
    if (fs.existsSync(".git/index")) {
      fs.copyFileSync(".git/index", tempIndex);
    }

    // Stage everything (including the deletion and the new untracked file)
    // This makes Git see: "old.js is gone" and "new.js is here"
    const stageResult = await execGitCommand(["add", "-A"], repoPath);
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
      ],
      repoPath
    );
    if (!diffResult.success) {
      throw new Error(`Failed to get diff: ${diffResult.error.message}`);
    }

    const unstagedRenames: FileChange[] = diffResult.output
      .trim()
      .split("\n")
      .filter((line) => line.startsWith("R"))
      .map((line) => {
        const [_statusPart, oldFile, newFile] = line.split("\t");
        return {
          // score: parseInt(statusPart.slice(1), 10), // TODO: Currently unused
          oldFile,
          newFile,
        };
      })
      // Only keep the pair if BOTH files were NOT staged in the real index
      .filter((pair) => !stagedFiles.has(pair.oldFile) && !stagedFiles.has(pair.newFile))
      .map((pair) => ({
        path: pair.newFile,
        unstagedStatus: "renamed-only",
        hasStaged: false,
        hasUnstaged: true,
        unstagedOldPath: pair.oldFile,
      }));

    return unstagedRenames;
  } catch {
    return [];
  } finally {
    // Cleanup the temporary index
    delete process.env.GIT_INDEX_FILE;
    if (fs.existsSync(tempIndex)) {
      fs.unlinkSync(tempIndex);
    }
  }
};
