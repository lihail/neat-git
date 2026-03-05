import { WrapText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, detectLanguageFromPath } from "@/lib/utils";
import { groupLinesByHunks, pairSplitLines, computeLineGroups } from "@/lib/gitDiff";
import { useMemo } from "react";
import { DiffViewerModeToggle } from "./DiffViewerModeToggle";
import { DiffSplitView } from "./DiffSplitView";
import { DiffHunkView } from "./DiffHunkView";
import { DiffFullView } from "./DiffFullView";
import { EmptyStateCard } from "../common/EmptyStateCard";
import type { DiffLine } from "@/lib/git";
import { DiffViewerMode, FileChange } from "@/types/git";

interface DiffViewerProps {
  selectedFile: FileChange;
  lines: DiffLine[];
  isStaged?: boolean;
  isLoading?: boolean;
  wordWrap?: boolean;
  onWordWrapChange: (value: boolean) => void;
  viewMode?: DiffViewerMode;
  onViewModeChange: (value: DiffViewerMode) => void;
  onViewModeChangeStart: () => void;
  onStageLines: (lineIndices: number[]) => void;
  onUnstageLines: (lineIndices: number[]) => void;
  onStageHunk: (hunkIndex: number) => void;
  onUnstageHunk: (hunkIndex: number) => void;
}

export const DiffViewer = ({
  selectedFile,
  lines,
  isStaged = false,
  isLoading = false,
  wordWrap = false,
  onWordWrapChange,
  viewMode = "full",
  onViewModeChange,
  onViewModeChangeStart,
  onStageLines,
  onUnstageLines,
  onStageHunk,
  onUnstageHunk,
}: DiffViewerProps) => {
  const { path: filePath } = selectedFile;
  const oldFilePath = isStaged ? selectedFile.stagedOldPath : selectedFile.unstagedOldPath;
  const fileStatus = isStaged ? selectedFile?.status : selectedFile?.unstagedStatus;

  const language = useMemo(() => {
    return filePath ? detectLanguageFromPath(filePath) : "text";
  }, [filePath]);

  // Force full mode only when the diff is entirely adds or deletes (no context lines),
  // e.g. a brand new file or a fully deleted file. If context lines exist, the diff
  // behaves like a normal modification and should support all view modes.
  const effectiveViewMode = useMemo(() => {
    if (
      (fileStatus === "added" || fileStatus === "deleted") &&
      !lines.some((l) => l.type === "context")
    ) {
      return "full";
    }
    return viewMode;
  }, [fileStatus, viewMode, lines]);

  const hunks = useMemo(() => {
    if (effectiveViewMode !== "hunks") {
      return null;
    }
    return groupLinesByHunks(lines);
  }, [lines, effectiveViewMode]);

  const splitLines = useMemo(() => {
    if (effectiveViewMode !== "split") {
      return null;
    }
    return pairSplitLines(lines);
  }, [lines, effectiveViewMode]);

  const lineGroupMap = useMemo(() => {
    if (fileStatus !== "modified") {
      return null;
    }
    return computeLineGroups(lines);
  }, [lines, fileStatus]);

  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Select a file to view changes</p>
      </div>
    );
  }

  const isPureRename = fileStatus === "renamed-only";
  const isEmptyFile = lines.length === 0 || lines.every((line) => line.content.trim() === "");
  const canPartiallyStage =
    !isStaged && selectedFile.hasUnstaged && selectedFile.unstagedStatus === "modified";
  const canPartiallyUnstage =
    isStaged && selectedFile.hasStaged && selectedFile.status === "modified";

  return (
    <div className="flex h-full flex-col relative">
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading diff...</p>
          </div>
        </div>
      )}

      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between gap-4">
        <p
          className="font-mono text-sm text-foreground overflow-hidden text-ellipsis whitespace-nowrap min-w-0 flex-1"
          title={oldFilePath ? `${oldFilePath} → ${filePath}` : filePath}
        >
          {oldFilePath ? (
            <>
              <span className="text-muted-foreground">{oldFilePath}</span>
              <span className="text-primary mx-2">→</span>
              <span>{filePath}</span>
            </>
          ) : (
            filePath
          )}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <DiffViewerModeToggle
            value={viewMode}
            onChange={(value) => {
              onViewModeChangeStart();
              onViewModeChange(value);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onWordWrapChange(!wordWrap)}
            className={cn(
              "h-7 gap-2 text-xs text-foreground border border-transparent",
              wordWrap && "border-primary bg-primary/10 text-primary"
            )}
          >
            <WrapText className="h-4 w-4" />
            Word Wrap
          </Button>
        </div>
      </div>
      {isPureRename ? (
        <EmptyStateCard message="File renamed or moved, no content changes" />
      ) : isEmptyFile ? (
        <EmptyStateCard message="File is empty" />
      ) : effectiveViewMode === "hunks" && hunks ? (
        <DiffHunkView
          hunks={hunks}
          lines={lines}
          language={language}
          wordWrap={wordWrap}
          lineGroupMap={lineGroupMap}
          isStaged={isStaged}
          onStageHunk={canPartiallyStage ? onStageHunk : undefined}
          onUnstageHunk={canPartiallyUnstage ? onUnstageHunk : undefined}
          onStageLines={canPartiallyStage ? onStageLines : undefined}
          onUnstageLines={canPartiallyUnstage ? onUnstageLines : undefined}
        />
      ) : effectiveViewMode === "split" && splitLines ? (
        <DiffSplitView
          splitLines={splitLines}
          language={language}
          wordWrap={wordWrap}
          lineGroupMap={lineGroupMap}
          isStaged={isStaged}
          onStageLines={canPartiallyStage ? onStageLines : undefined}
          onUnstageLines={canPartiallyUnstage ? onUnstageLines : undefined}
        />
      ) : (
        <DiffFullView
          lines={lines}
          language={language}
          wordWrap={wordWrap}
          lineGroupMap={lineGroupMap}
          isStaged={isStaged}
          onStageLines={canPartiallyStage ? onStageLines : undefined}
          onUnstageLines={canPartiallyUnstage ? onUnstageLines : undefined}
        />
      )}
    </div>
  );
};
