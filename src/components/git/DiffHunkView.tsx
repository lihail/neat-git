import { cn } from "@/lib/utils";
import { HighlightedContent } from "./HighlightedContent";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DiffHunkSeparator } from "./DiffHunkSeparator";
import { DiffLineRow } from "./DiffLineRow";
import type { Hunk } from "@/types/git";

interface DiffHunkViewProps {
  hunks: Hunk[];
  language: string;
  wordWrap: boolean;
}

export const DiffHunkView = ({ hunks, language, wordWrap }: DiffHunkViewProps) => {
  return (
    <ScrollArea className="flex-1 bg-code-bg">
      <div className="font-mono text-xs w-fit min-w-full">
        {hunks.map((hunk) => (
          <div key={hunk.index}>
            <DiffHunkSeparator
              startLine={hunk.startLine}
              endLine={hunk.endLine}
              stickyHorizontal={!wordWrap}
            />

            {/* Hunk lines */}
            {wordWrap ? (
              <div className="w-full">
                {hunk.lines.map((line, lineIdx) => (
                  <DiffLineRow
                    key={`${hunk.index}-${lineIdx}`}
                    oldLineNumber={line.oldLineNumber}
                    newLineNumber={line.newLineNumber}
                    type={line.type}
                    shrink
                    className="pl-4 pr-4 min-h-[22px] leading-[22px]"
                  >
                    <span className="select-text whitespace-pre-wrap flex-1 min-w-0 leading-[22px]">
                      <HighlightedContent
                        content={line.content}
                        language={language}
                        wordWrap={wordWrap}
                      />
                    </span>
                  </DiffLineRow>
                ))}
              </div>
            ) : (
              <div className="flex">
                <div className="flex-shrink-0 sticky left-0 bg-code-bg z-10">
                  {hunk.lines.map((line, i) => (
                    <DiffLineRow
                      key={`${hunk.index}-ln-${i}`}
                      oldLineNumber={line.oldLineNumber}
                      newLineNumber={line.newLineNumber}
                      type={line.type}
                      className="items-center pl-4 h-[22px] leading-[22px]"
                    />
                  ))}
                </div>
                <div className="flex-1 select-text min-w-max">
                  {hunk.lines.map((line, lineIdx) => (
                    <div
                      key={`${hunk.index}-content-${lineIdx}`}
                      className={cn(
                        "pr-4 h-[22px]",
                        line.type === "add" && "bg-git-add/10 text-git-add",
                        line.type === "delete" && "bg-git-delete/10 text-git-delete",
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
