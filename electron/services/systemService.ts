import { shell } from "electron";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";

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
    if (process.platform === "darwin") {
      await execFile("open", ["-t", fullPath]);
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
