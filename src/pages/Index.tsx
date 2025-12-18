import { useState, useEffect } from "react";
import { RepoSelector } from "@/components/git/RepoSelector";
import { SidebarAccordion } from "@/components/git/SidebarAccordion";
import { FileStatus } from "@/components/git/FileStatus";
import { DiffViewer } from "@/components/git/DiffViewer";
import { type DiffViewerMode } from "@/components/git/DiffViewerModeToggle";
import { CommitPanel } from "@/components/git/CommitPanel";
import { RepoTabs, type RepoTab } from "@/components/git/RepoTabs";
import { GitSetupDialog } from "@/components/git/GitSetupDialog";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import {
  listBranches,
  listRemoteBranches,
  getCurrentBranch,
  getStatus,
  stageFile,
  unstageFile,
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
  stageLines,
  unstageLines,
  fetchFromRemote,
  pullFromRemote,
  pullNonCurrentBranch,
  pushToRemote,
  type Branch,
  type FileStatus as GitFileStatus,
  type DiffLine,
  type Commit,
  type Stash,
} from "@/lib/git";
import packageJson from "../../package.json";
import {
  getTabs,
  saveTabs,
  removeTabs,
  getActiveTab,
  saveActiveTab,
  removeActiveTab,
} from "@/lib/localStorage";
import { useGitSetup } from "@/hooks/useGitSetup";
import { useWordWrap } from "@/hooks/useWordWrap";
import { useDiffViewerMode } from "@/hooks/useDiffViewerMode";

// State for each repo tab
interface RepoState {
  currentBranch: string;
  branches: Branch[];
  remoteBranches: Branch[];
  commits: Commit[];
  stashes: Stash[];
  files: GitFileStatus[];
  selectedFile?: string;
  selectedFileIsStaged?: boolean; // Track if viewing staged or unstaged diff
  diffLines: DiffLine[];
}

// Helper function to extract repo name from path
const getRepoNameFromPath = (path: string): string => {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
};

// Helper function to convert view mode to context lines
const getContextLinesForMode = (mode: DiffViewerMode): number => {
  switch (mode) {
    case "full":
      return 999999; // Show entire file
    case "hunks":
      return 3; // Show 3 lines of context around changes
    case "split":
      return 999999; // Split view also shows full file
    default:
      return 999999;
  }
};

export const Index = () => {
  // Load saved tabs from localStorage on mount
  const [tabs, setTabs] = useState<RepoTab[]>(() => {
    if (typeof window !== "undefined") {
      const saved = getTabs();
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return getActiveTab();
    }
    return null;
  });

  const [selectedCommit, setSelectedCommit] = useState<string>();
  const [repoStates, setRepoStates] = useState<Record<string, RepoState>>({});
  const [isSelectingRepo, setIsSelectingRepo] = useState(tabs.length === 0);
  const [loadingRepos, setLoadingRepos] = useState<Record<string, boolean>>({});
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [fetchingRepos, setFetchingRepos] = useState<Record<string, boolean>>(
    {}
  );
  const [pullingRepos, setPullingRepos] = useState<Record<string, boolean>>({});
  const [pushingRepos, setPushingRepos] = useState<Record<string, boolean>>({});
  const [renamingRepos, setRenamingRepos] = useState<Record<string, boolean>>(
    {}
  );

  // Fetch authentication state
  const [showFetchAuthDialog, setShowFetchAuthDialog] = useState(false);
  const [fetchAuthUsername, setFetchAuthUsername] = useState("");
  const [fetchAuthPassword, setFetchAuthPassword] = useState("");
  const [fetchAuthError, setFetchAuthError] = useState<string | null>(null);
  const [saveFetchCredentials, setSaveFetchCredentials] = useState(true);
  const [showFetchPassword, setShowFetchPassword] = useState(false);

  // Pull authentication state
  const [showPullAuthDialog, setShowPullAuthDialog] = useState(false);
  const [pullAuthUsername, setPullAuthUsername] = useState("");
  const [pullAuthPassword, setPullAuthPassword] = useState("");
  const [pullAuthError, setPullAuthError] = useState<string | null>(null);
  const [savePullCredentials, setSavePullCredentials] = useState(true);
  const [showPullPassword, setShowPullPassword] = useState(false);

  // Push authentication state
  const [showPushAuthDialog, setShowPushAuthDialog] = useState(false);
  const [pushAuthUsername, setPushAuthUsername] = useState("");
  const [pushAuthPassword, setPushAuthPassword] = useState("");
  const [pushAuthError, setPushAuthError] = useState<string | null>(null);
  const [savePushCredentials, setSavePushCredentials] = useState(true);
  const [showPushPassword, setShowPushPassword] = useState(false);

  const { diffViewerMode, setDiffViewerMode } = useDiffViewerMode();

  // Auto-fetch interval (5 minutes)
  const [fetchIntervalId, setFetchIntervalId] = useState<NodeJS.Timeout | null>(
    null
  );

  const { showGitSetup, handleGitSetupComplete } = useGitSetup();

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    if (tabs.length > 0) {
      saveTabs(JSON.stringify(tabs));
    } else {
      removeTabs();
    }
  }, [tabs]);

  // Save active tab to localStorage
  useEffect(() => {
    if (activeTabId) {
      saveActiveTab(activeTabId);
    } else {
      removeActiveTab();
    }
  }, [activeTabId]);

  const { wordWrap, setWordWrap } = useWordWrap();

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
          const remoteUrlResult = await window.electronAPI.getRemoteUrl(
            currentRepoPath
          );
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

          const result = await fetchFromRemote(currentRepoPath);

          if (result.success) {
            // Refresh repo data after fetch
            const remoteBranchList = await listRemoteBranches(currentRepoPath);
            const commitHistory = await getCommitHistory(currentRepoPath);
            const branchList = await listBranches(currentRepoPath);

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

  // Load real Git data when active tab changes
  useEffect(() => {
    if (repoPath && !repoStates[repoPath]) {
      const loadGitData = async () => {
        // Set loading state
        setLoadingRepos((prev) => ({ ...prev, [repoPath]: true }));

        try {
          const current = await getCurrentBranch(repoPath);
          const branchList = await listBranches(repoPath);
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
            description:
              error instanceof Error ? error.message : "Unknown error",
          });
        } finally {
          // Clear loading state
          setLoadingRepos((prev) => ({ ...prev, [repoPath]: false }));
        }
      };
      loadGitData();
    }
  }, [repoPath]);

  // Load diff when selected file changes or view mode changes
  // Note: We intentionally don't include selectedFileIsStaged in dependencies
  // to avoid reloading when programmatically updating the section after staging
  useEffect(() => {
    if (repoPath && currentState?.selectedFile) {
      const loadDiff = async () => {
        setLoadingDiff(true);
        try {
          const diff = await getDiff(
            repoPath,
            currentState.selectedFile!,
            currentState.selectedFileIsStaged ?? false,
            getContextLinesForMode(diffViewerMode)
          );
          updateRepoState(repoPath, { diffLines: diff });
        } catch (error) {
          console.error("Error loading diff:", error);
          toast.error("Failed to load diff", {
            description:
              error instanceof Error ? error.message : "Unknown error",
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
  }, [repoPath, currentState?.selectedFile, diffViewerMode]);

  // Refresh git data when window regains focus
  useEffect(() => {
    if (!repoPath) return;

    const handleFocus = async () => {
      try {
        const statusList = await getStatus(repoPath);
        const commitHistory = await getCommitHistory(repoPath);
        const branchList = await listBranches(repoPath);
        const current = await getCurrentBranch(repoPath);
        const stashList = await listStashes(repoPath);

        // Check if selected file still exists and adjust section if needed
        let newSelectedFileIsStaged = currentState?.selectedFileIsStaged;
        if (currentState?.selectedFile) {
          const selectedFileStatus = statusList.find(
            (f) => f.path === currentState.selectedFile
          );
          if (selectedFileStatus) {
            // If viewing unstaged but file no longer has unstaged changes, switch to staged
            if (
              currentState.selectedFileIsStaged === false &&
              !selectedFileStatus.hasUnstaged &&
              selectedFileStatus.hasStaged
            ) {
              newSelectedFileIsStaged = true;
            }
            // If viewing staged but file no longer has staged changes, switch to unstaged
            else if (
              currentState.selectedFileIsStaged === true &&
              !selectedFileStatus.hasStaged &&
              selectedFileStatus.hasUnstaged
            ) {
              newSelectedFileIsStaged = false;
            }
          }
        }

        updateRepoState(repoPath, {
          files: statusList,
          commits: commitHistory,
          branches: branchList,
          currentBranch: current,
          stashes: stashList,
          selectedFileIsStaged: newSelectedFileIsStaged,
        });

        // Reload diff if a file is selected
        if (currentState?.selectedFile) {
          const diff = await getDiff(
            repoPath,
            currentState.selectedFile,
            newSelectedFileIsStaged ?? false,
            getContextLinesForMode(diffViewerMode)
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
  }, [repoPath, currentState?.selectedFile]);

  // Tab management functions
  const handleOpenRepo = (path: string) => {
    const existingTab = tabs.find((tab) => tab.path === path);

    if (existingTab) {
      // If tab already exists, just switch to it
      setActiveTabId(existingTab.id);
    } else {
      // Create new tab
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
    if (!repoPath || !currentState) return;

    try {
      // Check if file was in both sections before staging/unstaging
      const fileBeforeAction = currentState.files.find((f) => f.path === path);
      const wasInBothSections =
        fileBeforeAction?.hasStaged && fileBeforeAction?.hasUnstaged;

      if (shouldStage) {
        // Stage the file
        await stageFile(repoPath, path);
      } else {
        // Unstage the file
        await unstageFile(repoPath, path);
      }

      // Refresh the git status
      const statusList = await getStatus(repoPath);

      // If this is the selected file, update which section it's shown in
      if (currentState.selectedFile === path) {
        // Only reload diff if file was in both sections (meaning changes shifted)
        if (wasInBothSections) {
          setLoadingDiff(true);
          try {
            const diff = await getDiff(
              repoPath,
              path,
              shouldStage,
              getContextLinesForMode(diffViewerMode)
            );
            updateRepoState(repoPath, {
              files: statusList,
              selectedFileIsStaged: shouldStage,
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
            selectedFileIsStaged: shouldStage,
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

  const handleStageLine = async (lineIndex: number) => {
    if (!repoPath || !currentState || !currentState.selectedFile) return;

    try {
      setLoadingDiff(true);
      const line = currentState.diffLines[lineIndex];
      await stageLines(repoPath, currentState.selectedFile, [line]);

      // Refresh both status and diff
      const [statusList, newDiff] = await Promise.all([
        getStatus(repoPath),
        getDiff(repoPath, currentState.selectedFile),
      ]);

      updateRepoState(repoPath, {
        files: statusList,
        diffLines: newDiff,
      });
    } catch (error) {
      console.error("Error staging line:", error);
      toast.error("Failed to stage", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoadingDiff(false);
    }
  };

  const handleUnstageLine = async (lineIndex: number) => {
    if (!repoPath || !currentState || !currentState.selectedFile) return;

    try {
      setLoadingDiff(true);
      const line = currentState.diffLines[lineIndex];
      await unstageLines(repoPath, currentState.selectedFile, [line]);

      // Refresh both status and diff
      const [statusList, newDiff] = await Promise.all([
        getStatus(repoPath),
        getDiff(repoPath, currentState.selectedFile),
      ]);

      updateRepoState(repoPath, {
        files: statusList,
        diffLines: newDiff,
      });
    } catch (error) {
      console.error("Error unstaging line:", error);
      toast.error("Failed to unstage", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoadingDiff(false);
    }
  };

  const handleStageAll = async () => {
    if (!repoPath || !currentState) return;

    try {
      // Check if selected file was in both sections before staging
      const selectedFileBeforeAction = currentState.selectedFile
        ? currentState.files.find((f) => f.path === currentState.selectedFile)
        : null;
      const wasInBothSections =
        selectedFileBeforeAction?.hasStaged &&
        selectedFileBeforeAction?.hasUnstaged;

      // Get all unstaged files
      const unstagedFiles = currentState.files.filter((f) => f.hasUnstaged);

      // Stage each file individually to properly handle deleted files
      for (const file of unstagedFiles) {
        await stageFile(repoPath, file.path);
      }

      // Refresh the git status
      const statusList = await getStatus(repoPath);

      // If the selected file was in unstaged section, move selection to staged section
      if (
        currentState.selectedFile &&
        currentState.selectedFileIsStaged === false
      ) {
        // Only reload diff if file was in both sections
        if (wasInBothSections) {
          setLoadingDiff(true);
          try {
            const diff = await getDiff(
              repoPath,
              currentState.selectedFile,
              true,
              getContextLinesForMode(diffViewerMode)
            );
            updateRepoState(repoPath, {
              files: statusList,
              selectedFileIsStaged: true,
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
            selectedFileIsStaged: true,
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
    if (!repoPath || !currentState) return;

    try {
      // Check if selected file was in both sections before unstaging
      const selectedFileBeforeAction = currentState.selectedFile
        ? currentState.files.find((f) => f.path === currentState.selectedFile)
        : null;
      const wasInBothSections =
        selectedFileBeforeAction?.hasStaged &&
        selectedFileBeforeAction?.hasUnstaged;

      // Get all staged files
      const stagedFiles = currentState.files.filter((f) => f.hasStaged);

      // Unstage each file individually
      for (const file of stagedFiles) {
        await unstageFile(repoPath, file.path);
      }

      // Refresh the git status
      const statusList = await getStatus(repoPath);

      // If the selected file was in staged section, move selection to unstaged section
      if (
        currentState.selectedFile &&
        currentState.selectedFileIsStaged === true
      ) {
        // Only reload diff if file was in both sections
        if (wasInBothSections) {
          setLoadingDiff(true);
          try {
            const diff = await getDiff(
              repoPath,
              currentState.selectedFile,
              false,
              getContextLinesForMode(diffViewerMode)
            );
            updateRepoState(repoPath, {
              files: statusList,
              selectedFileIsStaged: false,
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
            selectedFileIsStaged: false,
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

  const handleCommit = async (message: string, description?: string) => {
    if (!repoPath || !currentState) return;

    const stagedCount = currentState.files.filter((f) => f.hasStaged).length;

    if (stagedCount === 0) {
      toast.error("No files staged for commit");
      return;
    }

    try {
      const result = await commit(repoPath, message, description);

      if (result.success) {
        toast.success(
          `Committed ${stagedCount} file${
            stagedCount !== 1 ? "s" : ""
          }: ${message}`
        );

        // Refresh git status, commit history, and branches after commit
        const statusList = await getStatus(repoPath);
        const commitHistory = await getCommitHistory(repoPath);
        const branchList = await listBranches(repoPath);
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
    if (!repoPath || !currentState) return;

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
      const branchList = await listBranches(repoPath);
      updateRepoState(repoPath, {
        currentBranch: branch,
        files: statusList,
        commits: commitHistory,
        branches: branchList,
      });
    } catch (error) {
      console.error("Error switching branch:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Check if error is about uncommitted changes
      if (
        errorMessage.includes(
          "Your local changes to the following files would be overwritten"
        ) ||
        errorMessage.includes("Please commit your changes or stash them")
      ) {
        toast.error("Cannot switch branches", {
          description: "You have uncommitted changes. Stash them to continue?",
          style: { minWidth: "500px" },
          action: {
            label: "Stash & Switch",
            onClick: async () => {
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
                  await checkoutBranch(repoPath, branch);
                  toast.info(`Switched to branch: ${branch}`);

                  // Refresh git status, commit history, branches, and stashes
                  const statusList = await getStatus(repoPath);
                  const commitHistory = await getCommitHistory(repoPath);
                  const branchList = await listBranches(repoPath);
                  const stashList = await listStashes(repoPath);
                  updateRepoState(repoPath, {
                    currentBranch: branch,
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
              } catch (stashError) {
                console.error("Error stashing and switching:", stashError);
                toast.error("Failed to stash and switch", {
                  description:
                    stashError instanceof Error
                      ? stashError.message
                      : "Unknown error",
                });
              }
            },
          },
          cancel: {
            label: "Cancel",
            onClick: () => {},
          },
          duration: Infinity,
        });
      } else {
        // For other errors, show the standard error toast
        toast.error("Failed to switch branch", {
          description: errorMessage,
        });
      }
    }
  };

  const handleCreateBranch = async (branchName: string) => {
    if (!repoPath) return;

    try {
      await createBranch(repoPath, branchName);
      toast.success(`Created and switched to branch: ${branchName}`);

      // Refresh branches and update current branch
      const branchList = await listBranches(repoPath);
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
    if (!repoPath) return;

    try {
      await deleteBranch(repoPath, branchName);
      toast.success(`Branch deleted: ${branchName}`);

      // Refresh branches
      const branchList = await listBranches(repoPath);
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
    if (!repoPath || !currentState) return;

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
      const branchList = await listBranches(repoPath);
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

  const handleStash = async () => {
    if (!repoPath || !currentState) return;

    // Check if there are any changes to stash
    if (currentState.files.length === 0) {
      toast.error("No changes to stash");
      return;
    }

    try {
      // Create a human-readable timestamp with 24-hour format and date
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

        // Refresh git status, commit history, and stashes after stash
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
    if (!repoPath || !currentState) return;

    try {
      const stash = currentState.stashes[index];
      const result = await popStash(repoPath, index);

      if (result.success) {
        toast.success(`Stash popped: ${stash.message}`);

        // Refresh git status, commit history, and stashes after pop
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
    if (!repoPath || !currentState) return;

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

  // Helper function to format commit date
  const formatCommitDate = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp * 1000;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    if (weeks === 1) return "1 week ago";
    if (weeks < 4) return `${weeks} weeks ago`;
    if (months === 1) return "1 month ago";
    return `${months} months ago`;
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

  const handleSelectFile = async (filePath: string, isStaged: boolean) => {
    if (!repoPath || !currentState) return;

    // Check if we're selecting the same file in a different section
    const isSameFileNewSection =
      currentState.selectedFile === filePath &&
      currentState.selectedFileIsStaged !== isStaged;

    // Update selection state
    updateRepoState(repoPath, {
      selectedFile: filePath,
      selectedFileIsStaged: isStaged,
    });

    // If same file but different section, manually reload the diff
    if (isSameFileNewSection) {
      setLoadingDiff(true);
      try {
        const diff = await getDiff(
          repoPath,
          filePath,
          isStaged,
          getContextLinesForMode(diffViewerMode)
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
    }
  };

  const handleFetch = async (username?: string, password?: string) => {
    if (!repoPath) return;

    try {
      // Set fetching state
      setFetchingRepos((prev) => ({ ...prev, [repoPath]: true }));

      const result = await fetchFromRemote(
        repoPath,
        username,
        password,
        saveFetchCredentials
      );

      if (result.success) {
        toast.success("Successfully fetched from remote");

        // Close auth dialog if open
        setShowFetchAuthDialog(false);
        setFetchAuthUsername("");
        setFetchAuthPassword("");
        setFetchAuthError(null);
        setSaveFetchCredentials(true);
        setShowFetchPassword(false);

        // Refresh remote branches and commit history after fetch
        const remoteBranchList = await listRemoteBranches(repoPath);
        const commitHistory = await getCommitHistory(repoPath);
        const branchList = await listBranches(repoPath);

        updateRepoState(repoPath, {
          remoteBranches: remoteBranchList,
          commits: commitHistory,
          branches: branchList,
        });
      } else if (result.needsAuth) {
        // Show authentication dialog (first time - no error yet)
        // Get hostname from remote URL for display
        try {
          const remoteUrlResult = await window.electronAPI.getRemoteUrl(
            repoPath
          );
          if (remoteUrlResult.success) {
            const url = new URL(remoteUrlResult.url);
            // Clear credentials for security
            setFetchAuthUsername("");
            setFetchAuthPassword("");
            setFetchAuthError(null); // Clear any previous errors
            setShowFetchPassword(false);
            setShowFetchAuthDialog(true);
          }
        } catch {
          // Clear credentials for security
          setFetchAuthUsername("");
          setFetchAuthPassword("");
          setFetchAuthError(null); // Clear any previous errors
          setShowFetchPassword(false);
          setShowFetchAuthDialog(true);
        }
      } else {
        // If the auth dialog is open, only show error in dialog (not toast)
        // Otherwise show toast for other types of errors
        if (showFetchAuthDialog) {
          setFetchAuthError(result.error || null);
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

  const handleConfirmFetchAuth = async () => {
    if (!fetchAuthUsername.trim() || !fetchAuthPassword.trim()) {
      setFetchAuthError("Please enter both username and password");
      return;
    }

    await handleFetch(fetchAuthUsername, fetchAuthPassword);
  };

  const handleCancelFetchAuth = () => {
    setShowFetchAuthDialog(false);
    setFetchAuthUsername("");
    setFetchAuthPassword("");
    setFetchAuthError(null);
    setSaveFetchCredentials(true);
    setShowFetchPassword(false);
  };

  const handlePush = async (username?: string, password?: string) => {
    if (!repoPath) return;

    try {
      // Set pushing state
      setPushingRepos((prev) => ({ ...prev, [repoPath]: true }));

      const result = await pushToRemote(
        repoPath,
        username,
        password,
        savePushCredentials
      );

      if (result.success) {
        toast.success("Successfully pushed to remote");

        // Close auth dialog if open
        setShowPushAuthDialog(false);
        setPushAuthUsername("");
        setPushAuthPassword("");
        setPushAuthError(null);
        setSavePushCredentials(true);
        setShowPushPassword(false);

        // Refresh remote branches, local branches, and commit history after push
        const remoteBranchList = await listRemoteBranches(repoPath);
        const commitHistory = await getCommitHistory(repoPath);
        const branchList = await listBranches(repoPath);

        updateRepoState(repoPath, {
          remoteBranches: remoteBranchList,
          commits: commitHistory,
          branches: branchList,
        });
      } else if (result.needsAuth) {
        // Show authentication dialog (first time - no error yet)
        // Get hostname from remote URL for display
        try {
          const remoteUrlResult = await window.electronAPI.getRemoteUrl(
            repoPath
          );
          if (remoteUrlResult.success) {
            const url = new URL(remoteUrlResult.url);
            // Clear credentials for security
            setPushAuthUsername("");
            setPushAuthPassword("");
            setPushAuthError(null); // Clear any previous errors
            setShowPushPassword(false);
            setShowPushAuthDialog(true);
          }
        } catch {
          // Clear credentials for security
          setPushAuthUsername("");
          setPushAuthPassword("");
          setPushAuthError(null); // Clear any previous errors
          setShowPushPassword(false);
          setShowPushAuthDialog(true);
        }
      } else {
        // If the auth dialog is open, only show error in dialog (not toast)
        // Otherwise show toast for other types of errors
        if (showPushAuthDialog) {
          setPushAuthError(result.error || null);
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

  const handleConfirmPushAuth = async () => {
    if (!pushAuthUsername.trim() || !pushAuthPassword.trim()) {
      setPushAuthError("Please enter both username and password");
      return;
    }

    await handlePush(pushAuthUsername, pushAuthPassword);
  };

  const handleCancelPushAuth = () => {
    setShowPushAuthDialog(false);
    setPushAuthUsername("");
    setPushAuthPassword("");
    setPushAuthError(null);
    setSavePushCredentials(true);
    setShowPushPassword(false);
  };

  const handlePull = async (username?: string, password?: string) => {
    if (!repoPath) return;

    try {
      // Set pulling state
      setPullingRepos((prev) => ({ ...prev, [repoPath]: true }));

      const result = await pullFromRemote(
        repoPath,
        username,
        password,
        savePullCredentials
      );

      if (result.success) {
        toast.success("Successfully pulled from remote");

        // Close auth dialog if open
        setShowPullAuthDialog(false);
        setPullAuthUsername("");
        setPullAuthPassword("");
        setPullAuthError(null);
        setSavePullCredentials(true);
        setShowPullPassword(false);

        // Refresh all repo data after pull
        const remoteBranchList = await listRemoteBranches(repoPath);
        const commitHistory = await getCommitHistory(repoPath);
        const branchList = await listBranches(repoPath);
        const statusResult = await getStatus(repoPath);

        updateRepoState(repoPath, {
          remoteBranches: remoteBranchList,
          commits: commitHistory,
          branches: branchList,
          files: statusResult,
        });
      } else if (result.needsAuth) {
        // Show authentication dialog (first time - no error yet)
        // Get hostname from remote URL for display
        try {
          const remoteUrlResult = await window.electronAPI.getRemoteUrl(
            repoPath
          );
          if (remoteUrlResult.success) {
            const url = new URL(remoteUrlResult.url);
            // Clear credentials for security
            setPullAuthUsername("");
            setPullAuthPassword("");
            setPullAuthError(null); // Clear any previous errors
            setShowPullPassword(false);
            setShowPullAuthDialog(true);
          }
        } catch {
          // Clear credentials for security
          setPullAuthUsername("");
          setPullAuthPassword("");
          setPullAuthError(null); // Clear any previous errors
          setShowPullPassword(false);
          setShowPullAuthDialog(true);
        }
      } else {
        // If the auth dialog is open, only show error in dialog (not toast)
        // Otherwise show toast for other types of errors
        if (showPullAuthDialog) {
          setPullAuthError(result.error || null);
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

  const handleConfirmPullAuth = async () => {
    if (!pullAuthUsername.trim() || !pullAuthPassword.trim()) {
      setPullAuthError("Please enter both username and password");
      return;
    }

    await handlePull(pullAuthUsername, pullAuthPassword);
  };

  const handleCancelPullAuth = () => {
    setShowPullAuthDialog(false);
    setPullAuthUsername("");
    setPullAuthPassword("");
    setPullAuthError(null);
    setSavePullCredentials(true);
    setShowPullPassword(false);
  };

  const handlePullBranch = async (branchName: string) => {
    if (!repoPath) return;

    // Get the branch object to check if it has unpushed commits
    const state = repoStates[repoPath];
    if (!state) return;

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

      const result = await pullNonCurrentBranch(
        repoPath,
        branchName,
        undefined,
        undefined,
        true
      );

      if (result.success) {
        toast.success(`Successfully pulled branch "${branchName}"`);

        // Refresh branch list and commits to show updated state
        const branchList = await listBranches(repoPath);
        const remoteBranchList = await listRemoteBranches(repoPath);
        const commitHistory = await getCommitHistory(repoPath);

        updateRepoState(repoPath, {
          branches: branchList,
          remoteBranches: remoteBranchList,
          commits: commitHistory,
        });
      } else if (result.needsAuth) {
        // For now, show a message that auth is needed
        // In the future, we could show an auth dialog specifically for this operation
        toast.error(
          "Authentication required. Please configure your credentials."
        );
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

  if (showGitSetup) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <GitSetupDialog
          open={showGitSetup}
          onComplete={handleGitSetupComplete}
        />
      </div>
    );
  }

  // If selecting repo, show repo selector
  if (isSelectingRepo) {
    return (
      <div className="relative h-screen w-full">
        {isCloning && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">
                Cloning repository...
              </p>
            </div>
          </div>
        )}
        <RepoSelector
          onSelectRepo={handleOpenRepo}
          onCancel={
            tabs.length > 0 ? () => setIsSelectingRepo(false) : undefined
          }
          onCloningChange={setIsCloning}
        />
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/60">
          NeatGit v{packageJson.version}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Tabs Header */}
      <RepoTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={handleCloseTab}
        onReorderTabs={handleReorderTabs}
        onOpenNewRepo={() => setIsSelectingRepo(true)}
        onCreateBranch={handleCreateBranch}
        onStash={handleStash}
        onFetch={handleFetch}
        onPull={handlePull}
        onPush={handlePush}
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
          {/* Loading Overlay */}
          {loadingRepos[repoPath] && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Loading repository data...
                </p>
              </div>
            </div>
          )}

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
              onCreateBranch={handleCreateBranch}
              onDeleteBranch={handleDeleteBranch}
              onRenameBranch={handleRenameBranch}
              onPullBranch={handlePullBranch}
              onPopStash={handlePopStash}
              onDeleteStash={handleDeleteStash}
              isRenaming={isRenaming}
            />
          </div>

          {/* Center - Diff Viewer */}
          <div
            className={cn(
              "flex flex-1 flex-col overflow-hidden border-r border-border",
              isLoading && "pointer-events-none"
            )}
          >
            <DiffViewer
              filePath={currentState.selectedFile}
              lines={currentState.diffLines}
              fileStatus={
                currentState.selectedFile
                  ? currentState.files.find(
                      (f) => f.path === currentState.selectedFile
                    )?.status
                  : undefined
              }
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
            />
          </div>

          {/* Right - Changes */}
          <div
            className={cn(
              "flex w-96 flex-col",
              isLoading && "pointer-events-none"
            )}
          >
            <div className="flex-1 min-h-0">
              <FileStatus
                files={currentState.files}
                onToggleStage={handleToggleStage}
                onSelectFile={handleSelectFile}
                selectedFile={currentState.selectedFile}
                selectedFileIsStaged={currentState.selectedFileIsStaged}
                onStageAll={handleStageAll}
                onUnstageAll={handleUnstageAll}
              />
            </div>
            <CommitPanel
              stagedFilesCount={
                currentState.files.filter((f) => f.hasStaged).length
              }
              onCommit={handleCommit}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">No repository selected</p>
        </div>
      )}

      {/* Fetch Authentication Dialog */}
      <Dialog
        open={showFetchAuthDialog}
        onOpenChange={(open) => {
          if (!isFetching) {
            setShowFetchAuthDialog(open);
          }
        }}
      >
        <DialogContent>
          {isFetching && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg pointer-events-auto">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Fetching from remote...
                </p>
              </div>
            </div>
          )}
          <div className={isFetching ? "pointer-events-none" : ""}>
            <DialogHeader>
              <DialogTitle>Authentication Required</DialogTitle>
              <DialogDescription>
                Please enter your credentials to fetch from the remote
                repository.
              </DialogDescription>
            </DialogHeader>

            {fetchAuthError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{fetchAuthError}</p>
              </div>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fetch-auth-username">Username</Label>
                <Input
                  id="fetch-auth-username"
                  value={fetchAuthUsername}
                  onChange={(e) => {
                    setFetchAuthUsername(e.target.value);
                    if (fetchAuthError) setFetchAuthError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isFetching) {
                      handleConfirmFetchAuth();
                    } else if (e.key === "Escape" && !isFetching) {
                      handleCancelFetchAuth();
                    }
                  }}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fetch-auth-password">Password / Token</Label>
                <div className="relative">
                  <Input
                    id="fetch-auth-password"
                    type={showFetchPassword ? "text" : "password"}
                    value={fetchAuthPassword}
                    onChange={(e) => {
                      setFetchAuthPassword(e.target.value);
                      if (fetchAuthError) setFetchAuthError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isFetching) {
                        handleConfirmFetchAuth();
                      } else if (e.key === "Escape" && !isFetching) {
                        handleCancelFetchAuth();
                      }
                    }}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowFetchPassword(!showFetchPassword)}
                    tabIndex={-1}
                  >
                    {showFetchPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-fetch-credentials"
                  checked={saveFetchCredentials}
                  onCheckedChange={(checked) =>
                    setSaveFetchCredentials(checked as boolean)
                  }
                />
                <label
                  htmlFor="save-fetch-credentials"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Save my credentials on this device
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCancelFetchAuth}
                disabled={isFetching}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmFetchAuth}
                disabled={
                  isFetching ||
                  !fetchAuthUsername.trim() ||
                  !fetchAuthPassword.trim()
                }
              >
                {isFetching ? "Authenticating..." : "Sign In"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Push Authentication Dialog */}
      <Dialog
        open={showPushAuthDialog}
        onOpenChange={(open) => {
          if (!isPushing) {
            setShowPushAuthDialog(open);
          }
        }}
      >
        <DialogContent>
          {isPushing && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg pointer-events-auto">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Pushing to remote...
                </p>
              </div>
            </div>
          )}
          <div className={isPushing ? "pointer-events-none" : ""}>
            <DialogHeader>
              <DialogTitle>Authentication Required</DialogTitle>
              <DialogDescription>
                Please enter your credentials to push to the remote repository.
              </DialogDescription>
            </DialogHeader>

            {pushAuthError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{pushAuthError}</p>
              </div>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="push-auth-username">Username</Label>
                <Input
                  id="push-auth-username"
                  value={pushAuthUsername}
                  onChange={(e) => {
                    setPushAuthUsername(e.target.value);
                    if (pushAuthError) setPushAuthError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isPushing) {
                      handleConfirmPushAuth();
                    } else if (e.key === "Escape" && !isPushing) {
                      handleCancelPushAuth();
                    }
                  }}
                  placeholder="Enter your username"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="push-auth-password">Password / Token</Label>
                <div className="relative">
                  <Input
                    id="push-auth-password"
                    type={showPushPassword ? "text" : "password"}
                    value={pushAuthPassword}
                    onChange={(e) => {
                      setPushAuthPassword(e.target.value);
                      if (pushAuthError) setPushAuthError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isPushing) {
                        handleConfirmPushAuth();
                      } else if (e.key === "Escape" && !isPushing) {
                        handleCancelPushAuth();
                      }
                    }}
                    placeholder="Enter your password or personal access token"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPushPassword(!showPushPassword)}
                    tabIndex={-1}
                  >
                    {showPushPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-push-credentials"
                  checked={savePushCredentials}
                  onCheckedChange={(checked) =>
                    setSavePushCredentials(checked as boolean)
                  }
                />
                <label
                  htmlFor="save-push-credentials"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Save my credentials on this device
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCancelPushAuth}
                disabled={isPushing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPushAuth}
                disabled={
                  isPushing ||
                  !pushAuthUsername.trim() ||
                  !pushAuthPassword.trim()
                }
              >
                {isPushing ? "Authenticating..." : "Sign In"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pull Authentication Dialog */}
      <Dialog
        open={showPullAuthDialog}
        onOpenChange={(open) => {
          if (!isPulling) {
            setShowPullAuthDialog(open);
          }
        }}
      >
        <DialogContent>
          {isPulling && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg pointer-events-auto">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Pulling from remote...
                </p>
              </div>
            </div>
          )}
          <div className={isPulling ? "pointer-events-none" : ""}>
            <DialogHeader>
              <DialogTitle>Authentication Required</DialogTitle>
              <DialogDescription>
                Please enter your credentials to pull from the remote
                repository.
              </DialogDescription>
            </DialogHeader>

            {pullAuthError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{pullAuthError}</p>
              </div>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pull-auth-username">Username</Label>
                <Input
                  id="pull-auth-username"
                  value={pullAuthUsername}
                  onChange={(e) => {
                    setPullAuthUsername(e.target.value);
                    if (pullAuthError) setPullAuthError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isPulling) {
                      handleConfirmPullAuth();
                    } else if (e.key === "Escape" && !isPulling) {
                      handleCancelPullAuth();
                    }
                  }}
                  placeholder="Enter your username"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pull-auth-password">Password / Token</Label>
                <div className="relative">
                  <Input
                    id="pull-auth-password"
                    type={showPullPassword ? "text" : "password"}
                    value={pullAuthPassword}
                    onChange={(e) => {
                      setPullAuthPassword(e.target.value);
                      if (pullAuthError) setPullAuthError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isPulling) {
                        handleConfirmPullAuth();
                      } else if (e.key === "Escape" && !isPulling) {
                        handleCancelPullAuth();
                      }
                    }}
                    placeholder="Enter your password or personal access token"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPullPassword(!showPullPassword)}
                    tabIndex={-1}
                  >
                    {showPullPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-pull-credentials"
                  checked={savePullCredentials}
                  onCheckedChange={(checked) =>
                    setSavePullCredentials(checked as boolean)
                  }
                />
                <label
                  htmlFor="save-pull-credentials"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Save my credentials on this device
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCancelPullAuth}
                disabled={isPulling}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPullAuth}
                disabled={
                  isPulling ||
                  !pullAuthUsername.trim() ||
                  !pullAuthPassword.trim()
                }
              >
                {isPulling ? "Authenticating..." : "Sign In"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
