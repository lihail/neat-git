import { cn } from "@/lib/utils";
import { HighlightedContent } from "./HighlightedContent";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DiffLineRow } from "./DiffLineRow";
import type { DiffLine } from "@/types/git";

interface DiffFullViewProps {
  lines: DiffLine[];
  language: string;
  wordWrap: boolean;
}

export const DiffFullView = ({ lines, language, wordWrap }: DiffFullViewProps) => {
  return (
    <ScrollArea className="flex-1 bg-code-bg">
      <div className={cn("font-mono text-xs", !wordWrap && "flex")}>
        {!wordWrap ? (
          <>
            {/* Fixed line numbers and +/- indicators (no word wrap) */}
            <div className="flex-shrink-0 sticky left-0 bg-code-bg z-10">
              {lines.map((line, index) => (
                <DiffLineRow
                  key={index}
                  oldLineNumber={line.oldLineNumber}
                  newLineNumber={line.newLineNumber}
                  type={line.type}
                  className="items-center pl-4 h-[22px] leading-[22px]"
                />
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
          </>
        ) : (
          /* Combined rows (with word wrap) */
          <div className="w-full">
            {lines.map((line, index) => (
              <DiffLineRow
                key={index}
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
        )}
      </div>
      {!wordWrap && <ScrollBar orientation="horizontal" />}
    </ScrollArea>
  );
};
