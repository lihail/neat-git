import { useState, useMemo, useCallback } from "react";
import { getGroupedLineIndices } from "@/lib/gitDiff";
import type { DiffLine, LineGroupMap } from "@/types/git";

interface UseLineStagingStateProps {
  lineGroupMap?: LineGroupMap | null;
  isStaged?: boolean;
  onStageLines?: (lineIndices: number[]) => void;
  onUnstageLines?: (lineIndices: number[]) => void;
}

export const useLineStagingState = ({
  lineGroupMap,
  isStaged,
  onStageLines,
  onUnstageLines,
}: UseLineStagingStateProps) => {
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);

  const hoveredGroupIndices = useMemo(() => {
    if (hoveredLineIndex === null || !lineGroupMap) {
      return new Set<number>();
    }
    const indices = getGroupedLineIndices(hoveredLineIndex, lineGroupMap);
    return new Set(indices);
  }, [hoveredLineIndex, lineGroupMap]);

  const canStage = !isStaged && !!onStageLines;
  const canUnstage = isStaged && !!onUnstageLines;
  const showButton = canStage || canUnstage;

  const handleLineClick = useCallback(
    (index: number) => {
      if (!lineGroupMap) {
        return;
      }
      const groupIndices = getGroupedLineIndices(index, lineGroupMap);
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

  const isLineHighlighted = useCallback(
    (index: number) => hoveredGroupIndices.has(index),
    [hoveredGroupIndices]
  );

  const isLineActionable = useCallback(
    (line: DiffLine) => line.type === "add" || line.type === "delete",
    []
  );

  const handleMouseEnter = useCallback(
    (index: number, line: DiffLine) => {
      if (isLineActionable(line)) {
        setHoveredLineIndex(index);
      }
    },
    [isLineActionable]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredLineIndex(null);
  }, []);

  return {
    hoveredLineIndex,
    showButton,
    isLineHighlighted,
    isLineActionable,
    handleLineClick,
    handleMouseEnter,
    handleMouseLeave,
  };
};
