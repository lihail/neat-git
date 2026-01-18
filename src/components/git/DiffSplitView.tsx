import { ScrollArea } from "@/components/ui/scroll-area";
import { DiffSplitViewRowSide } from "./DiffSplitViewRowSide";
import { DiffSplitViewSidePane } from "./DiffSplitViewSidePane";
import type { SplitLine } from "@/types/git";

interface DiffSplitViewProps {
  splitLines: SplitLine[];
  language: string;
  wordWrap: boolean;
}

export const DiffSplitView = ({
  splitLines,
  language,
  wordWrap,
}: DiffSplitViewProps) => {
  return (
    <div className="flex flex-col font-mono text-xs h-full">
      <div className="flex border-b border-border">
        <div className="w-1/2 bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground border-r border-border">
          Old
        </div>
        <div className="w-1/2 bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
          New
        </div>
      </div>
      <ScrollArea className="flex-1 bg-code-bg">
        {wordWrap ? (
          <div className="w-full">
            {splitLines.map((row, index) => (
              <div key={index} className="flex">
                <DiffSplitViewRowSide
                  line={row.leftLine}
                  side="left"
                  language={language}
                  wordWrap={wordWrap}
                />
                <DiffSplitViewRowSide
                  line={row.rightLine}
                  side="right"
                  language={language}
                  wordWrap={wordWrap}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full">
            <DiffSplitViewSidePane
              side="left"
              splitLines={splitLines}
              language={language}
              wordWrap={wordWrap}
            />
            <DiffSplitViewSidePane
              side="right"
              splitLines={splitLines}
              language={language}
              wordWrap={wordWrap}
            />
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
