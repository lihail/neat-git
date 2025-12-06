import { WrapText } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn, detectLanguageFromPath } from "@/lib/utils";
import { useMemo } from "react";
import { HighlightedContent } from "./HighlightedContent";
import {
  DiffViewerModeToggle,
  type DiffViewerMode,
} from "./DiffViewerModeToggle";
import { DiffSplitView } from "./DiffSplitView";

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
        // Deleted line appears only on left
        leftLineNumber++;
        // Check if next line is an add (modified line)
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.type === "add") {
          // Modified line - show on both sides
          rightLineNumber++;
          splitLines.push({
            leftLine: {
              content: line.content,
              lineNumber: leftLineNumber,
              type: "delete",
            },
            rightLine: {
              content: nextLine.content,
              lineNumber: rightLineNumber,
              type: "add",
            },
          });
          i++; // Skip the next add line since we processed it
        } else {
          // Pure deletion - only on left side
          splitLines.push({
            leftLine: {
              content: line.content,
              lineNumber: leftLineNumber,
              type: "delete",
            },
          });
        }
      } else if (line.type === "add") {
        // Added line appears only on right (if not part of a modification)
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
      <ScrollArea className="flex-1 bg-code-bg">
        {isEmpty ? (
          <div className="flex h-full w-full items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">
              File is empty or has no content
            </p>
          </div>
        ) : effectiveViewMode === "hunks" && groupedByHunks ? (
          /* Hunks view */
          <div className="font-mono text-xs">
            {groupedByHunks.map((hunk, hunkIdx) => (
              <div key={hunk.index}>
                {/* Hunk separator */}
                {hunkIdx > 0 && (
                  <div className="bg-muted/30 border-y border-border px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
                    <div className="flex-1 h-px bg-border"></div>
                    <span>
                      Lines {hunk.startLine}-{hunk.endLine}
                    </span>
                    <div className="flex-1 h-px bg-border"></div>
                  </div>
                )}

                {/* Hunk lines */}
                {wordWrap ? (
                  <div className="w-full">
                    {hunk.lines.map((line, lineIdx) => (
                      <div
                        key={`${hunk.index}-${lineIdx}`}
                        className={cn(
                          "flex border-l-2 pl-4 pr-4 min-h-[22px] leading-[22px]",
                          line.type === "add" &&
                            "border-git-add bg-git-add/10 text-git-add",
                          line.type === "delete" &&
                            "border-git-delete bg-git-delete/10 text-git-delete",
                          line.type === "context" &&
                            "border-transparent text-foreground"
                        )}
                      >
                        <span className="mr-4 inline-block w-8 select-none text-right text-muted-foreground flex-shrink-0 self-start leading-[22px]">
                          {line.lineNumber}
                        </span>
                        <span className="mr-2 inline-block w-4 select-none flex-shrink-0 self-start leading-[22px]">
                          {line.type === "add" && "+"}
                          {line.type === "delete" && "-"}
                        </span>
                        <span className="select-text whitespace-pre-wrap flex-1 min-w-0 leading-[22px]">
                          <HighlightedContent
                            content={line.content}
                            language={language}
                            wordWrap={wordWrap}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex">
                    <div className="flex-shrink-0 sticky left-0 bg-code-bg z-10">
                      {hunk.lines.map((line, lineIdx) => (
                        <div
                          key={`${hunk.index}-ln-${lineIdx}`}
                          className={cn(
                            "flex items-center border-l-2 pl-4 h-[22px] leading-[22px]",
                            line.type === "add" &&
                              "border-git-add bg-git-add/10 text-git-add",
                            line.type === "delete" &&
                              "border-git-delete bg-git-delete/10 text-git-delete",
                            line.type === "context" &&
                              "border-transparent text-foreground"
                          )}
                        >
                          <span className="mr-4 inline-block w-8 select-none text-right text-muted-foreground">
                            {line.lineNumber}
                          </span>
                          <span className="mr-2 inline-block w-4 select-none">
                            {line.type === "add" && "+"}
                            {line.type === "delete" && "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 select-text min-w-max">
                      {hunk.lines.map((line, lineIdx) => (
                        <div
                          key={`${hunk.index}-content-${lineIdx}`}
                          className={cn(
                            "pr-4 h-[22px]",
                            line.type === "add" && "bg-git-add/10 text-git-add",
                            line.type === "delete" &&
                              "bg-git-delete/10 text-git-delete",
                            line.type === "context" && "text-foreground"
                          )}
                        >
                          <div className="leading-[22px]">
                            <HighlightedContent
                              content={line.content}
                              language={language}
                              wordWrap={wordWrap}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : effectiveViewMode === "split" && splitViewData ? (
          <DiffSplitView
            splitViewData={splitViewData}
            language={language}
            wordWrap={wordWrap}
          />
        ) : (
          <div className={cn("font-mono text-xs", !wordWrap && "flex")}>
            {!wordWrap ? (
              <>
                {/* Fixed line numbers and +/- indicators (no word wrap) */}
                <div className="flex-shrink-0 sticky left-0 bg-code-bg z-10">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center border-l-2 pl-4 h-[22px] leading-[22px]",
                        line.type === "add" &&
                          "border-git-add bg-git-add/10 text-git-add",
                        line.type === "delete" &&
                          "border-git-delete bg-git-delete/10 text-git-delete",
                        line.type === "context" &&
                          "border-transparent text-foreground"
                      )}
                    >
                      <span className="mr-4 inline-block w-8 select-none text-right text-muted-foreground">
                        {line.lineNumber}
                      </span>
                      <span className="mr-2 inline-block w-4 select-none">
                        {line.type === "add" && "+"}
                        {line.type === "delete" && "-"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Scrollable content (no word wrap) */}
                <div className="flex-1 select-text min-w-max">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className={cn(
                        "pr-4 h-[22px]",
                        line.type === "add" && "bg-git-add/10 text-git-add",
                        line.type === "delete" &&
                          "bg-git-delete/10 text-git-delete",
                        line.type === "context" && "text-foreground"
                      )}
                    >
                      <div className="leading-[22px]">
                        <HighlightedContent
                          content={line.content}
                          language={language}
                          wordWrap={wordWrap}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Combined rows (with word wrap) */
              <div className="w-full">
                {lines.map((line, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex border-l-2 pl-4 pr-4 min-h-[22px] leading-[22px]",
                      line.type === "add" &&
                        "border-git-add bg-git-add/10 text-git-add",
                      line.type === "delete" &&
                        "border-git-delete bg-git-delete/10 text-git-delete",
                      line.type === "context" &&
                        "border-transparent text-foreground"
                    )}
                  >
                    <span className="mr-4 inline-block w-8 select-none text-right text-muted-foreground flex-shrink-0 self-start leading-[22px]">
                      {line.lineNumber}
                    </span>
                    <span className="mr-2 inline-block w-4 select-none flex-shrink-0 self-start leading-[22px]">
                      {line.type === "add" && "+"}
                      {line.type === "delete" && "-"}
                    </span>
                    <span className="select-text whitespace-pre-wrap flex-1 min-w-0 leading-[22px]">
                      <HighlightedContent
                        content={line.content}
                        language={language}
                        wordWrap={wordWrap}
                      />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {!wordWrap && effectiveViewMode !== "split" && (
          <ScrollBar orientation="horizontal" />
        )}
      </ScrollArea>
    </div>
  );
};
