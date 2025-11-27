import { FileText, FilePlus, FileX, FileEdit } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileChange {
  path: string;
  status: "added" | "deleted" | "modified";
  staged: boolean;
}

interface FileStatusProps {
  files: FileChange[];
  onToggleStage: (path: string) => void;
  onSelectFile: (path: string) => void;
  selectedFile?: string;
  onStageAll?: () => void;
  onUnstageAll?: () => void;
}

export const FileStatus = ({ 
  files, 
  onToggleStage, 
  onSelectFile, 
  selectedFile,
  onStageAll,
  onUnstageAll 
}: FileStatusProps) => {
  const stagedFiles = files.filter((f) => f.staged);
  const unstagedFiles = files.filter((f) => !f.staged);

  const getStatusIcon = (status: FileChange["status"]) => {
    switch (status) {
      case "added":
        return <FilePlus className="h-4 w-4 text-git-add" />;
      case "deleted":
        return <FileX className="h-4 w-4 text-git-delete" />;
      case "modified":
        return <FileEdit className="h-4 w-4 text-git-modify" />;
    }
  };

  const renderFileList = (fileList: FileChange[]) => (
    <div className="space-y-1">
      {fileList.map((file) => (
        <div
          key={file.path}
          onClick={() => onSelectFile(file.path)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary group cursor-pointer",
            selectedFile === file.path && "bg-secondary"
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getStatusIcon(file.status)}
            <span className="truncate font-mono text-xs">{file.path}</span>
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStage(file.path);
            }}
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
            )}
          >
            {file.staged ? "Unstage" : "Stage"}
          </Button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          Changed Files
        </h2>
      </div>
      
      {files.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          No changes detected
        </div>
      ) : (
        <>
          {/* Unstaged Changes */}
          <div className="flex flex-1 flex-col min-h-0 border-b border-border">
            <div className="border-b border-border px-4 py-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Unstaged Changes ({unstagedFiles.length})
              </h3>
              {onStageAll && unstagedFiles.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onStageAll}
                  className="h-6 px-2 text-xs"
                  title="Stage all changes"
                >
                  Stage All
                </Button>
              )}
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2">
                {unstagedFiles.length > 0 ? (
                  renderFileList(unstagedFiles)
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No unstaged changes
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Staged Changes */}
          <div className="flex flex-1 flex-col min-h-0">
            <div className="border-b border-border px-4 py-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Staged Changes ({stagedFiles.length})
              </h3>
              {onUnstageAll && stagedFiles.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUnstageAll}
                  className="h-6 px-2 text-xs"
                  title="Unstage all changes"
                >
                  Unstage All
                </Button>
              )}
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2">
                {stagedFiles.length > 0 ? (
                  renderFileList(stagedFiles)
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No staged changes
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
};
