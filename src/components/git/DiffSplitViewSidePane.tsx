import { cn } from "@/lib/utils";
import { HighlightedContent } from "./HighlightedContent";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DiffLineRow } from "./DiffLineRow";
import { LineStagingButton } from "./LineStagingButton";
import type { SplitLine } from "@/types/git";

interface DiffSplitViewSidePaneProps {
  side: "left" | "right";
  splitLines: SplitLine[];
  language: string;
  wordWrap: boolean;
  isIndexHighlighted?: (index: number | undefined) => boolean;
  showButton?: boolean;
  isStaged?: boolean;
  hoveredGlobalIndex?: number | null;
  onHover?: (index: number | null) => void;
  onClick?: (index: number) => void;
}

export const DiffSplitViewSidePane = ({
  side,
  splitLines,
  language,
  wordWrap,
  isIndexHighlighted,
  showButton,
  isStaged,
  hoveredGlobalIndex,
  onHover,
  onClick,
}: DiffSplitViewSidePaneProps) => {
  const isLeft = side === "left";

  const getGlobalIndex = (row: SplitLine) => (isLeft ? row.leftGlobalIndex : row.rightGlobalIndex);

  const isActionable = (line?: { type: string }) => line?.type === "add" || line?.type === "delete";

  return (
    <div className={cn("w-1/2 min-w-0 flex overflow-hidden", isLeft && "border-r border-border")}>
      <div className="flex-shrink-0 bg-code-bg overflow-y-auto scrollbar-hide">
        {splitLines.map((row, index) => {
          const line = isLeft ? row.leftLine : row.rightLine;
          const globalIdx = getGlobalIndex(row);
          return (
            <DiffLineRow
              key={`${side}-ln-${index}`}
              oldLineNumber={isLeft ? line?.lineNumber : undefined}
              newLineNumber={isLeft ? undefined : line?.lineNumber}
              singleColumn
              type={line?.type}
              className={cn(
                "items-center pl-4 h-[22px] leading-[22px]",
                isIndexHighlighted?.(globalIdx) && "bg-primary/20"
              )}
            />
          );
        })}
      </div>
      <ScrollArea className="flex-1">
        <div className="select-text min-w-max">
          {splitLines.map((row, index) => {
            const line = isLeft ? row.leftLine : row.rightLine;
            const globalIdx = getGlobalIndex(row);
            const isHovered = globalIdx !== undefined && hoveredGlobalIndex === globalIdx;

            return (
              <div
                key={`${side}-content-${index}`}
                className={cn(
                  "pr-4 h-[22px] group flex items-center",
                  line?.type === "add" && "bg-git-add/10 text-git-add",
                  line?.type === "delete" && "bg-git-delete/10 text-git-delete",
                  line?.type === "context" && "text-foreground",
                  !line && "bg-muted/20",
                  isIndexHighlighted?.(globalIdx) && "bg-primary/20"
                )}
                onMouseEnter={() => {
                  if (isActionable(line) && globalIdx !== undefined && onHover) {
                    onHover(globalIdx);
                  }
                }}
                onMouseLeave={() => onHover?.(null)}
              >
                <div className="leading-[22px] flex-1">
                  {line && (
                    <HighlightedContent
                      content={line.content}
                      language={language}
                      wordWrap={wordWrap}
                    />
                  )}
                </div>
                {showButton && isActionable(line) && isHovered && (
                  <LineStagingButton
                    isStaged={isStaged}
                    onClick={() => globalIdx !== undefined && onClick?.(globalIdx)}
                    sticky
                  />
                )}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
