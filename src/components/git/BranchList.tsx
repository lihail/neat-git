import {
  GitBranch,
  Plus,
  Download,
  Copy,
  Edit,
  Trash2,
  ArrowDown,
  ArrowUp,
  Loader2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Branch {
  name: string;
  current: boolean;
  behind?: number;
  ahead?: number;
  hasUpstream?: boolean;
}

interface BranchListProps {
  branches: Branch[];
  remoteBranches?: Branch[];
  onSelectBranch: (branchName: string) => void;
  onCreateBranch?: (branchName: string) => void;
  onRenameBranch?: (oldName: string, newName: string, alsoRenameRemote: boolean) => void;
  onPullBranch?: (branchName: string) => void;
  isRenaming?: boolean;
}

// TODO: this component isn't used. maybe use it in SidebarAccordion
export const BranchList = ({
  branches,
  remoteBranches = [],
  onSelectBranch,
  onCreateBranch,
  onRenameBranch,
  onPullBranch,
  isRenaming = false,
}: BranchListProps) => {
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [renamingBranch, setRenamingBranch] = useState<string | null>(null);
  const [renameBranchNewName, setRenameBranchNewName] = useState("");
  const [renameAlsoRemote, setRenameAlsoRemote] = useState(false);
  const [renameBranchNameError, setRenameBranchNameError] = useState<string | null>(null);
  const [wasRenaming, setWasRenaming] = useState(false);

  // Close dialog after rename operation completes
  useEffect(() => {
    if (wasRenaming && !isRenaming && renamingBranch !== null) {
      // Operation completed, close dialog
      setRenamingBranch(null);
      setRenameBranchNewName("");
      setRenameAlsoRemote(false);
      setRenameBranchNameError(null);
    }
    setWasRenaming(isRenaming);
  }, [isRenaming, wasRenaming, renamingBranch]);

  const validateBranchName = (name: string): string | null => {
    if (!name.trim()) {
      return "Branch name cannot be empty";
    }

    // Git branch naming rules
    if (name.startsWith(".")) {
      return "Branch name cannot start with a dot";
    }
    if (name.endsWith("/")) {
      return "Branch name cannot end with a slash";
    }
    if (name.endsWith(".lock")) {
      return "Branch name cannot end with .lock";
    }
    if (name.includes("..")) {
      return "Branch name cannot contain consecutive dots";
    }
    if (name.includes("//")) {
      return "Branch name cannot contain consecutive slashes";
    }
    if (name.includes("@{")) {
      return "Branch name cannot contain @{";
    }
    if (/[\s~^:?*\[\]\\]/.test(name)) {
      return "Branch name cannot contain spaces or special characters (~^:?*[]\\)";
    }
    if (name.startsWith("/")) {
      return "Branch name cannot start with a slash";
    }

    return null;
  };

  const handleCreateBranch = () => {
    if (newBranchName.trim() && onCreateBranch) {
      onCreateBranch(newBranchName.trim());
      setNewBranchName("");
      setIsCreatingBranch(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateBranch();
    } else if (e.key === "Escape") {
      setNewBranchName("");
      setIsCreatingBranch(false);
    }
  };
  return (
    <div className="flex h-full flex-col border-r border-border">
      {/* Local Branches */}
      <div
        className={cn(
          "flex flex-col",
          remoteBranches.length > 0 ? "h-1/2" : "flex-1"
        )}
      >
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <GitBranch className="h-4 w-4 text-primary" />
              Local Branches
            </h2>
            {onCreateBranch && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsCreatingBranch(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          {isCreatingBranch && (
            <div className="mt-2">
              <Input
                autoFocus
                placeholder="New branch name..."
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (!newBranchName.trim()) {
                    setIsCreatingBranch(false);
                  }
                }}
                className="h-8 text-xs"
              />
            </div>
          )}
        </div>

        {/* Test context menu - DELETE THIS AFTER TESTING */}
        <ContextMenu>
          <ContextMenuTrigger className="p-2 bg-blue-500 text-white m-2">
            Right-click me to test
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => alert("Test works!")}>
              Test Item
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2">
            {branches.map((branch) => (
              <ContextMenu key={branch.name}>
                <ContextMenuTrigger className="w-full">
                  <button
                    onDoubleClick={() => onSelectBranch(branch.name)}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                      branch.current && "bg-secondary text-primary"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono">{branch.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {branch.behind !== undefined && branch.behind > 0 && (
                          <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <span>{branch.behind}</span>
                            <ArrowDown className="h-3 w-3" />
                          </div>
                        )}
                        {branch.ahead !== undefined && branch.ahead > 0 && (
                          <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <span>{branch.ahead}</span>
                            <ArrowUp className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  {/* Pull option - disabled if branch has no upstream or has unpushed commits */}
                  {!branch.hasUpstream ? (
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-muted-foreground opacity-50">
                            <Download className="mr-2 h-4 w-4" />
                            <span>Pull</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Cannot pull: branch is not tracking a remote branch</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : branch.ahead !== undefined && branch.ahead > 0 && !branch.current ? (
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-muted-foreground opacity-50">
                            <Download className="mr-2 h-4 w-4" />
                            <span>Pull</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Cannot pull: branch has unpushed commits.</p>
                          <p>Switch to this branch first and push them.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <ContextMenuItem
                      onSelect={() => {
                        if (onPullBranch) {
                          onPullBranch(branch.name);
                        }
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      <span>Pull</span>
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem
                    onSelect={() => {
                      navigator.clipboard.writeText(branch.name);
                      toast.success(`Copied "${branch.name}" to clipboard`);
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Copy Branch Name</span>
                  </ContextMenuItem>
                  <ContextMenuItem
                    onSelect={() => {
                      setRenamingBranch(branch.name);
                      setRenameBranchNewName(branch.name);
                      setRenameAlsoRemote(false);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Rename</span>
                  </ContextMenuItem>
                  {branch.current ? (
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-muted-foreground opacity-50">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Cannot delete current branch.</p>
                          <p>Switch to a different branch first</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <ContextMenuItem className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </ContextMenuItem>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Remote Branches */}
      {remoteBranches.length > 0 && (
        <div className="flex h-1/2 flex-col border-t border-border min-h-0">
          <div className="border-b border-border p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <GitBranch className="h-4 w-4 text-primary" />
              Remote Branches
            </h2>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2">
              {remoteBranches.map((branch) => (
                <button
                  key={branch.name}
                  onDoubleClick={() => onSelectBranch(branch.name)}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                    branch.current && "bg-secondary text-primary"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate font-mono">{branch.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Rename Branch Dialog */}
      <Dialog open={renamingBranch !== null} onOpenChange={(open) => {
        if (!open && !isRenaming) {
          setRenamingBranch(null);
          setRenameBranchNewName("");
          setRenameAlsoRemote(false);
          setRenameBranchNameError(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Branch</DialogTitle>
            <DialogDescription>
              Enter a new name for the branch "{renamingBranch}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch Name</Label>
              <Input
                id="branch-name"
                value={renameBranchNewName}
                onChange={(e) => {
                  const value = e.target.value;
                  setRenameBranchNewName(value);
                  // Clear error when user starts typing
                  if (renameBranchNameError) {
                    setRenameBranchNameError(null);
                  }
                }}
                placeholder="Enter new branch name"
                className={cn(
                  renameBranchNameError &&
                    "border-destructive focus-visible:ring-destructive"
                )}
              />
              {renameBranchNameError && (
                <p className="text-xs text-destructive">
                  {renameBranchNameError}
                </p>
              )}
            </div>
            {(() => {
              const branchHasUpstream = branches.find(
                (b) => b.name === renamingBranch
              )?.hasUpstream ?? false;
              return (
                <div className="flex items-center space-x-2">
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="also-remote"
                            checked={renameAlsoRemote}
                            onCheckedChange={(checked) =>
                              setRenameAlsoRemote(checked as boolean)
                            }
                            disabled={!branchHasUpstream}
                          />
                          <Label
                            htmlFor="also-remote"
                            className={cn(
                              "cursor-pointer",
                              !branchHasUpstream && "text-muted-foreground"
                            )}
                          >
                            Also rename on remote
                          </Label>
                        </div>
                      </TooltipTrigger>
                      {!branchHasUpstream && (
                        <TooltipContent>
                          <p>This branch is not tracking a remote branch</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenamingBranch(null);
                setRenameBranchNewName("");
                setRenameAlsoRemote(false);
                setRenameBranchNameError(null);
              }}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const trimmedName = renameBranchNewName.trim();
                const error = validateBranchName(trimmedName);
                
                if (error) {
                  setRenameBranchNameError(error);
                  return;
                }

                if (renamingBranch && onRenameBranch) {
                  onRenameBranch(renamingBranch, trimmedName, renameAlsoRemote);
                  // Don't close dialog here - useEffect will close it after operation completes
                }
              }}
              disabled={!renameBranchNewName.trim() || renameBranchNewName === renamingBranch || isRenaming}
            >
              {isRenaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRenaming ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
