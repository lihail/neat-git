import { shell } from "electron";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";
import { getPlatform } from "../utils/platform";

const execFile = promisify(execFileCallback);

export const showFileInFileExplorer = (fullPath: string) => {
  try {
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

export const openFileInExternalEditor = async (fullPath: string) => {
  try {
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
