import { useState, useEffect } from "react";
import { FilePlus, FileX, FileEdit, FileInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import type { FileChange } from "@/types/git";
import { FileChangeContextMenu } from "./FileChangeContextMenu";

interface ChangedFileListProps {
  files: FileChange[];
  isStaged: boolean;
  repoPath: string;
  selectedFile?: string;
  isSelectedFileChangeStaged?: boolean;
  onSelectFile: (path: string, isStaged: boolean) => void;
  onToggleStage: (path: string, shouldStage: boolean) => void;
  onDiscardChanges: (path: string, oldPath?: string) => void;
}

const getStatusIcon = (file: FileChange, isStaged: boolean) => {
  const effectiveStatus = !isStaged && file.unstagedStatus ? file.unstagedStatus : file.status;

  if (effectiveStatus === "modified" || effectiveStatus === "renamed-modified") {
    return <FileEdit className="h-4 w-4 flex-shrink-0 text-git-modify" />;
  }
  if (effectiveStatus === "deleted") {
    return <FileX className="h-4 w-4 flex-shrink-0 text-git-delete" />;
  }
  if (effectiveStatus === "renamed-only") {
    return <FileInput className="h-4 w-4 flex-shrink-0 text-git-rename" />;
  }
  return <FilePlus className="h-4 w-4 flex-shrink-0 text-git-add" />;
};

const getFileName = (path: string) => {
  if (!path) {
    return "";
  }
  if (path.includes("/")) {
    return path.split("/").pop();
  }
  return path;
};

export const ChangedFileList = ({
  files,
  isStaged,
  repoPath,
  selectedFile,
  isSelectedFileChangeStaged,
  onSelectFile,
  onToggleStage,
  onDiscardChanges,
}: ChangedFileListProps) => {
  const [discardingFile, setDiscardingFile] = useState<string | null>(null);

  // Reset discard confirmation if the file is no longer in the list (e.g. staged)
  useEffect(() => {
    if (discardingFile && !files.some((file) => file.path === discardingFile)) {
      setDiscardingFile(null);
    }
  }, [files, discardingFile]);

  const getIsUntracked = (file: FileChange) =>
    file.status === "added" && !isStaged && !file.hasStaged;

  return (
    <div className="space-y-1">
      {files.map((file) => (
        <ContextMenu key={`${file.path}-${isStaged ? "staged" : "unstaged"}`}>
          <ContextMenuTrigger asChild disabled={discardingFile === file.path}>
            <div
              onClick={() => discardingFile !== file.path && onSelectFile(file.path, isStaged)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                discardingFile !== file.path && "hover:bg-secondary group cursor-pointer",
                selectedFile === file.path &&
                  isSelectedFileChangeStaged === isStaged &&
                  "bg-secondary"
              )}
            >
              {discardingFile === file.path ? (
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-xs text-muted-foreground truncate">
                    {getIsUntracked(file) ? "Delete" : "Discard"} {getFileName(file.path)}?
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        onDiscardChanges(file.path, file.unstagedOldPath);
                        setDiscardingFile(null);
                      }}
                    >
                      {getIsUntracked(file) ? "Delete" : "Discard"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => setDiscardingFile(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(file, isStaged)}
                    {(!isStaged && file.unstagedOldPath) || (isStaged && file.stagedOldPath) ? (
                      <span className="truncate font-mono text-xs">
                        <span className="text-muted-foreground">
                          {getFileName(isStaged ? file.stagedOldPath : file.unstagedOldPath)}
                        </span>
                        <span className="text-primary mx-1">→</span>
                        <span>{getFileName(file.path)}</span>
                      </span>
                    ) : (
                      <span className="truncate font-mono text-xs">{file.path}</span>
                    )}
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStage(file.path, !isStaged);
                    }}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-2 text-xs transition-all opacity-0 group-hover:opacity-100 max-w-0 overflow-hidden group-hover:max-w-[100px] flex-shrink-0"
                    )}
                  >
                    {isStaged ? "Unstage" : "Stage"}
                  </Button>
                </>
              )}
            </div>
          </ContextMenuTrigger>
          <FileChangeContextMenu
            change={file}
            isStaged={isStaged}
            repoPath={repoPath}
            onToggleStage={onToggleStage}
            onDiscard={() => setDiscardingFile(file.path)}
          />
        </ContextMenu>
      ))}
    </div>
  );
};
