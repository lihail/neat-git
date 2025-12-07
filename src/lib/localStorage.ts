const TABS_STORAGE_KEY = "neatgit_tabs";
const ACTIVE_TAB_STORAGE_KEY = "neatgit_active_tab";
const WORD_WRAP_STORAGE_KEY = "neatgit_word_wrap";
const DIFF_VIEWER_MODE_STORAGE_KEY = "neatgit_diff_viewer_mode";
const GIT_SETUP_COMPLETE_STORAGE_KEY = "neatgit_git_setup_complete";

export const getTabs = (): string | null => {
  return localStorage.getItem(TABS_STORAGE_KEY);
};

export const saveTabs = (tabs: string): void => {
  localStorage.setItem(TABS_STORAGE_KEY, tabs);
};

export const removeTabs = (): void => {
  localStorage.removeItem(TABS_STORAGE_KEY);
};

export const getActiveTab = (): string | null => {
  return localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
};

export const saveActiveTab = (tabId: string): void => {
  localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tabId);
};

export const removeActiveTab = (): void => {
  localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
};

export const getWordWrap = (): string | null => {
  return localStorage.getItem(WORD_WRAP_STORAGE_KEY);
};

export const saveWordWrap = (value: boolean): void => {
  localStorage.setItem(WORD_WRAP_STORAGE_KEY, value.toString());
};

export const getDiffViewerMode = (): string | null => {
  return localStorage.getItem(DIFF_VIEWER_MODE_STORAGE_KEY);
};

export const saveDiffViewerMode = (mode: string): void => {
  localStorage.setItem(DIFF_VIEWER_MODE_STORAGE_KEY, mode);
};

export const getGitSetupComplete = (): string | null => {
  return localStorage.getItem(GIT_SETUP_COMPLETE_STORAGE_KEY);
};

export const saveGitSetupComplete = (value: boolean): void => {
  localStorage.setItem(GIT_SETUP_COMPLETE_STORAGE_KEY, value.toString());
};
