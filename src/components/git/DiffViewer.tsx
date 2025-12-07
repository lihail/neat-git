import { WrapText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, detectLanguageFromPath } from "@/lib/utils";
import { useMemo } from "react";
import {
  DiffViewerModeToggle,
  type DiffViewerMode,
} from "./DiffViewerModeToggle";
import { DiffSplitView } from "./DiffSplitView";
import { DiffHunkView } from "./DiffHunkView";
import { DiffFullView } from "./DiffFullView";
import { DiffEmptyState } from "./DiffEmptyState";

interface DiffLine {
  type: "add" | "delete" | "context";
  content: string;
  lineNumber?: number;
  hunkIndex?: number;
  hunkHeader?: string;
}

interface DiffViewerProps {
  filePath?: string;
  lines: DiffLine[];
  fileStatus?: "modified" | "added" | "deleted";
  isLoading?: boolean;
  wordWrap?: boolean;
  onWordWrapChange?: (value: boolean) => void;
  viewMode?: DiffViewerMode;
  onViewModeChange?: (value: DiffViewerMode) => void;
  onViewModeChangeStart?: () => void;
}

export const DiffViewer = ({
  filePath,
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

  // For new and deleted files, always show in full mode regardless of user's selected mode
  const effectiveViewMode = useMemo(() => {
    if (fileStatus === "added" || fileStatus === "deleted") {
      return "full";
    }
    return viewMode;
  }, [fileStatus, viewMode]);

  // Group lines by hunks for hunks view
  const groupedByHunks = useMemo(() => {
    if (effectiveViewMode !== "hunks" || lines.length === 0) return null;

    const hunks: Array<{
      index: number;
      header: string;
      lines: DiffLine[];
      startLine: number;
      endLine: number;
    }> = [];

    lines.forEach((line) => {
      const hunkIndex = line.hunkIndex ?? 0;
      if (!hunks[hunkIndex]) {
        hunks[hunkIndex] = {
          index: hunkIndex,
          header: line.hunkHeader || "",
          lines: [],
          startLine: line.lineNumber || 0,
          endLine: line.lineNumber || 0,
        };
      }
      hunks[hunkIndex].lines.push(line);
      if (line.lineNumber) {
        hunks[hunkIndex].endLine = Math.max(
          hunks[hunkIndex].endLine,
          line.lineNumber
        );
      }
    });

    return hunks.filter((h) => h); // Remove any undefined entries
  }, [lines, effectiveViewMode]);

  // Prepare split view data - convert unified diff to side-by-side
  const splitViewData = useMemo(() => {
    if (effectiveViewMode !== "split" || lines.length === 0) return null;

    interface SplitLine {
      leftLine?: {
        content: string;
        lineNumber?: number;
        type: "delete" | "context";
      };
      rightLine?: {
        content: string;
        lineNumber?: number;
        type: "add" | "context";
      };
    }

    const splitLines: SplitLine[] = [];
    let leftLineNumber = 0;
    let rightLineNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.type === "context") {
        // Context appears on both sides
        leftLineNumber++;
        rightLineNumber++;
        splitLines.push({
          leftLine: {
            content: line.content,
            lineNumber: leftLineNumber,
            type: "context",
          },
          rightLine: {
            content: line.content,
            lineNumber: rightLineNumber,
            type: "context",
          },
        });
      } else if (line.type === "delete") {
        // Collect all consecutive delete lines
        const deleteLines: typeof lines = [];
        let j = i;
        while (j < lines.length && lines[j].type === "delete") {
          deleteLines.push(lines[j]);
          j++;
        }

        // Collect all consecutive add lines that follow
        const addLines: typeof lines = [];
        while (j < lines.length && lines[j].type === "add") {
          addLines.push(lines[j]);
          j++;
        }

        // Pair up deletes and adds side by side
        const maxLines = Math.max(deleteLines.length, addLines.length);
        for (let k = 0; k < maxLines; k++) {
          const deleteLine = deleteLines[k];
          const addLine = addLines[k];

          splitLines.push({
            leftLine: deleteLine
              ? {
                  content: deleteLine.content,
                  lineNumber: ++leftLineNumber,
                  type: "delete",
                }
              : undefined,
            rightLine: addLine
              ? {
                  content: addLine.content,
                  lineNumber: ++rightLineNumber,
                  type: "add",
                }
              : undefined,
          });
        }

        // Move index forward (minus 1 because the loop will increment)
        i = j - 1;
      } else if (line.type === "add") {
        // Standalone add line (not preceded by deletes)
        rightLineNumber++;
        splitLines.push({
          rightLine: {
            content: line.content,
            lineNumber: rightLineNumber,
            type: "add",
          },
        });
      }
    }

    return splitLines;
  }, [lines, effectiveViewMode]);

  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Select a file to view changes
        </p>
      </div>
    );
  }

  const isEmpty =
    lines.length === 0 || lines.every((line) => line.content.trim() === "");

  return (
    <div className="flex h-full flex-col relative">
      {/* Loading Overlay */}
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
          title={filePath}
        >
          {filePath}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <DiffViewerModeToggle
            value={viewMode}
            onChange={(value) => {
              onViewModeChangeStart?.();
              onViewModeChange?.(value);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onWordWrapChange?.(!wordWrap)}
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
      {isEmpty ? (
        <DiffEmptyState />
      ) : effectiveViewMode === "hunks" && groupedByHunks ? (
        <DiffHunkView
          groupedByHunks={groupedByHunks}
          language={language}
          wordWrap={wordWrap}
        />
      ) : effectiveViewMode === "split" && splitViewData ? (
        <DiffSplitView
          splitViewData={splitViewData}
          language={language}
          wordWrap={wordWrap}
        />
      ) : (
        <DiffFullView lines={lines} language={language} wordWrap={wordWrap} />
      )}
    </div>
  );
};
