import { useState, useEffect, useMemo } from "react";
import { usePlatform } from "@/hooks/usePlatform";
import { useWindowsAuthDialogToast } from "@/hooks/useWindowsAuthToast";
import { RepoSelector } from "@/components/git/RepoSelector";
import { SidebarAccordion } from "@/components/git/SidebarAccordion";
import { ChangedFilesSidebar } from "@/components/git/ChangedFilesSidebar";
import { DiffViewer } from "@/components/git/DiffViewer";
import { CommitPanel } from "@/components/git/CommitPanel";
import { TopBar, type RepoTab } from "@/components/git/TopBar";
import { GitSetupDialog } from "@/components/git/GitSetupDialog";
import { AuthenticationDialog } from "@/components/common/AuthenticationDialog";
import { toast } from "@/components/ui/toaster";
import {
  cn,
  getContextLinesForMode,
  getFileChangeOldPath,
  getRepoNameFromPath,
  isAddedUnstagedAfterDeletedStaged,
} from "@/lib/utils";
import {
  listLocalBranches,
  listRemoteBranches,
  getCurrentBranch,
  getStatus,
  stageFile,
  stageAllFiles,
  unstageChange,
  unstageAllFiles,
  getDiff,
  createBranch,
  checkoutBranch,
  deleteBranch,
  renameBranch,
  getCommitHistory,
  commit,
  stash,
  listStashes,
  popStash,
  deleteStash,
  discardChanges,
  stageLines,
  unstageLines,
  stageHunk,
  unstageHunk,
  fetch,
  pullCurrentBranch,
  pullNonCurrentBranch,
  push,
  getRemoteUrl,
  doesRepoExist,
  type Branch,
  type DiffLine,
  type Commit,
  type Stash,
} from "@/lib/git";
import { useGitSetup } from "@/hooks/useGitSetup";
import { useWordWrap } from "@/hooks/useWordWrap";
import { useDiffViewerMode } from "@/hooks/useDiffViewerMode";
import { useRepoTabs } from "@/hooks/useRepoTabs";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import { FileChange } from "@/types/git";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";

// State for each repo tab
interface RepoState {
  currentBranch: string;
  branches: Branch[];
  remoteBranches: Branch[];
  commits: Commit[];
  stashes: Stash[];
  files: FileChange[];
  selectedFile?: string;
  selectedFileChange?: FileChange;
  isSelectedFileChangeStaged?: boolean; // Track if viewing staged or unstaged diff
  diffLines: DiffLine[];
}

export const Workspace = () => {
  const { isWindows } = usePlatform();
  const { tabs, setTabs, activeTabId, setActiveTabId } = useRepoTabs();
  const { showGitSetup, handleGitSetupComplete } = useGitSetup();
  const { wordWrap, setWordWrap } = useWordWrap();

  const [selectedCommit, setSelectedCommit] = useState<string>();
  const [repoStates, setRepoStates] = useState<Record<string, RepoState>>({});
  const [isSelectingRepo, setIsSelectingRepo] = useState(tabs.length === 0);
  const [loadingRepos, setLoadingRepos] = useState<Record<string, boolean>>({});
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [fetchingRepos, setFetchingRepos] = useState<Record<string, boolean>>({});
  const [pullingRepos, setPullingRepos] = useState<Record<string, boolean>>({});
  const [pushingRepos, setPushingRepos] = useState<Record<string, boolean>>({});
  const [renamingRepos, setRenamingRepos] = useState<Record<string, boolean>>({});

  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [authDialogError, setAuthDialogError] = useState<string | null>(null);
  const [currentAuthOperation, setCurrentAuthOperation] = useState<
    "fetch" | "pull" | "push" | null
  >(null);

  const [isBranchSwitchConfirmationDialogOpen, setIsBranchSwitchConfirmationDialogOpen] =
    useState(false);
  const [branchToSwitchTo, setBranchToSwitchTo] = useState<string>("");
  const [isStashingAndSwitchingBranch, setIsStashingAndSwitchingBranch] = useState(false);

  const { diffViewerMode, setDiffViewerMode } = useDiffViewerMode();

  // Auto-fetch interval (5 minutes)
  const [fetchIntervalId, setFetchIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Clear toasts when switching tabs
  useEffect(() => {
    toast.dismiss();
  }, [activeTabId]);

  // Auto-fetch interval management
  useEffect(() => {
    // Clear any existing interval
    if (fetchIntervalId) {
      clearInterval(fetchIntervalId);
      setFetchIntervalId(null);
    }

    // Calculate current repo path
    const activeTab = tabs.find((tab) => tab.id === activeTabId);
    const currentRepoPath = activeTab?.path || null;

    // Only set up interval if we have an active repo
    if (currentRepoPath) {
      // Trigger immediate fetch when switching tabs
      const doFetch = async () => {
        // Skip if any git operation is already in progress for this repo
        if (
          loadingRepos[currentRepoPath] ||
          fetchingRepos[currentRepoPath] ||
          pullingRepos[currentRepoPath] ||
          pushingRepos[currentRepoPath]
        ) {
          return;
        }

        // Check if repo has a remote configured
        try {
          const remoteUrlResult = await getRemoteUrl(currentRepoPath);
          if (!remoteUrlResult.success) {
            // No remote configured, skip auto-fetch
            return;
          }
        } catch (error) {
          // Failed to check remote, skip auto-fetch
          console.error("Failed to check remote URL:", error);
          return;
        }

        try {
          // Set fetching state (same as manual fetch)
          setFetchingRepos((prev) => ({ ...prev, [currentRepoPath]: true }));

          const result = await fetch(currentRepoPath);

          if (result.success) {
            // Refresh repo data after fetch
            const remoteBranchList = await listRemoteBranches(currentRepoPath);
            const commitHistory = await getCommitHistory(currentRepoPath);
            const branchList = await listLocalBranches(currentRepoPath);

            updateRepoState(currentRepoPath, {
              remoteBranches: remoteBranchList,
              commits: commitHistory,
              branches: branchList,
            });
          }
          // Note: We don't show auth dialogs or error toasts for auto-fetch
        } catch (error) {
          // Silent fail for auto-fetch
          console.error("Auto-fetch error:", error);
        } finally {
          // Clear fetching state
          setFetchingRepos((prev) => ({ ...prev, [currentRepoPath]: false }));
        }
      };

      // Trigger immediate fetch
      doFetch();

      // Set up interval to fetch every 5 minutes
      const intervalId = setInterval(() => {
        doFetch();
      }, 300_000);

      setFetchIntervalId(intervalId);
    }

    // Cleanup interval on unmount or when active tab changes
    return () => {
      if (fetchIntervalId) {
        clearInterval(fetchIntervalId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, tabs]);

  // Get current repo path and state
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const repoPath = activeTab?.path || null;
  const currentState = repoPath ? repoStates[repoPath] : null;
  const isLoading = repoPath ? loadingRepos[repoPath] || false : false;
  const isFetching = repoPath ? fetchingRepos[repoPath] || false : false;
  const isPulling = repoPath ? pullingRepos[repoPath] || false : false;
  const isPushing = repoPath ? pushingRepos[repoPath] || false : false;
  const isRenaming = repoPath ? renamingRepos[repoPath] || false : false;

  // Check if ANY repo has a remote operation in progress (to disable tab switching)
  const isAnyRemoteOperationActive =
    Object.values(fetchingRepos).some(Boolean) ||
    Object.values(pullingRepos).some(Boolean) ||
    Object.values(pushingRepos).some(Boolean);

  const isRemoteOperationActive = isFetching || isPulling || isPushing;

  useWindowsAuthDialogToast(isRemoteOperationActive);

  // Verify repository still exists when a tab is activated or on app load
  useEffect(() => {
    if (!repoPath) {
      return;
    }

    let isCanceled = false;

    const verifyRepo = async () => {
      try {
        const exists = await doesRepoExist(repoPath);
        if (isCanceled) {
          return;
        }
        if (!exists) {
          toast.error("Repository not found");
          const tab = tabs.find((t) => t.path === repoPath);
          if (tab) {
            handleCloseTab(tab.id);
          }
        }
      } catch (error) {
        console.error("Error verifying repository existence:", error);
      }
    };

    verifyRepo();

    return () => {
      isCanceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath, activeTabId, tabs]);

  // Helper to update state for a specific repo
  const updateRepoState = (path: string, updates: Partial<RepoState>) => {
    setRepoStates((prev) => ({
      ...prev,
      [path]: {
        ...(prev[path] || {
          currentBranch: "main",
          branches: [],
          remoteBranches: [],
          commits: [],
          stashes: [],
          files: [],
          diffLines: [],
        }),
        ...updates,
      },
    }));
  };

  // Clear selection if selected file no longer exists in the file list
  useEffect(() => {
    if (!repoPath || !currentState?.selectedFile) {
      return;
    }

    const selectedFileExists = currentState.files.some((f) => f.path === currentState.selectedFile);

    if (!selectedFileExists) {
      updateRepoState(repoPath, {
        selectedFile: undefined,
        isSelectedFileChangeStaged: undefined,
        diffLines: [],
      });
    }
  }, [repoPath, currentState?.files, currentState?.selectedFile]);

  // Load real Git data when active tab changes
  useEffect(() => {
    if (repoPath && !repoStates[repoPath]) {
      const loadGitData = async () => {
        // Set loading state
        setLoadingRepos((prev) => ({ ...prev, [repoPath]: true }));

        try {
          const current = await getCurrentBranch(repoPath);
          const branchList = await listLocalBranches(repoPath);
          const remoteBranchList = await listRemoteBranches(repoPath);
          const statusList = await getStatus(repoPath);
          const commitHistory = await getCommitHistory(repoPath);
          const stashList = await listStashes(repoPath);

          updateRepoState(repoPath, {
            currentBranch: current,
            branches: branchList,
            remoteBranches: remoteBranchList,
            files: statusList,
            commits: commitHistory,
            stashes: stashList,
            diffLines: [],
          });
        } catch (error) {
          console.error("Error loading Git data:", error);
          toast.error("Failed to load Git repository data", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
        } finally {
          // Clear loading state
          setLoadingRepos((prev) => ({ ...prev, [repoPath]: false }));
        }
      };
      loadGitData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath]);

  const selectedFileOldPath = useMemo(() => {
    if (!currentState?.selectedFile) {
      return undefined;
    }
    return getFileChangeOldPath(
      currentState.files,
      currentState.selectedFile,
      currentState.isSelectedFileChangeStaged
    );
  }, [currentState?.files, currentState?.selectedFile, currentState?.isSelectedFileChangeStaged]);

  // Load diff when selected file changes, view mode changes, or rename status changes
  // Note: We intentionally don't include isSelectedFileChangeStaged in dependencies
  // to avoid reloading when programmatically updating the section after staging
  useEffect(() => {
    if (repoPath && currentState?.selectedFile) {
      const loadDiff = async () => {
        setLoadingDiff(true);
        try {
          const diff = await getDiff(
            repoPath,
            currentState.selectedFile!,
            currentState.isSelectedFileChangeStaged ?? false,
            getContextLinesForMode(diffViewerMode),
            selectedFileOldPath,
            isAddedUnstagedAfterDeletedStaged(
              currentState.selectedFileChange,
              currentState.isSelectedFileChangeStaged ?? false,
              currentState.files
            )
          );
          updateRepoState(repoPath, { diffLines: diff });
        } catch (error) {
          console.error("Error loading diff:", error);
          toast.error("Failed to load diff", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
          updateRepoState(repoPath, { diffLines: [] });
        } finally {
          setLoadingDiff(false);
        }
      };
      loadDiff();
    } else if (repoPath) {
      updateRepoState(repoPath, { diffLines: [] });
      setLoadingDiff(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath, currentState?.selectedFile, diffViewerMode, selectedFileOldPath]);

  // Refresh git data when window regains focus
  useEffect(() => {
    if (!repoPath) {
      return;
    }

    const handleFocus = async () => {
      try {
        const statusList = await getStatus(repoPath);
        const commitHistory = await getCommitHistory(repoPath);
        const branchList = await listLocalBranches(repoPath);
        const current = await getCurrentBranch(repoPath);
        const stashList = await listStashes(repoPath);

        // Check if selected file still exists and adjust section if needed
        let newIsSelectedFileChangeStaged = currentState?.isSelectedFileChangeStaged;
        if (currentState?.selectedFile) {
          if (currentState.selectedFileChange) {
            // If viewing unstaged but file no longer has unstaged changes, switch to staged
            if (
              currentState.isSelectedFileChangeStaged === false &&
              !currentState.selectedFileChange.hasUnstaged &&
              currentState.selectedFileChange.hasStaged
            ) {
              newIsSelectedFileChangeStaged = true;
            }
            // If viewing staged but file no longer has staged changes, switch to unstaged
            else if (
              currentState.isSelectedFileChangeStaged === true &&
              !currentState.selectedFileChange.hasStaged &&
              currentState.selectedFileChange.hasUnstaged
            ) {
              newIsSelectedFileChangeStaged = false;
            }
          }
        }

        updateRepoState(repoPath, {
          files: statusList,
          commits: commitHistory,
          branches: branchList,
          currentBranch: current,
          stashes: stashList,
          isSelectedFileChangeStaged: newIsSelectedFileChangeStaged,
        });

        // Reload diff if a file is selected
        if (currentState?.selectedFile) {
          const diff = await getDiff(
            repoPath,
            currentState.selectedFile,
            newIsSelectedFileChangeStaged ?? false,
            getContextLinesForMode(diffViewerMode),
            getFileChangeOldPath(
              statusList,
              currentState.selectedFile,
              newIsSelectedFileChangeStaged
            ),
            isAddedUnstagedAfterDeletedStaged(
              currentState.selectedFileChange,
              newIsSelectedFileChangeStaged ?? false,
              currentState.files
            )
          );
          updateRepoState(repoPath, { diffLines: diff });
        }
      } catch (error) {
        console.error("Error refreshing git data:", error);
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [
    repoPath,
    currentState?.selectedFile,
    currentState?.isSelectedFileChangeStaged,
    diffViewerMode,
    currentState?.selectedFileChange,
    currentState?.files,
  ]);

  // Tab management functions
  const handleOpenRepo = (path: string) => {
    const existingTab = tabs.find((tab) => tab.path === path);

    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      const newTab: RepoTab = {
        id: `${Date.now()}-${Math.random()}`,
        path,
        name: getRepoNameFromPath(path),
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
    setIsSelectingRepo(false);
  };

  const handleCloseTab = (tabId: string) => {
    const tabIndex = tabs.findIndex((tab) => tab.id === tabId);
    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(newTabs);

    // Clean up state for closed tab
    const closedTab = tabs.find((tab) => tab.id === tabId);
    if (closedTab) {
      setRepoStates((prev) => {
        const newStates = { ...prev };
        delete newStates[closedTab.path];
        return newStates;
      });
    }

    // If closing active tab, switch to another
    if (tabId === activeTabId) {
      if (newTabs.length > 0) {
        // Switch to adjacent tab
        const newIndex = Math.min(tabIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newIndex].id);
      } else {
        setActiveTabId(null);
        setIsSelectingRepo(true);
      }
    }
  };

  const handleReorderTabs = (newTabs: RepoTab[]) => {
    setTabs(newTabs);
  };

  const handleToggleStage = async (path: string, shouldStage: boolean) => {
    if (!repoPath || !currentState) {
      return;
    }

    try {
      // Check if file was in both sections before staging/unstaging
      const fileBeforeAction = currentState.files.find((f) => f.path === path);
      const wasInBothSections = fileBeforeAction?.hasStaged && fileBeforeAction?.hasUnstaged;

      if (shouldStage) {
        await stageFile(repoPath, path, fileBeforeAction?.unstagedOldPath);
      } else {
        await unstageChange(repoPath, path, fileBeforeAction?.stagedOldPath);
      }

      // Refresh the git status
      const statusList = await getStatus(repoPath);

      // If this is the selected file, update which section it's shown in
      if (currentState.selectedFile === path) {
        // Reload diff if file was in both sections (meaning staged/unstaged content differs)
        if (wasInBothSections) {
          setLoadingDiff(true);
          try {
            const diff = await getDiff(
              repoPath,
              path,
              shouldStage,
              getContextLinesForMode(diffViewerMode),
              getFileChangeOldPath(statusList, path, shouldStage)
            );
            updateRepoState(repoPath, {
              files: statusList,
              isSelectedFileChangeStaged: shouldStage,
              diffLines: diff,
            });
          } catch (error) {
            console.error("Error loading diff:", error);
          } finally {
            setLoadingDiff(false);
          }
        } else {
          updateRepoState(repoPath, {
            files: statusList,
            isSelectedFileChangeStaged: shouldStage,
          });
        }
      } else {
        updateRepoState(repoPath, { files: statusList });
      }
    } catch (error) {
      console.error("Error toggling stage:", error);
      toast.error(`Failed to ${shouldStage ? "stage" : "unstage"} file`, {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDiscardChanges = async (filePath: string, oldFilePath?: string) => {
    if (!repoPath || !currentState) {
      return;
    }

    try {
      const fileData = currentState.files.find((f) => f.path === filePath);
      const wasUntracked = fileData?.status === "added" && !fileData?.hasStaged;

      await discardChanges(repoPath, filePath, oldFilePath);

      toast.success(wasUntracked ? `Deleted "${filePath}"` : `Discarded changes to "${filePath}"`);

      // Refresh the git status
      const statusList = await getStatus(repoPath);

      // If the discarded file was selected, clear the diff or update it
      if (currentState.selectedFile === filePath && !currentState.isSelectedFileChangeStaged) {
        const selectedDiscardedFile = statusList.find((f) => f.path === filePath);
        if (selectedDiscardedFile) {
          // File still has staged changes — keep it selected but clear diff
          const diff = await getDiff(
            repoPath,
            filePath,
            true,
            getContextLinesForMode(diffViewerMode),
            selectedDiscardedFile.stagedOldPath
          );
          updateRepoState(repoPath, {
            files: statusList,
            isSelectedFileChangeStaged: true,
            diffLines: diff,
          });
        } else {
          // File is gone from the list entirely
          updateRepoState(repoPath, {
            files: statusList,
            selectedFile: undefined,
            isSelectedFileChangeStaged: undefined,
            diffLines: [],
          });
        }
      } else {
        updateRepoState(repoPath, { files: statusList });
      }
    } catch (error) {
      console.error("Error discarding changes:", error);
      toast.error("Failed to discard changes", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const refreshAfterPartialStaging = async (
    statusList: FileChange[],
    newDiff: DiffLine[],
    wasStaged: boolean
  ) => {
    if (newDiff.length > 0 || !currentState?.selectedFile) {
      updateRepoState(repoPath!, {
        files: statusList,
        diffLines: newDiff,
      });
      return;
    }

    // Diff is empty on current side - switch to the other side if it has changes
    const fileStatus = statusList.find((f) => f.path === currentState.selectedFile);
    const otherSideHasChanges = wasStaged ? fileStatus?.hasUnstaged : fileStatus?.hasStaged;

    if (otherSideHasChanges) {
      const otherSideIsStaged = !wasStaged;
      const otherDiff = await getDiff(
        repoPath!,
        currentState.selectedFile,
        otherSideIsStaged,
        getContextLinesForMode(diffViewerMode)
      );
      updateRepoState(repoPath!, {
        files: statusList,
        isSelectedFileChangeStaged: otherSideIsStaged,
        diffLines: otherDiff,
      });
    } else {
      updateRepoState(repoPath!, {
        files: statusList,
        diffLines: newDiff,
      });
    }
  };

  const handleStageLines = async (lineIndices: number[]) => {
    if (!repoPath || !currentState || !currentState.selectedFile) {
      return;
    }

    try {
      setLoadingDiff(true);
      const linesToStage = lineIndices.map((i) => currentState.diffLines[i]);
      const result = await stageLines(repoPath, currentState.selectedFile, linesToStage);

      if (!result.success) {
        toast.error("Failed to stage lines", {
          description: result.error || "Unknown error",
        });
        return;
      }

      const [statusList, newDiff] = await Promise.all([
        getStatus(repoPath),
        getDiff(repoPath, currentState.selectedFile, false, getContextLinesForMode(diffViewerMode)),
      ]);

      await refreshAfterPartialStaging(statusList, newDiff, false);
    } catch (error) {
      console.error("Error staging lines:", error);
      toast.error("Failed to stage", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoadingDiff(false);
    }
  };

  const handleUnstageLines = async (lineIndices: number[]) => {
    if (!repoPath || !currentState || !currentState.selectedFile) {
      return;
    }

    try {
      setLoadingDiff(true);
      const linesToUnstage = lineIndices.map((i) => currentState.diffLines[i]);
      const result = await unstageLines(repoPath, currentState.selectedFile, linesToUnstage);

      if (!result.success) {
        toast.error("Failed to unstage lines", {
          description: result.error || "Unknown error",
        });
        return;
      }

      const [statusList, newDiff] = await Promise.all([
        getStatus(repoPath),
        getDiff(repoPath, currentState.selectedFile, true, getContextLinesForMode(diffViewerMode)),
      ]);

      await refreshAfterPartialStaging(statusList, newDiff, true);
    } catch (error) {
      console.error("Error unstaging lines:", error);
      toast.error("Failed to unstage", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoadingDiff(false);
    }
  };

  const handleStageHunk = async (hunkIndex: number) => {
    if (!repoPath || !currentState || !currentState.selectedFile) {
      return;
    }

    try {
      setLoadingDiff(true);
      const result = await stageHunk(repoPath, currentState.selectedFile, hunkIndex);

      if (!result.success) {
        toast.error("Failed to stage hunk", {
          description: result.error || "Unknown error",
        });
        return;
      }

      const [statusList, newDiff] = await Promise.all([
        getStatus(repoPath),
        getDiff(repoPath, currentState.selectedFile, false, getContextLinesForMode(diffViewerMode)),
      ]);

      await refreshAfterPartialStaging(statusList, newDiff, false);
    } catch (error) {
      console.error("Error staging hunk:", error);
      toast.error("Failed to stage hunk", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoadingDiff(false);
    }
  };

  const handleUnstageHunk = async (hunkIndex: number) => {
    if (!repoPath || !currentState || !currentState.selectedFile) {
      return;
    }

    try {
      setLoadingDiff(true);
      const result = await unstageHunk(repoPath, currentState.selectedFile, hunkIndex);

      if (!result.success) {
        toast.error("Failed to unstage hunk", {
          description: result.error || "Unknown error",
        });
        return;
      }

      const [statusList, newDiff] = await Promise.all([
        getStatus(repoPath),
        getDiff(repoPath, currentState.selectedFile, true, getContextLinesForMode(diffViewerMode)),
      ]);

      await refreshAfterPartialStaging(statusList, newDiff, true);
    } catch (error) {
      console.error("Error unstaging hunk:", error);
      toast.error("Failed to unstage hunk", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoadingDiff(false);
    }
  };

  const handleStageAll = async () => {
    if (!repoPath || !currentState) {
      return;
    }

    try {
      // Check if selected file was in both sections before staging
      const selectedFileBeforeAction = currentState.selectedFile
        ? currentState.files.find((f) => f.path === currentState.selectedFile)
        : null;
      const wasInBothSections =
        selectedFileBeforeAction?.hasStaged && selectedFileBeforeAction?.hasUnstaged;

      await stageAllFiles(repoPath);

      // Refresh the git status
      const statusList = await getStatus(repoPath);

      // If the selected file was in unstaged section, move selection to staged section
      if (currentState.selectedFile && currentState.isSelectedFileChangeStaged === false) {
        // Only reload diff if file was in both sections
        if (wasInBothSections) {
          setLoadingDiff(true);
          try {
            const oldPath = getFileChangeOldPath(statusList, currentState.selectedFile, true);
            const diff = await getDiff(
              repoPath,
              currentState.selectedFile,
              true,
              getContextLinesForMode(diffViewerMode),
              oldPath
            );
            updateRepoState(repoPath, {
              files: statusList,
              isSelectedFileChangeStaged: true,
              diffLines: diff,
            });
          } catch (error) {
            console.error("Error loading diff:", error);
          } finally {
            setLoadingDiff(false);
          }
        } else {
          updateRepoState(repoPath, {
            files: statusList,
            isSelectedFileChangeStaged: true,
          });
        }
      } else {
        updateRepoState(repoPath, { files: statusList });
      }
    } catch (error) {
      console.error("Error staging all files:", error);
      toast.error("Failed to stage all files", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleUnstageAll = async () => {
    if (!repoPath || !currentState) {
      return;
    }

    try {
      // Check if selected file was in both sections before unstaging
      const selectedFileBeforeAction = currentState.selectedFile
        ? currentState.files.find((f) => f.path === currentState.selectedFile)
        : null;
      const wasInBothSections =
        selectedFileBeforeAction?.hasStaged && selectedFileBeforeAction?.hasUnstaged;

      await unstageAllFiles(repoPath);

      // Refresh the git status
      const statusList = await getStatus(repoPath);

      // If the selected file was in staged section, move selection to unstaged section
      if (currentState.selectedFile && currentState.isSelectedFileChangeStaged === true) {
        // Only reload diff if file was in both sections
        if (wasInBothSections) {
          setLoadingDiff(true);
          try {
            const oldPath = getFileChangeOldPath(statusList, currentState.selectedFile, false);
            const diff = await getDiff(
              repoPath,
              currentState.selectedFile,
              false,
              getContextLinesForMode(diffViewerMode),
              oldPath
            );
            updateRepoState(repoPath, {
              files: statusList,
              isSelectedFileChangeStaged: false,
              diffLines: diff,
            });
          } catch (error) {
            console.error("Error loading diff:", error);
          } finally {
            setLoadingDiff(false);
          }
        } else {
          updateRepoState(repoPath, {
            files: statusList,
            isSelectedFileChangeStaged: false,
          });
        }
      } else {
        updateRepoState(repoPath, { files: statusList });
      }
    } catch (error) {
      console.error("Error unstaging all files:", error);
      toast.error("Failed to unstage all files", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleCommit = async (message: string) => {
    if (!repoPath || !currentState) {
      return;
    }

    const stagedCount = currentState.files.filter((f) => f.hasStaged).length;

    if (stagedCount === 0) {
      toast.error("No files staged for commit");
      return;
    }

    try {
      const result = await commit(repoPath, message);

      if (result.success) {
        toast.success(`Committed ${stagedCount} file${stagedCount !== 1 ? "s" : ""}: ${message}`);

        // Refresh git status, commit history, and branches after commit
        const statusList = await getStatus(repoPath);
        const commitHistory = await getCommitHistory(repoPath);
        const branchList = await listLocalBranches(repoPath);
        updateRepoState(repoPath, {
          files: statusList,
          commits: commitHistory,
          branches: branchList,
          selectedFile: null, // Clear the diff viewer after commit
        });
      }
    } catch (error) {
      console.error("Error committing:", error);
      toast.error("Failed to commit", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleSelectBranch = async (branch: string) => {
    if (!repoPath || !currentState) {
      return;
    }

    // Don't switch if already on this branch
    if (branch === currentState.currentBranch) {
      return;
    }

    try {
      await checkoutBranch(repoPath, branch);
      toast.info(`Switched to branch: ${branch}`);

      // Refresh git status, commit history, and branches after branch switch
      const statusList = await getStatus(repoPath);
      const commitHistory = await getCommitHistory(repoPath);
      const branchList = await listLocalBranches(repoPath);
      updateRepoState(repoPath, {
        currentBranch: branch,
        files: statusList,
        commits: commitHistory,
        branches: branchList,
      });
    } catch (error) {
      console.error("Error switching branch:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Check if error is about uncommitted changes
      if (
        errorMessage.includes("Your local changes to the following files would be overwritten") ||
        errorMessage.includes("Please commit your changes or stash them")
      ) {
        setBranchToSwitchTo(branch);
        setIsBranchSwitchConfirmationDialogOpen(true);
      } else {
        // For other errors, show the standard error toast
        toast.error("Failed to switch branch", {
          description: errorMessage,
        });
      }
    }
  };

  const handleCreateBranch = async (branchName: string) => {
    if (!repoPath) {
      return;
    }

    try {
      await createBranch(repoPath, branchName);
      toast.success(`Created and switched to branch: ${branchName}`);

      // Refresh branches and update current branch
      const branchList = await listLocalBranches(repoPath);
      const current = await getCurrentBranch(repoPath);

      // Refresh git status and commit history
      const statusList = await getStatus(repoPath);
      const commitHistory = await getCommitHistory(repoPath);

      updateRepoState(repoPath, {
        branches: branchList,
        currentBranch: current,
        files: statusList,
        commits: commitHistory,
      });
    } catch (error) {
      console.error("Error creating branch:", error);
      toast.error("Failed to create branch", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDeleteBranch = async (branchName: string) => {
    if (!repoPath) {
      return;
    }

    try {
      await deleteBranch(repoPath, branchName);
      toast.success(`Branch deleted: ${branchName}`);

      // Refresh branches
      const branchList = await listLocalBranches(repoPath);
      updateRepoState(repoPath, { branches: branchList });
    } catch (error) {
      console.error("Error deleting branch:", error);
      toast.error("Failed to delete branch", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleRenameBranch = async (
    oldName: string,
    newName: string,
    alsoRenameRemote: boolean
  ) => {
    if (!repoPath || !currentState) {
      return;
    }

    try {
      // Set renaming state
      setRenamingRepos((prev) => ({ ...prev, [repoPath]: true }));

      await renameBranch(repoPath, oldName, newName, alsoRenameRemote);
      toast.success(
        `Branch renamed from "${oldName}" to "${newName}"${
          alsoRenameRemote ? " (including remote)" : ""
        }`
      );

      // Check if we renamed the current branch
      const wasCurrentBranch = oldName === currentState.currentBranch;

      // Refresh branches
      const branchList = await listLocalBranches(repoPath);
      const remoteBranchList = await listRemoteBranches(repoPath);

      // If we renamed the current branch, update currentBranch state
      if (wasCurrentBranch) {
        const current = await getCurrentBranch(repoPath);
        updateRepoState(repoPath, {
          branches: branchList,
          remoteBranches: remoteBranchList,
          currentBranch: current,
        });
      } else {
        updateRepoState(repoPath, {
          branches: branchList,
          remoteBranches: remoteBranchList,
        });
      }
    } catch (error) {
      console.error("Error renaming branch:", error);
      toast.error("Failed to rename branch", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      // Clear renaming state
      setRenamingRepos((prev) => ({ ...prev, [repoPath]: false }));
    }
  };

  const handleStashAndSwitchBranch = async () => {
    if (!repoPath || !currentState) {
      return;
    }

    setIsStashingAndSwitchingBranch(true);

    try {
      // Create a stash with timestamp
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[now.getMonth()];
      const day = now.getDate();
      const stashMessage = `Stash at ${month}. ${day}, ${hours}:${minutes}`;
      const stashResult = await stash(repoPath, stashMessage);

      if (stashResult.success) {
        toast.success(`Changes stashed: ${stashMessage}`);

        // Retry the branch switch
        await checkoutBranch(repoPath, branchToSwitchTo);
        toast.info(`Switched to branch: ${branchToSwitchTo}`);

        setIsBranchSwitchConfirmationDialogOpen(false);

        // Refresh git status, commit history, branches, and stashes
        const statusList = await getStatus(repoPath);
        const commitHistory = await getCommitHistory(repoPath);
        const branchList = await listLocalBranches(repoPath);
        const stashList = await listStashes(repoPath);
        updateRepoState(repoPath, {
          currentBranch: branchToSwitchTo,
          files: statusList,
          commits: commitHistory,
          branches: branchList,
          stashes: stashList,
        });
      } else {
        toast.error("Failed to stash changes", {
          description: stashResult.message,
        });
      }
    } catch (error) {
      console.error("Error stashing and switching:", error);
      toast.error("Failed to stash and switch", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsStashingAndSwitchingBranch(false);
    }
  };

  const handleCancelStashAndSwitchBranch = () => {
    setIsBranchSwitchConfirmationDialogOpen(false);
    setBranchToSwitchTo("");
    setIsStashingAndSwitchingBranch(false);
  };

  const handleStash = async () => {
    if (!repoPath || !currentState) {
      return;
    }

    try {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[now.getMonth()];
      const day = now.getDate();

      const message = `Stash at ${month}. ${day}, ${hours}:${minutes}`;

      const result = await stash(repoPath, message);

      if (result.success) {
        toast.success(`Changes stashed: ${message}`);

        const statusList = await getStatus(repoPath);
        const commitHistory = await getCommitHistory(repoPath);
        const stashList = await listStashes(repoPath);
        updateRepoState(repoPath, {
          files: statusList,
          commits: commitHistory,
          stashes: stashList,
          selectedFile: undefined,
          diffLines: [],
        });
      } else {
        toast.error(result.message || "Failed to stash changes");
      }
    } catch (error) {
      console.error("Error stashing changes:", error);
      toast.error("Failed to stash changes", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handlePopStash = async (index: number) => {
    if (!repoPath || !currentState) {
      return;
    }

    try {
      const stash = currentState.stashes[index];
      const result = await popStash(repoPath, index);

      if (result.success) {
        toast.success(`Stash popped: ${stash.message}`);

        const statusList = await getStatus(repoPath);
        const commitHistory = await getCommitHistory(repoPath);
        const stashList = await listStashes(repoPath);
        updateRepoState(repoPath, {
          files: statusList,
          commits: commitHistory,
          stashes: stashList,
        });
      } else {
        toast.error(result.message || "Failed to pop stash");
      }
    } catch (error) {
      console.error("Error popping stash:", error);
      toast.error("Failed to pop stash", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDeleteStash = async (index: number) => {
    if (!repoPath || !currentState) {
      return;
    }

    try {
      const stash = currentState.stashes[index];
      const result = await deleteStash(repoPath, index);

      if (result.success) {
        toast.success(`Stash deleted: ${stash.message}`);

        // Refresh stashes after delete
        const stashList = await listStashes(repoPath);
        updateRepoState(repoPath, {
          stashes: stashList,
        });
      } else {
        toast.error(result.message || "Failed to delete stash");
      }
    } catch (error) {
      console.error("Error deleting stash:", error);
      toast.error("Failed to delete stash", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const formatCommitDate = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp * 1000;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) {
      return "just now";
    }
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    }
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    }
    if (days === 1) {
      return "1 day ago";
    }
    if (days < 7) {
      return `${days} days ago`;
    }
    if (weeks === 1) {
      return "1 week ago";
    }
    if (weeks < 4) {
      return `${weeks} weeks ago`;
    }
    if (months === 1) {
      return "1 month ago";
    }
    if (months < 12) {
      return `${months} months ago`;
    }
    if (years === 1) {
      return "1 year ago";
    }
    return `${years} years ago`;
  };

  // Create branches with current branch marked
  const branchesWithCurrent = currentState
    ? currentState.branches.map((branch) => ({
        ...branch,
        current: branch.name === currentState.currentBranch,
      }))
    : [];

  // Format commits for display
  const formattedCommits = currentState
    ? currentState.commits.map((commit) => ({
        sha: commit.sha,
        message: commit.message,
        author: commit.author,
        date: formatCommitDate(commit.timestamp),
      }))
    : [];

  const handleSelectFile = async (file: FileChange, isStaged: boolean) => {
    if (!repoPath || !currentState) {
      return;
    }

    const filePath = file.path;

    // Update selection state
    updateRepoState(repoPath, {
      selectedFileChange: file,
      selectedFile: filePath,
      isSelectedFileChangeStaged: isStaged,
    });

    const isSameFileSelectedInDifferentSection =
      currentState.selectedFile === filePath &&
      currentState.isSelectedFileChangeStaged !== isStaged;

    if (!isSameFileSelectedInDifferentSection) {
      return;
    }

    // If same file but different section, or a different file, reload the diff

    setLoadingDiff(true);
    try {
      const diff = await getDiff(
        repoPath,
        filePath,
        isStaged,
        getContextLinesForMode(diffViewerMode),
        getFileChangeOldPath(currentState.files, filePath, isStaged),
        isAddedUnstagedAfterDeletedStaged(file, isStaged, currentState.files)
      );
      updateRepoState(repoPath, { diffLines: diff });
    } catch (error) {
      console.error("Error loading diff:", error);
      toast.error("Failed to load diff", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoadingDiff(false);
    }
  };

  const handleFetch = async (username?: string, password?: string, saveCredentials?: boolean) => {
    if (!repoPath) {
      return;
    }

    try {
      setFetchingRepos((prev) => ({ ...prev, [repoPath]: true }));

      const result = await fetch(repoPath, username, password, saveCredentials);

      if (result.success) {
        toast.success("Successfully fetched from remote");

        handleAuthDialogOpenChange(false);

        const remoteBranchList = await listRemoteBranches(repoPath);
        const commitHistory = await getCommitHistory(repoPath);
        const branchList = await listLocalBranches(repoPath);

        updateRepoState(repoPath, {
          remoteBranches: remoteBranchList,
          commits: commitHistory,
          branches: branchList,
        });
      } else if (result.needsAuth) {
        if (isWindows) {
          toast.error("Authentication was canceled");
        } else {
          // Show authentication dialog (first time - no error yet)
          // Get hostname from remote URL for display
          try {
            const remoteUrlResult = await getRemoteUrl(repoPath);
            if (remoteUrlResult.success) {
              handleAuthDialogOpenChange(true, "fetch");
            }
          } catch {
            handleAuthDialogOpenChange(true, "fetch");
          }
        }
      } else {
        // If the auth dialog is open, only show error in dialog (not toast)
        // Otherwise show toast for other types of errors
        if (isAuthDialogOpen) {
          setAuthDialogError(result.error || null);
        } else {
          toast.error(result.error || "Failed to fetch from remote");
        }
      }
    } catch (error) {
      console.error("Error fetching from remote:", error);
      toast.error("Failed to fetch from remote", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      // Clear fetching state
      setFetchingRepos((prev) => ({ ...prev, [repoPath]: false }));
    }
  };

  const handlePush = async (username?: string, password?: string, saveCredentials?: boolean) => {
    if (!repoPath) {
      return;
    }

    try {
      setPushingRepos((prev) => ({ ...prev, [repoPath]: true }));

      const result = await push(repoPath, username, password, saveCredentials);

      if (result.success) {
        toast.success("Successfully pushed to remote");

        handleAuthDialogOpenChange(false);

        const remoteBranchList = await listRemoteBranches(repoPath);
        const commitHistory = await getCommitHistory(repoPath);
        const branchList = await listLocalBranches(repoPath);

        updateRepoState(repoPath, {
          remoteBranches: remoteBranchList,
          commits: commitHistory,
          branches: branchList,
        });
      } else if (result.needsAuth) {
        if (isWindows) {
          toast.error("Authentication was canceled");
        } else {
          // Show authentication dialog (first time - no error yet)
          // Get hostname from remote URL for display
          try {
            const remoteUrlResult = await getRemoteUrl(repoPath);
            if (remoteUrlResult.success) {
              handleAuthDialogOpenChange(true, "push");
            }
          } catch {
            handleAuthDialogOpenChange(true, "push");
          }
        }
      } else {
        // If the auth dialog is open, only show error in dialog (not toast)
        // Otherwise show toast for other types of errors
        if (isAuthDialogOpen) {
          setAuthDialogError(result.error || null);
        } else {
          toast.error(result.error || "Failed to push to remote");
        }
      }
    } catch (error) {
      console.error("Error pushing to remote:", error);
      toast.error("Failed to push to remote", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      // Clear pushing state
      setPushingRepos((prev) => ({ ...prev, [repoPath]: false }));
    }
  };

  const handlePull = async (username?: string, password?: string, saveCredentials?: boolean) => {
    if (!repoPath) {
      return;
    }

    try {
      setPullingRepos((prev) => ({ ...prev, [repoPath]: true }));

      const result = await pullCurrentBranch(repoPath, username, password, saveCredentials);

      if (result.success) {
        toast.success("Successfully pulled from remote");

        handleAuthDialogOpenChange(false);

        const remoteBranchList = await listRemoteBranches(repoPath);
        const commitHistory = await getCommitHistory(repoPath);
        const branchList = await listLocalBranches(repoPath);
        const statusResult = await getStatus(repoPath);

        updateRepoState(repoPath, {
          remoteBranches: remoteBranchList,
          commits: commitHistory,
          branches: branchList,
          files: statusResult,
        });
      } else if (result.needsAuth) {
        if (isWindows) {
          toast.error("Authentication was canceled");
        } else {
          // Show authentication dialog (first time - no error yet)
          // Get hostname from remote URL for display
          try {
            const remoteUrlResult = await getRemoteUrl(repoPath);
            if (remoteUrlResult.success) {
              handleAuthDialogOpenChange(true, "pull");
            }
          } catch {
            handleAuthDialogOpenChange(true, "pull");
          }
        }
      } else {
        // If the auth dialog is open, only show error in dialog (not toast)
        // Otherwise show toast for other types of errors
        if (isAuthDialogOpen) {
          setAuthDialogError(result.error || null);
        } else {
          toast.error(result.error || "Failed to pull from remote");
        }
      }
    } catch (error) {
      console.error("Error pulling from remote:", error);
      toast.error("Failed to pull from remote", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      // Clear pulling state
      setPullingRepos((prev) => ({ ...prev, [repoPath]: false }));
    }
  };

  const handlePullBranch = async (branchName: string) => {
    if (!repoPath) {
      return;
    }

    // Get the branch object to check if it has unpushed commits
    const state = repoStates[repoPath];
    if (!state) {
      return;
    }

    const branch = state.branches.find((b) => b.name === branchName);
    if (!branch) {
      toast.error(`Branch "${branchName}" not found`);
      return;
    }

    // Check if branch has unpushed commits (ahead > 0)
    // This should already be handled by the UI, but double-check here
    if (branch.ahead !== undefined && branch.ahead > 0 && !branch.current) {
      toast.error(
        "Cannot pull: branch has unpushed commits. Switch to this branch first and push them"
      );
      return;
    }

    // If this is the current branch, use the regular pull mechanism
    if (branch.current) {
      await handlePull();
      return;
    }

    try {
      // Set pulling state
      setPullingRepos((prev) => ({ ...prev, [repoPath]: true }));

      const result = await pullNonCurrentBranch(repoPath, branchName, undefined, undefined, true);

      if (result.success) {
        toast.success(`Successfully pulled branch "${branchName}"`);

        // Refresh branch list and commits to show updated state
        const branchList = await listLocalBranches(repoPath);
        const remoteBranchList = await listRemoteBranches(repoPath);
        const commitHistory = await getCommitHistory(repoPath);

        updateRepoState(repoPath, {
          branches: branchList,
          remoteBranches: remoteBranchList,
          commits: commitHistory,
        });
      } else if (result.needsAuth) {
        if (isWindows) {
          toast.error("Authentication was canceled");
        } else {
          // For now, show a message that auth is needed
          // In the future, we could show an auth dialog specifically for this operation
          toast.error("Authentication required. Please configure your credentials");
        }
      } else {
        toast.error(result.error || `Failed to pull branch "${branchName}"`);
      }
    } catch (error) {
      console.error("Error pulling branch:", error);
      toast.error("Failed to pull branch", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      // Clear pulling state
      setPullingRepos((prev) => ({ ...prev, [repoPath]: false }));
    }
  };

  const handleAuthDialogOpenChange = (open: boolean, operation?: "fetch" | "pull" | "push") => {
    setIsAuthDialogOpen(open);
    if (open && operation) {
      setCurrentAuthOperation(operation);
    } else {
      setAuthDialogError(null);
      setCurrentAuthOperation(null);
    }
  };

  if (showGitSetup) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <GitSetupDialog open={showGitSetup} onComplete={handleGitSetupComplete} />
      </div>
    );
  }

  if (isSelectingRepo) {
    return (
      <RepoSelector
        onSelectRepo={handleOpenRepo}
        onCancel={tabs.length > 0 ? () => setIsSelectingRepo(false) : undefined}
      />
    );
  }

  const selectedFile = currentState?.files.find((f) => f.path === currentState.selectedFile);

  return (
    <div className="flex h-screen flex-col bg-background">
      <TopBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={handleCloseTab}
        onReorderTabs={handleReorderTabs}
        onOpenNewRepo={() => setIsSelectingRepo(true)}
        onCreateBranch={handleCreateBranch}
        onStash={handleStash}
        onFetch={() => handleFetch()}
        onPull={() => handlePull()}
        onPush={() => handlePush()}
        hasUncommittedChanges={currentState && currentState.files.length > 0}
        isLoading={isLoading}
        isFetching={isFetching}
        isPulling={isPulling}
        isPushing={isPushing}
        isAnyRemoteOperationActive={isAnyRemoteOperationActive}
        existingBranches={currentState?.branches.map((b) => b.name) || []}
      />

      {/* Main Content */}
      {currentState && repoPath ? (
        <div className="flex flex-1 overflow-hidden relative">
          {loadingRepos[repoPath] && <LoadingOverlay message="Loading repository data..." />}

          {/* Left Sidebar - Accordion */}
          <div className={cn("w-64", isLoading && "pointer-events-none")}>
            <SidebarAccordion
              branches={branchesWithCurrent}
              remoteBranches={(currentState.remoteBranches || []).map((b) => ({
                ...b,
                current: b.current ?? false,
              }))}
              commits={formattedCommits}
              stashes={currentState.stashes}
              selectedCommit={selectedCommit}
              onSelectBranch={handleSelectBranch}
              onSelectCommit={setSelectedCommit}
              onDeleteBranch={handleDeleteBranch}
              onRenameBranch={handleRenameBranch}
              onPullBranch={handlePullBranch}
              onPopStash={handlePopStash}
              onDeleteStash={handleDeleteStash}
              isRenaming={isRenaming}
            />
          </div>

          <div
            className={cn(
              "flex flex-1 flex-col overflow-hidden border-r border-border",
              isLoading && "pointer-events-none"
            )}
          >
            {selectedFile && (
              <DiffViewer
                selectedFile={selectedFile}
                lines={currentState.diffLines}
                isStaged={currentState.isSelectedFileChangeStaged}
                isLoading={loadingDiff}
                wordWrap={wordWrap}
                onWordWrapChange={setWordWrap}
                viewMode={diffViewerMode}
                onViewModeChange={setDiffViewerMode}
                onViewModeChangeStart={() => {
                  setLoadingDiff(true);
                  // Clear diff lines to ensure loader is visible
                  if (repoPath) {
                    updateRepoState(repoPath, { diffLines: [] });
                  }
                }}
                onStageLines={handleStageLines}
                onUnstageLines={handleUnstageLines}
                onStageHunk={handleStageHunk}
                onUnstageHunk={handleUnstageHunk}
              />
            )}
          </div>

          <div className={cn("flex w-96 flex-col", isLoading && "pointer-events-none")}>
            <div className="flex-1 min-h-0">
              <ChangedFilesSidebar
                files={currentState.files}
                repoPath={repoPath}
                onToggleStage={handleToggleStage}
                onSelectFile={handleSelectFile}
                selectedFile={currentState.selectedFile}
                isSelectedFileChangeStaged={currentState.isSelectedFileChangeStaged}
                onStageAll={handleStageAll}
                onUnstageAll={handleUnstageAll}
                onDiscardChanges={handleDiscardChanges}
              />
            </div>
            <CommitPanel
              stagedFilesCount={currentState.files.filter((f) => f.hasStaged).length}
              onCommit={handleCommit}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">No repository selected</p>
        </div>
      )}

      <AuthenticationDialog
        open={isAuthDialogOpen}
        onOpenChange={handleAuthDialogOpenChange}
        isLoading={isFetching || isPulling || isPushing}
        loadingMessage={
          currentAuthOperation === "fetch"
            ? "Fetching from remote..."
            : currentAuthOperation === "pull"
              ? "Pulling from remote..."
              : currentAuthOperation === "push"
                ? "Pushing to remote..."
                : ""
        }
        description={
          currentAuthOperation === "fetch"
            ? "Please enter your credentials to fetch from the remote repository."
            : currentAuthOperation === "pull"
              ? "Please enter your credentials to pull from the remote repository."
              : currentAuthOperation === "push"
                ? "Please enter your credentials to push to the remote repository."
                : ""
        }
        onConfirm={
          currentAuthOperation === "fetch"
            ? handleFetch
            : currentAuthOperation === "pull"
              ? handlePull
              : currentAuthOperation === "push"
                ? handlePush
                : () => Promise.resolve()
        }
        error={authDialogError}
      />

      <ConfirmationDialog
        open={isBranchSwitchConfirmationDialogOpen}
        onOpenChange={setIsBranchSwitchConfirmationDialogOpen}
        title="Stash Changes Before Switching Branch"
        description="You have uncommitted changes"
        isProcessing={isStashingAndSwitchingBranch}
        confirmLabel="Stash & Switch Branch"
        processingLabel="Working..."
        onConfirm={handleStashAndSwitchBranch}
        onCancel={handleCancelStashAndSwitchBranch}
      >
        <div className="p-4 bg-muted rounded-md">
          <p className="text-sm">
            You can't switch to this branch while you have uncommitted changes.
          </p>
          <p className="text-sm mt-2 text-muted-foreground">
            Do you want to stash them and switch to branch{" "}
            <code className="font-semibold">{branchToSwitchTo}</code>?
          </p>
        </div>
      </ConfirmationDialog>
    </div>
  );
};
