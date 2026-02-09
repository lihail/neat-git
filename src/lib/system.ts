export const showItemInFolder = (repoPath: string, filePath: string): void => {
  try {
    window.electronAPI.showItemInFolder(`${repoPath}/${filePath}`);
  } catch (error) {
    console.error("Error showing item in folder:", error);
    throw error;
  }
};

export const openInExternalEditor = (repoPath: string, filePath: string): void => {
  try {
    window.electronAPI.openInExternalEditor(`${repoPath}/${filePath}`);
  } catch (error) {
    console.error("Error opening in external editor:", error);
    throw error;
  }
};
