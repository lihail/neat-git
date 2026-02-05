import { WrapText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, detectLanguageFromPath } from "@/lib/utils";
import { groupLinesByHunks, pairSplitLines } from "@/lib/gitDiff";
import { useMemo } from "react";
import { DiffViewerModeToggle, type DiffViewerMode } from "./DiffViewerModeToggle";
import { DiffSplitView } from "./DiffSplitView";
import { DiffHunkView } from "./DiffHunkView";
import { DiffFullView } from "./DiffFullView";
import { DiffViewerEmptyState } from "./DiffViewerEmptyState";
import type { DiffLine } from "@/lib/git";

interface DiffViewerProps {
  filePath?: string;
  oldFilePath?: string;
  lines: DiffLine[];
  fileStatus?: "modified" | "added" | "deleted";
  isLoading?: boolean;
  wordWrap?: boolean;
  onWordWrapChange: (value: boolean) => void;
  viewMode?: DiffViewerMode;
  onViewModeChange: (value: DiffViewerMode) => void;
  onViewModeChangeStart: () => void;
}

export const DiffViewer = ({
  filePath,
  oldFilePath,
  lines,
  fileStatus,
  isLoading = false,
  wordWrap = false,
  onWordWrapChange,
  viewMode = "full",
  onViewModeChange,
  onViewModeChangeStart,
}: DiffViewerProps) => {
  const language = useMemo(() => {
    return filePath ? detectLanguageFromPath(filePath) : "text";
  }, [filePath]);

  // Force full mode only when the diff is entirely adds or deletes (no context lines),
  // e.g. a brand new file or a fully deleted file. If context lines exist, the diff
  // behaves like a normal modification and should support all view modes
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

  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Select a file to view changes</p>
      </div>
    );
  }

  const isEmptyFile = lines.length === 0 || lines.every((line) => line.content.trim() === "");

  const isPureRename = oldFilePath && fileStatus === "added";

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
              "h-7 gap-2 text-xs text-foreground",
              wordWrap && "bg-accent text-accent-foreground"
            )}
          >
            <WrapText className="h-4 w-4" />
            Word Wrap
          </Button>
        </div>
      </div>
      {isPureRename ? (
        <DiffViewerEmptyState message="File renamed or moved, no content changes" />
      ) : isEmptyFile ? (
        <DiffViewerEmptyState message="File is empty" />
      ) : effectiveViewMode === "hunks" && hunks ? (
        <DiffHunkView hunks={hunks} language={language} wordWrap={wordWrap} />
      ) : effectiveViewMode === "split" && splitLines ? (
        <DiffSplitView splitLines={splitLines} language={language} wordWrap={wordWrap} />
      ) : (
        <DiffFullView lines={lines} language={language} wordWrap={wordWrap} />
      )}
    </div>
  );
};
