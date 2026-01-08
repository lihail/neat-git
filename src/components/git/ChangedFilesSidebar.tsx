import { FileText } from "lucide-react";
import { ChangesFilesSection, FileChange } from "./ChangesFilesSection";

interface ChangedFilesSidebarProps {
  files: FileChange[];
  onToggleStage: (path: string, shouldStage: boolean) => void;
  onSelectFile: (path: string, isStaged: boolean) => void;
  selectedFile?: string;
  selectedFileIsStaged?: boolean;
  onStageAll?: () => void;
  onUnstageAll?: () => void;
}

export const ChangedFilesSidebar = ({
  files,
  onToggleStage,
  onSelectFile,
  selectedFile,
  selectedFileIsStaged,
  onStageAll,
  onUnstageAll,
}: ChangedFilesSidebarProps) => {
  const stagedFiles = files.filter((f) => f.hasStaged);
  const unstagedFiles = files.filter((f) => f.hasUnstaged);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
          Changed Files
        </h2>
      </div>

      <ChangesFilesSection
        files={unstagedFiles}
        isStaged={false}
        selectedFile={selectedFile}
        selectedFileIsStaged={selectedFileIsStaged}
        onAction={onStageAll}
        onSelectFile={onSelectFile}
        onToggleStage={onToggleStage}
      />

      <ChangesFilesSection
        files={stagedFiles}
        isStaged={true}
        selectedFile={selectedFile}
        selectedFileIsStaged={selectedFileIsStaged}
        onAction={onUnstageAll}
        onSelectFile={onSelectFile}
        onToggleStage={onToggleStage}
      />
    </div>
  );
};
