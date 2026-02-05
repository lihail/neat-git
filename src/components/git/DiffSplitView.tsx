import { useState, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DiffSplitViewRowSide } from "./DiffSplitViewRowSide";
import { DiffSplitViewSidePane } from "./DiffSplitViewSidePane";
import { getGroupedLineIndices } from "@/lib/gitDiff";
import type { SplitLine, LineGroupMap } from "@/types/git";

interface DiffSplitViewProps {
  splitLines: SplitLine[];
  language: string;
  wordWrap: boolean;
  lineGroupMap?: LineGroupMap | null;
  isStaged?: boolean;
  onStageLines?: (lineIndices: number[]) => void;
  onUnstageLines?: (lineIndices: number[]) => void;
}

export const DiffSplitView = ({
  splitLines,
  language,
  wordWrap,
  lineGroupMap,
  isStaged,
  onStageLines,
  onUnstageLines,
}: DiffSplitViewProps) => {
  const [hoveredGlobalIndex, setHoveredGlobalIndex] = useState<number | null>(null);

  const hoveredGroupIndices = useMemo(() => {
    if (hoveredGlobalIndex === null || !lineGroupMap) {
      return new Set<number>();
    }
    const indices = getGroupedLineIndices(hoveredGlobalIndex, lineGroupMap);
    return new Set(indices);
  }, [hoveredGlobalIndex, lineGroupMap]);

  const canStage = !isStaged && !!onStageLines;
  const canUnstage = isStaged && !!onUnstageLines;
  const showButton = canStage || canUnstage;

  const handleLineClick = useCallback(
    (globalIndex: number) => {
      if (!lineGroupMap) {
        return;
      }
      const groupIndices = getGroupedLineIndices(globalIndex, lineGroupMap);
      if (groupIndices.length === 0) {
        return;
      }

      if (canStage) {
        onStageLines!(groupIndices);
      } else if (canUnstage) {
        onUnstageLines!(groupIndices);
      }
    },
    [lineGroupMap, canStage, canUnstage, onStageLines, onUnstageLines]
  );

  const isIndexHighlighted = useCallback(
    (globalIndex: number | undefined) =>
      globalIndex !== undefined && hoveredGroupIndices.has(globalIndex),
    [hoveredGroupIndices]
  );

  return (
    <div className="flex flex-col font-mono text-xs h-full">
      <div className="flex border-y border-border">
        <div className="w-1/2 bg-card px-4 py-2 text-xs text-muted-foreground border-r border-border text-center">
          Old
        </div>
        <div className="w-1/2 bg-card px-4 py-2 text-xs text-muted-foreground text-center">New</div>
      </div>
      <ScrollArea className="flex-1 bg-code-bg">
        {wordWrap ? (
          <div className="w-full">
            {splitLines.map((row, index) => (
              <div key={index} className="flex">
                <DiffSplitViewRowSide
                  line={row.leftLine}
                  globalIndex={row.leftGlobalIndex}
                  side="left"
                  language={language}
                  wordWrap={wordWrap}
                  isHighlighted={isIndexHighlighted(row.leftGlobalIndex)}
                  showButton={showButton}
                  isStaged={isStaged}
                  hoveredGlobalIndex={hoveredGlobalIndex}
                  onHover={setHoveredGlobalIndex}
                  onClick={handleLineClick}
                />
                <DiffSplitViewRowSide
                  line={row.rightLine}
                  globalIndex={row.rightGlobalIndex}
                  side="right"
                  language={language}
                  wordWrap={wordWrap}
                  isHighlighted={isIndexHighlighted(row.rightGlobalIndex)}
                  showButton={showButton}
                  isStaged={isStaged}
                  hoveredGlobalIndex={hoveredGlobalIndex}
                  onHover={setHoveredGlobalIndex}
                  onClick={handleLineClick}
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
              isIndexHighlighted={isIndexHighlighted}
              showButton={showButton}
              isStaged={isStaged}
              hoveredGlobalIndex={hoveredGlobalIndex}
              onHover={setHoveredGlobalIndex}
              onClick={handleLineClick}
            />
            <DiffSplitViewSidePane
              side="right"
              splitLines={splitLines}
              language={language}
              wordWrap={wordWrap}
              isIndexHighlighted={isIndexHighlighted}
              showButton={showButton}
              isStaged={isStaged}
              hoveredGlobalIndex={hoveredGlobalIndex}
              onHover={setHoveredGlobalIndex}
              onClick={handleLineClick}
            />
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
