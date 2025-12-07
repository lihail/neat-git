import { ScrollArea } from "@/components/ui/scroll-area";
import { DiffSplitViewRowSide } from "./DiffSplitViewRowSide";
import { DiffSplitViewSidePane } from "./DiffSplitViewSidePane";

export interface SplitLine {
  leftLine?: {
    content: string;
    lineNumber?: number;
    type: "delete" | "context";
  };
  rightLine?: { content: string; lineNumber?: number; type: "add" | "context" };
}

interface DiffSplitViewProps {
  splitViewData: SplitLine[];
  language: string;
  wordWrap: boolean;
}

export const DiffSplitView = ({
  splitViewData,
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
            {splitViewData.map((row, index) => (
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
          // No word wrap mode: separate left/right panes with independent scrolling
          // Since height is fixed, they stay aligned without being in same container
          <div className="flex h-full">
            <DiffSplitViewSidePane
              side="left"
              splitViewData={splitViewData}
              language={language}
              wordWrap={wordWrap}
            />
            <DiffSplitViewSidePane
              side="right"
              splitViewData={splitViewData}
              language={language}
              wordWrap={wordWrap}
            />
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
