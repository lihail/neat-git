import { Plus, Minus, Undo2, Trash2, ExternalLink, FolderOpen, Copy } from "lucide-react";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { toast } from "@/components/ui/toaster";
import type { FileChange } from "@/types/git";
import { showFileInFileExplorer, openFileInExternalEditor } from "@/lib/system";

interface FileChangeContextMenuProps {
  change: FileChange;
  isStaged: boolean;
  repoPath: string;
  onToggleStage: (path: string, shouldStage: boolean) => void;
  onDiscard: () => void;
}

export const FileChangeContextMenu = ({
  change,
  isStaged,
  repoPath,
  onToggleStage,
  onDiscard,
}: FileChangeContextMenuProps) => {
  const isUntracked = change.status === "added" && !isStaged && !change.hasStaged;
  const isDeleted = isStaged
    ? change.status === "deleted"
    : (change.unstagedStatus ?? change.status) === "deleted";

  const handleStageToggle = () => {
    onToggleStage(change.path, !isStaged);
  };

  const handleOpenInExternalEditor = () => {
    openFileInExternalEditor(repoPath, change.path);
  };

  const handleShowInFileExplorer = () => {
    showFileInFileExplorer(repoPath, change.path);
  };

  const handleCopyFilePath = () => {
    navigator.clipboard.writeText(change.path);
    toast.success(`Copied "${change.path}" to clipboard`);
  };

  return (
    <ContextMenuContent className="max-w-64">
      <ContextMenuItem
        className="gap-3 hover:bg-secondary focus:bg-secondary focus:text-foreground"
        onSelect={handleStageToggle}
      >
        <span className="flex-1">{isStaged ? "Unstage" : "Stage"}</span>
        {isStaged ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </ContextMenuItem>

      {!isStaged && (
        <>
          <ContextMenuSeparator />

          <ContextMenuItem
            className="gap-3 text-destructive hover:bg-secondary focus:bg-secondary focus:text-destructive"
            onSelect={onDiscard}
          >
            <span className="flex-1">{isUntracked ? "Delete File" : "Discard Changes"}</span>
            {isUntracked ? <Trash2 className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
          </ContextMenuItem>
        </>
      )}

      {!isDeleted && (
        <>
          <ContextMenuSeparator />

          <ContextMenuItem
            className="gap-3 hover:bg-secondary focus:bg-secondary focus:text-foreground"
            onSelect={handleOpenInExternalEditor}
          >
            <span className="flex-1">Open in External Editor</span>
            <ExternalLink className="h-4 w-4" />
          </ContextMenuItem>

          <ContextMenuItem
            className="gap-3 hover:bg-secondary focus:bg-secondary focus:text-foreground"
            onSelect={handleShowInFileExplorer}
          >
            <span className="flex-1">Show in File Explorer</span>
            <FolderOpen className="h-4 w-4" />
          </ContextMenuItem>
        </>
      )}

      <ContextMenuSeparator />

      <ContextMenuItem
        className="gap-3 hover:bg-secondary focus:bg-secondary focus:text-foreground"
        onSelect={handleCopyFilePath}
      >
        <span className="flex-1">Copy Relative File Path</span>
        <Copy className="h-4 w-4" />
      </ContextMenuItem>
    </ContextMenuContent>
  );
};
