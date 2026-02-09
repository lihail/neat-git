export const openSelectGitRepositoryFolderDialog = async (): Promise<
  { success: true; path: string } | { success: false; error: string | null }
> => {
  try {
    return await window.electronAPI.openSelectGitRepositoryFolderDialog();
  } catch (error) {
    console.error("Error opening select git repository folder dialog:", error);
    throw error;
  }
};

export const openSelectParentFolderDialog = async (): Promise<
  { success: true; path: string } | { success: false; error: string | null }
> => {
  try {
    return await window.electronAPI.openSelectParentFolderDialog();
  } catch (error) {
    console.error("Error opening select parent folder dialog:", error);
    throw error;
  }
};

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
