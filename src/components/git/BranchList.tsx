import {
  GitBranch,
  Check,
  Plus,
  Download,
  Copy,
  Edit,
  Trash2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface Branch {
  name: string;
  current: boolean;
}

interface BranchListProps {
  branches: Branch[];
  remoteBranches?: Branch[];
  onSelectBranch: (branchName: string) => void;
  onCreateBranch?: (branchName: string) => void;
}

// TODO: this component isn't used. maybe use it in SidebarAccordion
export const BranchList = ({
  branches,
  remoteBranches = [],
  onSelectBranch,
  onCreateBranch,
}: BranchListProps) => {
const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

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
            <ContextMenuItem onSelect={() => alert('Test works!')}>
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
                    <div className="flex items-center justify-between">
                      <span className="truncate font-mono">{branch.name}</span>
                      {branch.current && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onSelect={() => console.log('Pull clicked')}>
                    <Download className="mr-2 h-4 w-4" />
                    <span>Pull</span>
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => console.log('Copy clicked')}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Copy Branch Name</span>
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => console.log('Rename clicked')}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Rename</span>
                  </ContextMenuItem>
                  <ContextMenuItem 
                    className="text-destructive focus:text-destructive"
                    onSelect={() => console.log('Delete clicked')}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </ContextMenuItem>
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
                    {branch.current && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
