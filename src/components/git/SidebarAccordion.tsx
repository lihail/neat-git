import {
  GitBranch,
  GitCommit,
  Plus,
  Trash2,
  Archive,
  Upload,
  Loader2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BranchList } from "./BranchList";

interface Branch {
  name: string;
  current: boolean;
  behind?: number;
  ahead?: number;
  hasUpstream?: boolean;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface Stash {
  index: number;
  message: string;
  date: string;
}

interface SidebarAccordionProps {
  branches: Branch[];
  remoteBranches?: Branch[];
  commits: Commit[];
  stashes?: Stash[];
  selectedCommit?: string;
  onSelectBranch: (branchName: string) => void;
  onSelectCommit: (sha: string) => void;
  onCreateBranch?: (branchName: string) => void;
  onDeleteBranch?: (branchName: string) => void;
  onRenameBranch?: (
    oldName: string,
    newName: string,
    alsoRenameRemote: boolean
  ) => void;
  onPullBranch?: (branchName: string) => void;
  onPopStash?: (index: number) => void;
  onDeleteStash?: (index: number) => void;
  isRenaming?: boolean;
}

export const SidebarAccordion = ({
  branches,
  remoteBranches = [],
  commits,
  stashes = [],
  selectedCommit,
  onSelectBranch,
  onSelectCommit,
  onCreateBranch,
  onDeleteBranch,
  onRenameBranch,
  onPullBranch,
  onPopStash,
  onDeleteStash,
  isRenaming = false,
}: SidebarAccordionProps) => {
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [branchNameError, setBranchNameError] = useState<string | null>(null);
  const [hoveredStash, setHoveredStash] = useState<number | null>(null);
  const [deletingStash, setDeletingStash] = useState<number | null>(null);
  const [renamingBranch, setRenamingBranch] = useState<string | null>(null);
  const [renameBranchNewName, setRenameBranchNewName] = useState("");
  const [renameAlsoRemote, setRenameAlsoRemote] = useState(false);
  const [renameBranchNameError, setRenameBranchNameError] = useState<
    string | null
  >(null);
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
    const trimmedName = newBranchName.trim();
    const error = validateBranchName(trimmedName);

    if (error) {
      setBranchNameError(error);
      return;
    }

    if (onCreateBranch) {
      onCreateBranch(trimmedName);
      setNewBranchName("");
      setIsCreatingBranch(false);
      setBranchNameError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateBranch();
    } else if (e.key === "Escape") {
      setNewBranchName("");
      setIsCreatingBranch(false);
      setBranchNameError(null);
    }
  };

  const handleBranchNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewBranchName(value);
    // Clear error when user starts typing
    if (branchNameError) {
      setBranchNameError(null);
    }
  };
  const defaultOpenSections = ["local-branches"];
  if (remoteBranches.length > 0) defaultOpenSections.push("remote-branches");
  if (stashes.length > 0) defaultOpenSections.push("stashed-changes");
  if (commits.length > 0) defaultOpenSections.push("commit-history");

  return (
    <div className="flex h-full flex-col border-r border-border">
      <Accordion
        type="multiple"
        defaultValue={defaultOpenSections}
        key={`accordion-${commits.length}-${stashes.length}`}
        className="flex h-full flex-col overflow-hidden"
      >
        {/* Local Branches */}
        <AccordionItem
          value="local-branches"
          className="border-b border-border"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline border-b border-border">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <GitBranch className="h-4 w-4 text-primary" />
              Local Branches
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            {onCreateBranch && (
              <div className="px-4 py-2">
                {isCreatingBranch ? (
                  <div className="space-y-1">
                    <Input
                      autoFocus
                      placeholder="Branch name..."
                      value={newBranchName}
                      onChange={handleBranchNameChange}
                      onKeyDown={handleKeyDown}
                      onBlur={() => {
                        if (!newBranchName.trim()) {
                          setIsCreatingBranch(false);
                          setBranchNameError(null);
                        }
                      }}
                      className={cn(
                        "h-8 text-xs",
                        branchNameError &&
                          "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {branchNameError && (
                      <p className="text-xs text-destructive">
                        {branchNameError}
                      </p>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => setIsCreatingBranch(true)}
                  >
                    <Plus className="h-4 w-4" />
                    New Branch
                  </Button>
                )}
              </div>
            )}
            <BranchList
              branches={branches}
              onSelectBranch={onSelectBranch}
              onDeleteBranch={onDeleteBranch}
              onPullBranch={onPullBranch}
              onRenameClick={(branchName) => {
                setRenamingBranch(branchName);
                setRenameBranchNewName(branchName);
                setRenameAlsoRemote(false);
              }}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Remote Branches */}
        <AccordionItem
          value="remote-branches"
          className="border-b border-border"
        >
          <AccordionTrigger
            className={cn(
              "px-4 py-3 hover:no-underline border-b border-border",
              remoteBranches.length === 0 && "opacity-50 cursor-not-allowed"
            )}
            disabled={remoteBranches.length === 0}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <GitBranch className="h-4 w-4 text-primary" />
              Remote Branches
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <ScrollArea className="h-64">
              <div className="p-2 space-y-1">
                {remoteBranches.map((branch) => (
                  <button
                    key={branch.name}
                    onDoubleClick={() => onSelectBranch(branch.name)}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary overflow-hidden",
                      branch.current && "bg-secondary text-primary"
                    )}
                  >
                    <div className="flex items-center gap-2 w-full max-w-full">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="truncate font-mono text-sm">
                          {branch.name}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>

        {/* Stashed Changes */}
        <AccordionItem
          value="stashed-changes"
          className="border-b border-border"
        >
          <AccordionTrigger
            className={cn(
              "px-4 py-3 hover:no-underline border-b border-border",
              stashes.length === 0 && "opacity-50 cursor-not-allowed"
            )}
            disabled={stashes.length === 0}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Archive className="h-4 w-4 text-primary" />
              Stashed Changes
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <ScrollArea className="h-64">
              <div className="p-2 space-y-1">
                {stashes.map((stash) => (
                  <div
                    key={stash.index}
                    onMouseEnter={() => setHoveredStash(stash.index)}
                    onMouseLeave={() => setHoveredStash(null)}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-sm transition-colors relative overflow-hidden",
                      deletingStash !== stash.index && "hover:bg-secondary"
                    )}
                  >
                    {deletingStash === stash.index ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          Delete stash@{"{" + stash.index + "}"}?
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              if (onDeleteStash) {
                                onDeleteStash(stash.index);
                              }
                              setDeletingStash(null);
                            }}
                          >
                            Delete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => setDeletingStash(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        <div className="flex-1 space-y-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {stash.message}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">
                              stash@{"{" + stash.index + "}"}
                            </span>
                            <span>{stash.date}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {onPopStash && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onPopStash(stash.index);
                              }}
                              className={cn(
                                "hover:bg-primary/20 rounded p-1 transition-all",
                                hoveredStash === stash.index
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                              title="Pop stash"
                            >
                              <Upload className="h-4 w-4 text-primary" />
                            </button>
                          )}
                          {onDeleteStash && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingStash(stash.index);
                              }}
                              className={cn(
                                "hover:bg-destructive/20 rounded p-1 transition-all",
                                hoveredStash === stash.index
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                              title="Delete stash"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>

        {/* Commit History */}
        <AccordionItem
          value="commit-history"
          className="flex-1 border-b-0 min-h-0"
        >
          <AccordionTrigger
            className={cn(
              "px-4 py-3 hover:no-underline border-b border-border",
              commits.length === 0 && "opacity-50 cursor-not-allowed"
            )}
            disabled={commits.length === 0}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <GitCommit className="h-4 w-4 text-primary" />
              Commit History
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0 data-[state=open]:overflow-hidden">
            <ScrollArea className="h-[500px] w-full">
              <div className="p-2">
                {commits.map((commit) => (
                  <button
                    key={commit.sha}
                    onClick={() => onSelectCommit(commit.sha)}
                    className={cn(
                      "w-full rounded-md p-3 text-left transition-colors hover:bg-secondary",
                      selectedCommit === commit.sha && "bg-secondary"
                    )}
                  >
                    <div className="mb-2 flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {commit.message}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{commit.author}</span>
                          <span>{commit.date}</span>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">
                          {commit.sha.slice(0, 7)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Rename Branch Dialog */}
      <Dialog
        open={renamingBranch !== null}
        onOpenChange={(open) => {
          if (!open && !isRenaming) {
            setRenamingBranch(null);
            setRenameBranchNewName("");
            setRenameAlsoRemote(false);
            setRenameBranchNameError(null);
          }
        }}
      >
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
              const branchHasUpstream =
                branches.find((b) => b.name === renamingBranch)?.hasUpstream ??
                false;
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
              disabled={
                !renameBranchNewName.trim() ||
                renameBranchNewName === renamingBranch ||
                isRenaming
              }
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
