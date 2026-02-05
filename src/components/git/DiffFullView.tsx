import { cn } from "@/lib/utils";
import { HighlightedContent } from "./HighlightedContent";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DiffLineRow } from "./DiffLineRow";
import { LineStagingButton } from "./LineStagingButton";
import { useLineStagingState } from "@/hooks/useLineStagingState";
import type { DiffLine, LineGroupMap } from "@/types/git";

interface DiffFullViewProps {
  lines: DiffLine[];
  language: string;
  wordWrap: boolean;
  lineGroupMap?: LineGroupMap | null;
  isStaged?: boolean;
  onStageLines?: (lineIndices: number[]) => void;
  onUnstageLines?: (lineIndices: number[]) => void;
}

export const DiffFullView = ({
  lines,
  language,
  wordWrap,
  lineGroupMap,
  isStaged,
  onStageLines,
  onUnstageLines,
}: DiffFullViewProps) => {
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

  return (
    <ScrollArea className="flex-1 bg-code-bg">
      <div className={cn("font-mono text-xs", !wordWrap && "flex")}>
        {!wordWrap ? (
          <>
            <div className="flex-shrink-0 sticky left-0 bg-code-bg z-10">
              {lines.map((line, index) => (
                <DiffLineRow
                  key={index}
                  oldLineNumber={line.oldLineNumber}
                  newLineNumber={line.newLineNumber}
                  type={line.type}
                  className={cn(
                    "items-center pl-4 h-[22px] leading-[22px]",
                    isLineHighlighted(index) && "bg-primary/20"
                  )}
                />
              ))}
            </div>

            <div className="flex-1 select-text min-w-max">
              {lines.map((line, index) => (
                <div
                  key={index}
                  className={cn(
                    "pr-4 h-[22px] group flex items-center",
                    line.type === "add" && "bg-git-add/10 text-git-add",
                    line.type === "delete" && "bg-git-delete/10 text-git-delete",
                    line.type === "context" && "text-foreground",
                    isLineHighlighted(index) && "bg-primary/20"
                  )}
                  onMouseEnter={() => handleMouseEnter(index, line)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="leading-[22px] flex-1">
                    <HighlightedContent
                      content={line.content}
                      language={language}
                      wordWrap={wordWrap}
                    />
                  </div>
                  {showButton && isLineActionable(line) && hoveredLineIndex === index && (
                    <LineStagingButton
                      isStaged={isStaged}
                      onClick={() => handleLineClick(index)}
                      sticky
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="w-full">
            {lines.map((line, index) => (
              <div
                key={index}
                className="relative group"
                onMouseEnter={() => handleMouseEnter(index, line)}
                onMouseLeave={handleMouseLeave}
              >
                <DiffLineRow
                  oldLineNumber={line.oldLineNumber}
                  newLineNumber={line.newLineNumber}
                  type={line.type}
                  shrink
                  className={cn(
                    "pl-4 pr-4 min-h-[22px] leading-[22px]",
                    isLineHighlighted(index) && "bg-primary/20"
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
                {showButton && isLineActionable(line) && hoveredLineIndex === index && (
                  <LineStagingButton isStaged={isStaged} onClick={() => handleLineClick(index)} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {!wordWrap && <ScrollBar orientation="horizontal" />}
    </ScrollArea>
  );
};
