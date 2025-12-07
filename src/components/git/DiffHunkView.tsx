import { cn } from "@/lib/utils";
import { HighlightedContent } from "./HighlightedContent";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DiffHunkSeparator } from "./DiffHunkSeparator";

interface DiffLine {
  type: "add" | "delete" | "context";
  content: string;
  lineNumber?: number;
  hunkIndex?: number;
  hunkHeader?: string;
}

interface Hunk {
  index: number;
  header: string;
  lines: DiffLine[];
  startLine: number;
  endLine: number;
}

interface DiffHunkViewProps {
  groupedByHunks: Hunk[];
  language: string;
  wordWrap: boolean;
}

export const DiffHunkView = ({
  groupedByHunks,
  language,
  wordWrap,
}: DiffHunkViewProps) => {
  return (
    <ScrollArea className="flex-1 bg-code-bg">
      <div className="font-mono text-xs w-fit min-w-full">
        {groupedByHunks.map((hunk, i) => (
          <div key={hunk.index}>
            <DiffHunkSeparator
              startLine={hunk.startLine}
              endLine={hunk.endLine}
            />

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
                  {hunk.lines.map((line, i) => (
                    <div
                      key={`${hunk.index}-ln-${i}`}
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
      {!wordWrap && <ScrollBar orientation="horizontal" />}
    </ScrollArea>
  );
};
