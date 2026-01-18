import { cn } from "@/lib/utils";
import { HighlightedContent } from "./HighlightedContent";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DiffLineRow } from "./DiffLineRow";
import type { SplitLine } from "@/types/git";

interface DiffSplitViewSidePaneProps {
  side: "left" | "right";
  splitLines: SplitLine[];
  language: string;
  wordWrap: boolean;
}

export const DiffSplitViewSidePane = ({
  side,
  splitLines,
  language,
  wordWrap,
}: DiffSplitViewSidePaneProps) => {
  const isLeft = side === "left";

  return (
    <div className={cn("w-1/2 min-w-0 flex overflow-hidden", isLeft && "border-r border-border")}>
      {/* Fixed line numbers */}
      <div className="flex-shrink-0 bg-code-bg overflow-y-auto scrollbar-hide">
        {splitLines.map((row, index) => {
          const line = isLeft ? row.leftLine : row.rightLine;
          return (
            <DiffLineRow
              key={`${side}-ln-${index}`}
              lineNumber={line?.lineNumber}
              type={line?.type}
              className="items-center pl-4 h-[22px] leading-[22px]"
            />
          );
        })}
      </div>
      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="select-text min-w-max">
          {splitLines.map((row, index) => {
            const line = isLeft ? row.leftLine : row.rightLine;
            return (
              <div
                key={`${side}-content-${index}`}
                className={cn(
                  "pr-4 h-[22px]",
                  line?.type === "add" && "bg-git-add/10 text-git-add",
                  line?.type === "delete" && "bg-git-delete/10 text-git-delete",
                  line?.type === "context" && "text-foreground",
                  !line && "bg-muted/20"
                )}
              >
                <div className="leading-[22px]">
                  {line && (
                    <HighlightedContent
                      content={line.content}
                      language={language}
                      wordWrap={wordWrap}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

