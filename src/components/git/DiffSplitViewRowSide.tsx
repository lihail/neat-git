import { cn } from "@/lib/utils";
import { HighlightedContent } from "./HighlightedContent";

interface DiffSplitViewRowSideProps {
  line?: {
    content: string;
    lineNumber?: number;
    type: "delete" | "add" | "context";
  };
  side: "left" | "right";
  language: string;
  wordWrap: boolean;
}

export const DiffSplitViewRowSide = ({
  line,
  side,
  language,
  wordWrap,
}: DiffSplitViewRowSideProps) => {
  const isLeft = side === "left";
  const isDelete = line?.type === "delete";
  const isAdd = line?.type === "add";
  const isContext = line?.type === "context";
  const indicator = isDelete ? "-" : isAdd ? "+" : "";

  return (
    <div
      className={cn(
        "w-1/2 flex pl-4 pr-4 min-h-[22px] leading-[22px]",
        // Colored left border indicator
        isDelete &&
          "border-l-2 border-l-git-delete bg-git-delete/10 text-git-delete",
        isAdd && "border-l-2 border-l-git-add bg-git-add/10 text-git-add",
        isContext && "border-l-2 border-l-transparent text-foreground",
        !line && "border-l-2 border-l-transparent bg-muted/20",
        // Gray right border divider (only on left side)
        isLeft && "border-r border-r-border"
      )}
    >
      <span className="mr-4 inline-block w-8 select-none text-right text-muted-foreground flex-shrink-0 self-start leading-[22px]">
        {line?.lineNumber || ""}
      </span>
      <span className="mr-2 inline-block w-4 select-none flex-shrink-0 self-start leading-[22px]">
        {indicator}
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
};
