import { FileText } from "lucide-react";
import { ChangesFilesSection, FileChange } from "./ChangesFilesSection";

interface ChangedFilesSidebarProps {
  files: FileChange[];
  repoPath: string;
  onToggleStage: (path: string, shouldStage: boolean) => void;
  onSelectFile: (path: string, isStaged: boolean) => void;
  selectedFile?: string;
  selectedFileIsStaged?: boolean;
  onStageAll: () => void;
  onUnstageAll: () => void;
  onDiscardChanges: (path: string) => void;
}

export const ChangedFilesSidebar = ({
  files,
  repoPath,
  onToggleStage,
  onSelectFile,
  selectedFile,
  selectedFileIsStaged,
  onStageAll,
  onUnstageAll,
  onDiscardChanges,
}: ChangedFilesSidebarProps) => {
  const stagedFiles = files.filter((f) => f.hasStaged).sort((a, b) => a.path.localeCompare(b.path));
  const unstagedFiles = files
    .filter((f) => f.hasUnstaged)
    .sort((a, b) => a.path.localeCompare(b.path));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4 bg-secondary/40">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
          Changed Files
        </h2>
      </div>

      <ChangesFilesSection
        files={unstagedFiles}
        isStaged={false}
        repoPath={repoPath}
        selectedFile={selectedFile}
        selectedFileIsStaged={selectedFileIsStaged}
        onAction={onStageAll}
        onSelectFile={onSelectFile}
        onToggleStage={onToggleStage}
        onDiscardChanges={onDiscardChanges}
      />

      <ChangesFilesSection
        files={stagedFiles}
        isStaged={true}
        repoPath={repoPath}
        selectedFile={selectedFile}
        selectedFileIsStaged={selectedFileIsStaged}
        onAction={onUnstageAll}
        onSelectFile={onSelectFile}
        onToggleStage={onToggleStage}
        onDiscardChanges={onDiscardChanges}
      />
    </div>
  );
};
