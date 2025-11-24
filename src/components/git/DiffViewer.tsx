import { WrapText, Plus, Minus } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface DiffLine {
  type: "add" | "delete" | "context";
  content: string;
  lineNumber?: number;
}

interface DiffViewerProps {
  filePath?: string;
  lines: DiffLine[];
  isLoading?: boolean;
  wordWrap?: boolean;
  onWordWrapChange?: (value: boolean) => void;
  isStaged?: boolean;
  onStageLine?: (lineIndex: number) => void;
  onUnstageLine?: (lineIndex: number) => void;
}

export const DiffViewer = ({
  filePath,
  lines,
  isLoading = false,
  wordWrap = false,
  onWordWrapChange,
  isStaged = false,
  onStageLine,
  onUnstageLine,
}: DiffViewerProps) => {
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  const handleLineAction = (lineIndex: number) => {
    const line = lines[lineIndex];
    if (line.type === "context") return;

    if (isStaged && onUnstageLine) {
      onUnstageLine(lineIndex);
    } else if (!isStaged && onStageLine) {
      onStageLine(lineIndex);
    }
  };

  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Select a file to view changes
        </p>
      </div>
    );
  }

  // Check if file is empty (no lines or all lines have empty content)
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onWordWrapChange?.(!wordWrap)}
          className={cn(
            "h-7 gap-2 text-xs flex-shrink-0",
            wordWrap && "bg-accent"
          )}
        >
          <WrapText className="h-4 w-4" />
          Word Wrap
        </Button>
      </div>
      <ScrollArea className="flex-1 bg-code-bg">
        {isEmpty ? (
          <div className="flex h-full w-full items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">
              File is empty or has no content
            </p>
          </div>
        ) : (
          <div className={cn("font-mono text-xs", !wordWrap && "flex")}>
            {!wordWrap ? (
              <>
                {/* Fixed line numbers and +/- indicators (no word wrap) */}
                <div className="flex-shrink-0 sticky left-0 bg-code-bg z-10">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      onMouseEnter={() => setHoveredLine(index)}
                      onMouseLeave={() => setHoveredLine(null)}
                      className={cn(
                        "flex items-center border-l-2 pl-4 h-[22px] group",
                        line.type === "add" &&
                          "border-git-add bg-git-add/10 text-git-add",
                        line.type === "delete" &&
                          "border-git-delete bg-git-delete/10 text-git-delete",
                        line.type === "context" &&
                          "border-transparent text-foreground",
                        line.type !== "context" &&
                          (onStageLine || onUnstageLine) &&
                          "cursor-pointer hover:bg-opacity-20"
                      )}
                    >
                      <span className="mr-4 inline-block w-8 select-none text-right text-muted-foreground leading-[22px]">
                        {line.lineNumber}
                      </span>
                      <span className="mr-2 inline-block w-4 select-none leading-[22px]">
                        {line.type === "add" && "+"}
                        {line.type === "delete" && "-"}
                      </span>
                      {line.type !== "context" &&
                        (onStageLine || onUnstageLine) &&
                        hoveredLine === index && (
                          <button
                            onClick={() => handleLineAction(index)}
                            className={cn(
                              "ml-2 px-2 py-0.5 rounded text-[10px] font-semibold leading-none transition-colors flex items-center gap-1",
                              isStaged
                                ? "bg-destructive/80 hover:bg-destructive text-destructive-foreground"
                                : "bg-primary/80 hover:bg-primary text-primary-foreground"
                            )}
                            title={isStaged ? "Unstage line" : "Stage line"}
                          >
                            {isStaged ? (
                              <>
                                <Minus className="h-3 w-3" />
                                <span>Unstage</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3" />
                                <span>Stage</span>
                              </>
                            )}
                          </button>
                        )}
                    </div>
                  ))}
                </div>

                {/* Scrollable content (no word wrap) */}
                <div className="flex-1 select-text min-w-max">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      onMouseEnter={() => setHoveredLine(index)}
                      onMouseLeave={() => setHoveredLine(null)}
                      className={cn(
                        "px-2 h-[22px] leading-[22px]",
                        line.type === "add" && "bg-git-add/10 text-git-add",
                        line.type === "delete" &&
                          "bg-git-delete/10 text-git-delete",
                        line.type === "context" && "text-foreground",
                        line.type !== "context" &&
                          (onStageLine || onUnstageLine) &&
                          "cursor-pointer hover:bg-opacity-20"
                      )}
                    >
                      <span className="select-text whitespace-pre">
                        {line.content}
                      </span>
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
                    onMouseEnter={() => setHoveredLine(index)}
                    onMouseLeave={() => setHoveredLine(null)}
                    className={cn(
                      "flex border-l-2 px-4 py-1 relative group",
                      line.type === "add" &&
                        "border-git-add bg-git-add/10 text-git-add",
                      line.type === "delete" &&
                        "border-git-delete bg-git-delete/10 text-git-delete",
                      line.type === "context" &&
                        "border-transparent text-foreground",
                      line.type !== "context" &&
                        (onStageLine || onUnstageLine) &&
                        "cursor-pointer hover:bg-opacity-20"
                    )}
                  >
                    <span className="mr-4 inline-block w-8 select-none text-right text-muted-foreground flex-shrink-0 self-start">
                      {line.lineNumber}
                    </span>
                    <span className="mr-2 inline-block w-4 select-none flex-shrink-0 self-start">
                      {line.type === "add" && "+"}
                      {line.type === "delete" && "-"}
                    </span>
                    {line.type !== "context" &&
                      (onStageLine || onUnstageLine) &&
                      hoveredLine === index && (
                        <button
                          onClick={() => handleLineAction(index)}
                          className={cn(
                            "mr-2 px-2 py-0.5 rounded text-[10px] font-semibold leading-none transition-colors flex items-center gap-1 flex-shrink-0 self-start",
                            isStaged
                              ? "bg-destructive/80 hover:bg-destructive text-destructive-foreground"
                              : "bg-primary/80 hover:bg-primary text-primary-foreground"
                          )}
                          title={isStaged ? "Unstage line" : "Stage line"}
                        >
                          <span>{isStaged ? "Unstage" : "Stage"}</span>
                        </button>
                      )}
                    <span className="select-text whitespace-pre-wrap flex-1 min-w-0">
                      {line.content}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {!wordWrap && <ScrollBar orientation="horizontal" />}
      </ScrollArea>
    </div>
  );
};
