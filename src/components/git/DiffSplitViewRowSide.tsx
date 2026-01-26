import { cn } from "@/lib/utils";
import { HighlightedContent } from "./HighlightedContent";
import { DiffLineRow } from "./DiffLineRow";

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

  return (
    <DiffLineRow
      lineNumber={line?.lineNumber}
      type={line?.type}
      shrink
      className={cn(
        "w-1/2 pl-4 pr-4 min-h-[22px] leading-[22px]",
        isLeft && "border-r border-r-border"
      )}
    >
      <span className="select-text whitespace-pre-wrap flex-1 min-w-0 leading-[22px]">
        {line && (
          <HighlightedContent content={line.content} language={language} wordWrap={wordWrap} />
        )}
      </span>
    </DiffLineRow>
  );
};
