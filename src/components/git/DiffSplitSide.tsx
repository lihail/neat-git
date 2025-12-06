import { cn } from "@/lib/utils";
import { HighlightedContent } from "./HighlightedContent";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface SplitLine {
  leftLine?: {
    content: string;
    lineNumber?: number;
    type: "delete" | "context";
  };
  rightLine?: { content: string; lineNumber?: number; type: "add" | "context" };
}

interface DiffSplitSideProps {
  side: "left" | "right";
  title: string;
  splitViewData: SplitLine[];
  language: string;
  wordWrap: boolean;
  className?: string;
}

export const DiffSplitSide = ({
  side,
  title,
  splitViewData,
  language,
  wordWrap,
  className,
}: DiffSplitSideProps) => {
  const isLeft = side === "left";
  const lineType = isLeft ? "delete" : "add";
  const indicator = isLeft ? "-" : "+";
  const colorClass = isLeft ? "git-delete" : "git-add";

  return (
    <div className={cn("w-1/2 min-w-0 flex flex-col", className)}>
      <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
        {title}
      </div>
      {!wordWrap ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Fixed line numbers column */}
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
      ) : (
        <ScrollArea className="flex-1">
          <div className="w-full">
            {splitViewData.map((row, index) => {
              const line = isLeft ? row.leftLine : row.rightLine;
              return (
                <div
                  key={`${side}-wrap-${index}`}
                  className={cn(
                    "flex border-l-2 pl-4 pr-4 min-h-[22px] leading-[22px]",
                    line?.type === lineType &&
                      `border-${colorClass} bg-${colorClass}/10 text-${colorClass}`,
                    line?.type === "context" &&
                      "border-transparent text-foreground",
                    !line && "border-transparent bg-muted/20"
                  )}
                >
                  <span className="mr-4 inline-block w-8 select-none text-right text-muted-foreground flex-shrink-0 self-start leading-[22px]">
                    {line?.lineNumber || ""}
                  </span>
                  <span className="mr-2 inline-block w-4 select-none flex-shrink-0 self-start leading-[22px]">
                    {line?.type === lineType && indicator}
                  </span>
                  <span className="select-text whitespace-pre-wrap flex-1 min-w-0 leading-[22px]">
                    {line && (
                      <HighlightedContent
                        content={line.content}
                        language={language}
                        wordWrap={wordWrap}
                      />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
