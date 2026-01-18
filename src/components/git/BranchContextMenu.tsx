import { Copy, Download, Edit, Trash2 } from "lucide-react";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toaster";
import type { Branch } from "@/types/git";

interface BranchContextMenuProps {
  branch: Branch;
  onPull: () => void;
  onDelete: () => void;
  onRename: () => void;
}

export const BranchContextMenu = ({
  branch,
  onPull,
  onDelete,
  onRename,
}: BranchContextMenuProps) => {
  return (
    <ContextMenuContent className="max-w-64">
      {branch.hasUpstream && branch.upstream && (
        <>
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Remote branch:</span>
              <span className="font-mono">{branch.upstream}</span>
            </div>
          </div>
          <ContextMenuSeparator />
        </>
      )}
      {/* Pull option - disabled if branch has no upstream or has unpushed commits */}
      {!branch.hasUpstream ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="relative flex select-none items-center gap-3 rounded-sm px-2 py-1.5 text-sm outline-none text-muted-foreground opacity-50">
              <span className="flex-1">Pull</span>
              <Download className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Cannot pull: branch is not tracking a remote branch</p>
          </TooltipContent>
        </Tooltip>
      ) : branch.ahead !== undefined &&
        branch.ahead > 0 &&
        !branch.current ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="relative flex select-none items-center gap-3 rounded-sm px-2 py-1.5 text-sm outline-none text-muted-foreground opacity-50">
              <span className="flex-1">Pull</span>
              <Download className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Cannot pull: branch has unpushed commits.</p>
            <p>Switch to this branch first and push them.</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <ContextMenuItem
          className="gap-3 hover:bg-secondary focus:bg-secondary focus:text-foreground"
          onSelect={onPull}
        >
          <span className="flex-1">Pull</span>
          <Download className="h-4 w-4" />
        </ContextMenuItem>
      )}
      <ContextMenuItem
        className="gap-3 hover:bg-secondary focus:bg-secondary focus:text-foreground"
        onSelect={() => {
          navigator.clipboard.writeText(branch.name);
          toast.success(`Copied "${branch.name}" to clipboard`);
        }}
      >
        <span className="flex-1">Copy Branch Name</span>
        <Copy className="h-4 w-4" />
      </ContextMenuItem>
      {branch.upstream && (
        <ContextMenuItem
          className="gap-3 hover:bg-secondary focus:bg-secondary focus:text-foreground"
          onSelect={() => {
            if (branch.upstream) {
              navigator.clipboard.writeText(branch.upstream);
              toast.success(`Copied "${branch.upstream}" to clipboard`);
            }
          }}
        >
          <span className="flex-1">Copy Remote Branch Name</span>
          <Copy className="h-4 w-4" />
        </ContextMenuItem>
      )}
      <ContextMenuItem
        className="gap-3 hover:bg-secondary focus:bg-secondary focus:text-foreground"
        onSelect={onRename}
      >
        <span className="flex-1">Rename</span>
        <Edit className="h-4 w-4" />
      </ContextMenuItem>
      {branch.current ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="relative flex select-none items-center gap-3 rounded-sm px-2 py-1.5 text-sm outline-none text-muted-foreground opacity-50">
              <span className="flex-1">Delete</span>
              <Trash2 className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Cannot delete current branch.</p>
            <p>Switch to a different branch first</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <ContextMenuItem
          className="gap-3 text-destructive hover:bg-secondary focus:bg-secondary focus:text-destructive"
          onSelect={onDelete}
        >
          <span className="flex-1">Delete</span>
          <Trash2 className="h-4 w-4" />
        </ContextMenuItem>
      )}
    </ContextMenuContent>
  );
};
