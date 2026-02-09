import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { HighlightedContent } from "../common/HighlightedContent";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DiffHunkSeparator } from "./DiffHunkSeparator";
import { DiffLineRow } from "./DiffLineRow";
import { LineStagingButton } from "./LineStagingButton";
import { useLineStagingState } from "@/hooks/useLineStagingState";
import type { Hunk, DiffLine, LineGroupMap } from "@/types/git";

interface DiffHunkViewProps {
  hunks: Hunk[];
  lines?: DiffLine[];
  language: string;
  wordWrap: boolean;
  lineGroupMap?: LineGroupMap | null;
  isStaged?: boolean;
  onStageHunk?: (hunkIndex: number) => void;
  onUnstageHunk?: (hunkIndex: number) => void;
  onStageLines?: (lineIndices: number[]) => void;
  onUnstageLines?: (lineIndices: number[]) => void;
}

export const DiffHunkView = ({
  hunks,
  lines,
  language,
  wordWrap,
  lineGroupMap,
  isStaged,
  onStageHunk,
  onUnstageHunk,
  onStageLines,
  onUnstageLines,
}: DiffHunkViewProps) => {
  const lineToGlobalIndex = useMemo(() => {
    if (!lines) {
      return new Map<DiffLine, number>();
    }
    const map = new Map<DiffLine, number>();
    lines.forEach((line, index) => map.set(line, index));
    return map;
  }, [lines]);

  const {
    hoveredLineIndex,
    showButton,
    isLineHighlighted,
    isLineActionable,
    handleLineClick,
    handleMouseEnter,
    handleMouseLeave,
  } = useLineStagingState({
    lineGroupMap,
    isStaged,
    onStageLines,
    onUnstageLines,
  });

  const getGlobalIndex = (line: DiffLine) => lineToGlobalIndex.get(line) ?? -1;

  return (
    <ScrollArea className="flex-1 bg-code-bg">
      <div className="font-mono text-xs w-fit min-w-full isolate">
        {hunks.map((hunk) => (
          <div key={hunk.index}>
            <DiffHunkSeparator
              startLine={hunk.startLine}
              endLine={hunk.endLine}
              stickyHorizontal={!wordWrap}
              isStaged={isStaged}
              onStageHunk={onStageHunk ? () => onStageHunk(hunk.index) : undefined}
              onUnstageHunk={onUnstageHunk ? () => onUnstageHunk(hunk.index) : undefined}
            />

            {wordWrap ? (
              <div className="w-full">
                {hunk.lines.map((line, lineIdx) => {
                  const globalIdx = getGlobalIndex(line);
                  return (
                    <div
                      key={`${hunk.index}-${lineIdx}`}
                      className="relative group"
                      onMouseEnter={() => handleMouseEnter(globalIdx, line)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <DiffLineRow
                        oldLineNumber={line.oldLineNumber}
                        newLineNumber={line.newLineNumber}
                        type={line.type}
                        shrink
                        className={cn(
                          "pl-4 pr-4 min-h-[22px] leading-[22px]",
                          isLineHighlighted(globalIdx) && "bg-primary/20"
                        )}
                      >
                        <span className="select-text whitespace-pre-wrap flex-1 min-w-0 leading-[22px]">
                          <HighlightedContent
                            content={line.content}
                            language={language}
                            wordWrap={wordWrap}
                          />
                        </span>
                      </DiffLineRow>
                      {showButton && isLineActionable(line) && hoveredLineIndex === globalIdx && (
                        <LineStagingButton
                          isStaged={isStaged}
                          onClick={() => handleLineClick(globalIdx)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex">
                <div className="flex-shrink-0 sticky left-0 bg-code-bg z-10">
                  {hunk.lines.map((line, i) => {
                    const globalIdx = getGlobalIndex(line);
                    return (
                      <DiffLineRow
                        key={`${hunk.index}-ln-${i}`}
                        oldLineNumber={line.oldLineNumber}
                        newLineNumber={line.newLineNumber}
                        type={line.type}
                        className={cn(
                          "items-center pl-4 h-[22px] leading-[22px]",
                          isLineHighlighted(globalIdx) && "bg-primary/20"
                        )}
                      />
                    );
                  })}
                </div>
                <div className="flex-1 select-text min-w-max">
                  {hunk.lines.map((line, lineIdx) => {
                    const globalIdx = getGlobalIndex(line);
                    return (
                      <div
                        key={`${hunk.index}-content-${lineIdx}`}
                        className={cn(
                          "pr-4 h-[22px] group flex items-center",
                          line.type === "add" && "bg-git-add/10 text-git-add",
                          line.type === "delete" && "bg-git-delete/10 text-git-delete",
                          line.type === "context" && "text-foreground",
                          isLineHighlighted(globalIdx) && "bg-primary/20"
                        )}
                        onMouseEnter={() => handleMouseEnter(globalIdx, line)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div className="leading-[22px] flex-1">
                          <HighlightedContent
                            content={line.content}
                            language={language}
                            wordWrap={wordWrap}
                          />
                        </div>
                        {showButton && isLineActionable(line) && hoveredLineIndex === globalIdx && (
                          <LineStagingButton
                            isStaged={isStaged}
                            onClick={() => handleLineClick(globalIdx)}
                            sticky
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {!wordWrap && <ScrollBar orientation="horizontal" />}
    </ScrollArea>
  );
};
