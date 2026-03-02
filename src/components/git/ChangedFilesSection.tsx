import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChangedFileList } from "./ChangedFileList";
import { MouseEventHandler } from "react";
import { FileChange } from "@/types/git";

interface ChangedFilesSectionProps {
  files: FileChange[];
  isStaged: boolean;
  repoPath: string;
  selectedFile?: string;
  isSelectedFileChangeStaged?: boolean;
  onAction: MouseEventHandler<HTMLButtonElement>;
  onSelectFile: (path: string, isStaged: boolean) => void;
  onToggleStage: (path: string, shouldStage: boolean) => void;
  onDiscardChanges: (path: string, oldPath?: string) => void;
}

export const ChangedFilesSection = ({
  files,
  isStaged,
  repoPath,
  selectedFile,
  isSelectedFileChangeStaged,
  onAction,
  onSelectFile,
  onToggleStage,
  onDiscardChanges,
}: ChangedFilesSectionProps) => {
  return (
    <div className={`flex flex-1 flex-col min-h-0${isStaged ? "" : " border-b border-border"}`}>
      <div className="border-b border-border px-4 py-2 flex items-center justify-between bg-secondary/40">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">
          {isStaged ? "Staged Changes" : "Unstaged Changes"} ({files.length})
        </h3>
        {files.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAction}
            className="h-6 px-2 text-xs"
            title={isStaged ? "Unstage all changes" : "Stage all changes"}
          >
            {isStaged ? "Unstage All" : "Stage All"}
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {files.length > 0 ? (
            <ChangedFileList
              files={files}
              isStaged={isStaged}
              repoPath={repoPath}
              selectedFile={selectedFile}
              isSelectedFileChangeStaged={isSelectedFileChangeStaged}
              onSelectFile={onSelectFile}
              onToggleStage={onToggleStage}
              onDiscardChanges={onDiscardChanges}
            />
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground">
              {isStaged ? "No staged changes" : "No unstaged changes"}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
