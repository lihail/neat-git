import { FileChange } from "../../src/types/electron";

export const RENAME_SIMILARITY_PERFECT_SCORE = 100;
export const RENAME_SIMILARITY_THRESHOLD = 50;

export const parseOrdinaryChange = (line: string): FileChange => {
  // Ordinary changed entry: 1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>
  const parts = line.split(" ");
  const xy = parts[1];
  const filePath = parts.slice(8).join(" ");

  const stagedCode = xy[0];
  const unstagedCode = xy[1];

  const hasStaged = stagedCode !== ".";
  const hasUnstaged = unstagedCode !== ".";

  let status: FileChange["status"];
  if (stagedCode === "D") {
    status = "deleted";
  } else if (stagedCode === "A") {
    status = "added";
  } else if (stagedCode === "M" || stagedCode === "T") {
    status = "modified";
  } else {
    if (unstagedCode === "D") {
      status = "deleted";
    } else if (unstagedCode === "A") {
      status = "added";
    } else {
      status = "modified";
    }
  }

  let unstagedStatus: FileChange["unstagedStatus"] = undefined;
  if (hasUnstaged) {
    if (unstagedCode === "D") {
      unstagedStatus = "deleted";
    } else if (unstagedCode === "A") {
      unstagedStatus = "added";
    } else {
      unstagedStatus = "modified";
    }
  }

  return {
    path: filePath,
    status,
    hasStaged,
    hasUnstaged,
    unstagedStatus,
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

  let unstagedStatus: FileChange["unstagedStatus"];
  if (hasUnstaged) {
    if (unstagedCode === "D") {
      unstagedStatus = "deleted";
    } else if (unstagedCode === "A") {
      unstagedStatus = "added";
    } else {
      unstagedStatus = "modified";
    }
  }

  return {
    path: newPath,
    status,
    hasStaged,
    hasUnstaged,
    stagedOldPath: oldPath,
    unstagedStatus,
  };
};

export const parseUntrackedFileChange = (line: string): FileChange => {
  const filePath = line.slice(2);

  return {
    path: filePath,
    hasStaged: false,
    hasUnstaged: true,
    unstagedStatus: "added",
  };
};
