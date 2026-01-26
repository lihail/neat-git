import { FilePlus, FileX, FileEdit, FileInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FileChange } from "@/types/git";

interface ChangedFileListProps {
  files: FileChange[];
  isStaged: boolean;
  selectedFile?: string;
  selectedFileIsStaged?: boolean;
  onSelectFile: (path: string, isStaged: boolean) => void;
  onToggleStage: (path: string, shouldStage: boolean) => void;
}

const getStatusIcon = (file: FileChange, isStaged: boolean) => {
  // Use unstagedStatus for unstaged section if available, otherwise fall back to status
  const effectiveStatus = !isStaged && file.unstagedStatus ? file.unstagedStatus : file.status;

  // Show as rename only in staged section (renames are always staged)
  const showAsRename = file.oldPath && isStaged;

  if (effectiveStatus === "modified") {
    return <FileEdit className="h-4 w-4 flex-shrink-0 text-git-modify" />;
  }
  if (effectiveStatus === "deleted") {
    return <FileX className="h-4 w-4 flex-shrink-0 text-git-delete" />;
  }
  if (showAsRename) {
    return <FileInput className="h-4 w-4 flex-shrink-0 text-git-rename" />;
  }
  return <FilePlus className="h-4 w-4 flex-shrink-0 text-git-add" />;
};

const getFileName = (path: string) => path.split("/").pop() || path;

export const ChangedFileList = ({
  files,
  isStaged,
  selectedFile,
  selectedFileIsStaged,
  onSelectFile,
  onToggleStage,
}: ChangedFileListProps) => {
  return (
    <div className="space-y-1">
      {files.map((file) => (
        <div
          key={`${file.path}-${isStaged ? "staged" : "unstaged"}`}
          onClick={() => onSelectFile(file.path, isStaged)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary group cursor-pointer",
            selectedFile === file.path && selectedFileIsStaged === isStaged && "bg-secondary"
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getStatusIcon(file, isStaged)}
            {/* Show rename format only in staged section (renames are always staged) */}
            {file.oldPath && isStaged ? (
              <span className="truncate font-mono text-xs">
                <span className="text-muted-foreground">{getFileName(file.oldPath)}</span>
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
        </div>
      ))}
    </div>
  );
};
