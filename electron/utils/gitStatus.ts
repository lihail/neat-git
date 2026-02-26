import { FileChange } from "../../src/types/electron";

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
  const filePath = line.slice(2);

  return {
    path: filePath,
    unstagedStatus: "added",
    hasStaged: false,
    hasUnstaged: true,
  };
};
