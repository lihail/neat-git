import { BrowserWindow, dialog } from "electron";
import path from "node:path";
import fs from "node:fs";

const openFolderDialog = async (
  win: BrowserWindow,
  title: string,
  validateGitRepository: boolean = false
) => {
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
    title,
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: null };
  }

  const selectedPath = result.filePaths[0];

  if (validateGitRepository) {
    const gitPath = path.join(selectedPath, ".git");
    if (fs.existsSync(gitPath)) {
      return { success: true, path: selectedPath };
    }
    return { success: false, error: "Selected folder is not a Git repository" };
  }

  return { success: true, path: selectedPath };
};

export const openSelectGitRepositoryFolderDialog = async (
  win: BrowserWindow
) => {
  return await openFolderDialog(win, "Select Git Repository", true);
};

export const openSelectParentFolderDialog = async (win: BrowserWindow) => {
  return await openFolderDialog(win, "Select Parent Folder");
};
