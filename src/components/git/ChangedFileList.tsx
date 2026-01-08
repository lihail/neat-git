import { FilePlus, FileX, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileChange {
  path: string;
  status: "added" | "deleted" | "modified";
  hasStaged: boolean;
  hasUnstaged: boolean;
}

interface ChangedFileListProps {
  files: FileChange[];
  isStaged: boolean;
  selectedFile?: string;
  selectedFileIsStaged?: boolean;
  onSelectFile: (path: string, isStaged: boolean) => void;
  onToggleStage: (path: string, shouldStage: boolean) => void;
}

const getStatusIcon = (status: FileChange["status"]) => {
  switch (status) {
    case "added":
      return <FilePlus className="h-4 w-4 flex-shrink-0 text-git-add" />;
    case "deleted":
      return <FileX className="h-4 w-4 flex-shrink-0 text-git-delete" />;
    case "modified":
      return <FileEdit className="h-4 w-4 flex-shrink-0 text-git-modify" />;
  }
};

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
            selectedFile === file.path &&
              selectedFileIsStaged === isStaged &&
              "bg-secondary"
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getStatusIcon(file.status)}
            <span className="truncate font-mono text-xs">{file.path}</span>
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
