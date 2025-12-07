import { cn } from "@/lib/utils";
import { HighlightedContent } from "./HighlightedContent";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface SplitLine {
  leftLine?: {
    content: string;
    lineNumber?: number;
    type: "delete" | "context";
  };
  rightLine?: { content: string; lineNumber?: number; type: "add" | "context" };
}

interface DiffSplitViewSidePaneProps {
  side: "left" | "right";
  splitViewData: SplitLine[];
  language: string;
  wordWrap: boolean;
}

export const DiffSplitViewSidePane = ({
  side,
  splitViewData,
  language,
  wordWrap,
}: DiffSplitViewSidePaneProps) => {
  const isLeft = side === "left";
  const lineType = isLeft ? "delete" : "add";
  const indicator = isLeft ? "-" : "+";
  const colorClass = isLeft ? "git-delete" : "git-add";

  return (
    <div className={cn("w-1/2 min-w-0 flex overflow-hidden", isLeft && "border-r border-border")}>
      {/* Fixed line numbers */}
      <div className="flex-shrink-0 bg-code-bg overflow-y-auto scrollbar-hide">
        {splitViewData.map((row, index) => {
          const line = isLeft ? row.leftLine : row.rightLine;
          return (
            <div
              key={`${side}-ln-${index}`}
              className={cn(
                "flex items-center border-l-2 pl-4 h-[22px] leading-[22px]",
                line?.type === lineType &&
                  `border-${colorClass} bg-${colorClass}/10 text-${colorClass}`,
                line?.type === "context" &&
                  "border-transparent text-foreground",
                !line && "border-transparent bg-muted/20"
              )}
            >
              <span className="mr-4 inline-block w-8 select-none text-right text-muted-foreground">
                {line?.lineNumber || ""}
              </span>
              <span className="mr-2 inline-block w-4 select-none">
                {line?.type === lineType && indicator}
              </span>
            </div>
          );
        })}
      </div>
      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="select-text min-w-max">
          {splitViewData.map((row, index) => {
            const line = isLeft ? row.leftLine : row.rightLine;
            return (
              <div
                key={`${side}-content-${index}`}
                className={cn(
                  "pr-4 h-[22px]",
                  line?.type === lineType &&
                    `bg-${colorClass}/10 text-${colorClass}`,
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

