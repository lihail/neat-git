import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Download, Edit, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

interface Branch {
  name: string;
  current: boolean;
  behind?: number;
  ahead?: number;
  hasUpstream?: boolean;
}

interface BranchListProps {
  branches: Branch[];
  onSelectBranch: (branchName: string) => void;
  onDeleteBranch?: (branchName: string) => void;
  onPullBranch?: (branchName: string) => void;
  onRenameClick?: (branchName: string) => void;
}

export const BranchList = ({
  branches,
  onSelectBranch,
  onDeleteBranch,
  onPullBranch,
  onRenameClick,
}: BranchListProps) => {
  const [deletingBranch, setDeletingBranch] = useState<string | null>(null);

  return (
    <ScrollArea className="h-64">
      <div className="p-2 space-y-1">
        {branches.map((branch) => (
          <ContextMenu key={branch.name}>
            <ContextMenuTrigger asChild>
              <div
                className={cn(
                  "w-full rounded-md px-3 py-2 text-sm transition-colors relative overflow-hidden",
                  branch.current && "bg-secondary text-primary",
                  !branch.current &&
                    deletingBranch !== branch.name &&
                    "hover:bg-secondary cursor-pointer"
                )}
                onDoubleClick={() =>
                  deletingBranch !== branch.name && onSelectBranch(branch.name)
                }
              >
                {deletingBranch === branch.name ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      Delete {branch.name}?
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          if (onDeleteBranch) {
                            onDeleteBranch(branch.name);
                          }
                          setDeletingBranch(null);
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => setDeletingBranch(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 w-full max-w-full">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="truncate font-mono text-sm">
                        {branch.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {branch.behind !== undefined && branch.behind > 0 && (
                        <div className="flex items-center gap-0 text-xs text-muted-foreground">
                          <span>{branch.behind}</span>
                          <ArrowDown className="h-3 w-3" />
                        </div>
                      )}
                      {branch.ahead !== undefined && branch.ahead > 0 && (
                        <div className="flex items-center gap-0 text-xs text-muted-foreground">
                          <span>{branch.ahead}</span>
                          <ArrowUp className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              {/* Pull option - disabled if branch has no upstream or has unpushed commits */}
              {!branch.hasUpstream ? (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-muted-foreground opacity-50">
                        <span className="flex-1">Pull</span>
                        <Download className="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Cannot pull: branch is not tracking a remote branch</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : branch.ahead !== undefined &&
                branch.ahead > 0 &&
                !branch.current ? (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-muted-foreground opacity-50">
                        <span className="flex-1">Pull</span>
                        <Download className="h-4 w-4" />
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
                  className="hover:bg-secondary focus:bg-secondary focus:text-foreground"
                  onSelect={() => {
                    if (onPullBranch) {
                      onPullBranch(branch.name);
                    }
                  }}
                >
                  <span className="flex-1">Pull</span>
                  <Download className="h-4 w-4" />
                </ContextMenuItem>
              )}
              <ContextMenuItem
                className="hover:bg-secondary focus:bg-secondary focus:text-foreground"
                onSelect={() => {
                  navigator.clipboard.writeText(branch.name);
                  toast.success(`Copied "${branch.name}" to clipboard`);
                }}
              >
                <span className="flex-1">Copy Branch Name</span>
                <Copy className="h-4 w-4" />
              </ContextMenuItem>
              <ContextMenuItem
                className="hover:bg-secondary focus:bg-secondary focus:text-foreground"
                onSelect={() => {
                  if (onRenameClick) {
                    onRenameClick(branch.name);
                  }
                }}
              >
                <span className="flex-1">Rename</span>
                <Edit className="h-4 w-4" />
              </ContextMenuItem>
              {branch.current ? (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-muted-foreground opacity-50">
                        <span className="flex-1">Delete</span>
                        <Trash2 className="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Cannot delete current branch.</p>
                      <p>Switch to a different branch first</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <ContextMenuItem
                  className="text-destructive hover:bg-secondary focus:bg-secondary focus:text-destructive"
                  onSelect={() => {
                    if (onDeleteBranch) {
                      setDeletingBranch(branch.name);
                    }
                  }}
                >
                  <span className="flex-1">Delete</span>
                  <Trash2 className="h-4 w-4" />
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>
    </ScrollArea>
  );
};
