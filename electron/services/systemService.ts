import { shell } from "electron";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";
import { getPlatform } from "../utils/platform";
import path from "node:path";

const execFile = promisify(execFileCallback);

export const showFileInFileExplorer = (repoPath: string, filePath: string) => {
  try {
    const fullPath = path.join(repoPath, filePath);
    shell.showItemInFolder(fullPath);
    return { success: true };
  } catch (error) {
    console.error("Error showing item in folder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const openFileInExternalEditor = async (repoPath: string, filePath: string) => {
  try {
    const fullPath = path.join(repoPath, filePath);
    const platform = getPlatform();

    if (platform === "mac") {
      await execFile("open", ["-t", fullPath]);
    } else if (platform === "win") {
      await execFile("notepad.exe", [fullPath]);
    }

    return { success: true };
  } catch (error) {
    console.error("Error opening in external editor:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getFullClonePath = (cloneDestination: string, repoName: string) => {
  if (!cloneDestination || !repoName) {
    return "";
  }
  return path.join(cloneDestination, repoName);
};
