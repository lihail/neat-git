import { useState } from "react";
import { ArrowDown, ArrowUp, Laptop, Cloud } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BranchContextMenu } from "./BranchContextMenu";
import type { Branch } from "@/types/git";

interface BranchListProps {
  branches: Branch[];
  onSelectBranch: (branchName: string) => void;
  onDeleteBranch: (branchName: string) => void;
  onPullBranch: (branchName: string) => void;
  onRenameClick: (branchName: string) => void;
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
                onDoubleClick={() => deletingBranch !== branch.name && onSelectBranch(branch.name)}
              >
                {deletingBranch === branch.name ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Delete {branch.name}?</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          onDeleteBranch(branch.name);
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
                    {branch.hasUpstream ? (
                      <Cloud className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    ) : (
                      <Laptop className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="truncate font-mono text-sm">{branch.name}</div>
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
            <BranchContextMenu
              branch={branch}
              onPull={() => onPullBranch(branch.name)}
              onDelete={() => setDeletingBranch(branch.name)}
              onRename={() => onRenameClick(branch.name)}
            />
          </ContextMenu>
        ))}
      </div>
    </ScrollArea>
  );
};
