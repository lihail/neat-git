import { cn } from "@/lib/utils";
import { HighlightedContent } from "./HighlightedContent";
import { DiffLineRow } from "./DiffLineRow";
import { LineStagingButton } from "./LineStagingButton";

interface DiffSplitViewRowSideProps {
  line?: {
    content: string;
    lineNumber?: number;
    type: "delete" | "add" | "context";
  };
  globalIndex?: number;
  side: "left" | "right";
  language: string;
  wordWrap: boolean;
  isHighlighted?: boolean;
  showButton?: boolean;
  isStaged?: boolean;
  hoveredGlobalIndex?: number | null;
  onHover?: (index: number | null) => void;
  onClick?: (index: number) => void;
}

export const DiffSplitViewRowSide = ({
  line,
  globalIndex,
  side,
  language,
  wordWrap,
  isHighlighted,
  showButton,
  isStaged,
  hoveredGlobalIndex,
  onHover,
  onClick,
}: DiffSplitViewRowSideProps) => {
  const isLeft = side === "left";
  const isActionable = line?.type === "add" || line?.type === "delete";
  const isHovered = globalIndex !== undefined && hoveredGlobalIndex === globalIndex;

  const handleMouseEnter = () => {
    if (isActionable && globalIndex !== undefined && onHover) {
      onHover(globalIndex);
    }
  };

  const handleMouseLeave = () => {
    if (onHover) {
      onHover(null);
    }
  };

  const handleClick = () => {
    if (globalIndex !== undefined && onClick) {
      onClick(globalIndex);
    }
  };

  return (
    <div
      className={cn("relative group w-1/2", isLeft && "border-r border-r-border")}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <DiffLineRow
        oldLineNumber={isLeft ? line?.lineNumber : undefined}
        newLineNumber={isLeft ? undefined : line?.lineNumber}
        singleColumn
        type={line?.type}
        shrink
        className={cn("pl-4 pr-4 min-h-[22px] leading-[22px]", isHighlighted && "bg-primary/20")}
      >
        <span className="select-text whitespace-pre-wrap flex-1 min-w-0 leading-[22px]">
          {line && (
            <HighlightedContent content={line.content} language={language} wordWrap={wordWrap} />
          )}
        </span>
      </DiffLineRow>
      {showButton && isActionable && isHovered && (
        <LineStagingButton isStaged={isStaged} onClick={handleClick} />
      )}
    </div>
  );
};
