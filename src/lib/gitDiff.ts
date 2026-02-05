import type { DiffLine } from "./git";
import type { SplitLine, Hunk, LineGroupMap } from "@/types/git";

export const computeLineGroups = (lines: DiffLine[]): LineGroupMap => {
  const lineToGroup = new Map<number, number>();
  const groups = new Map<number, number[]>();
  let nextGroupId = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.type === "context") {
      lineToGroup.set(i, -1);
      i++;
      continue;
    }

    if (line.type === "delete") {
      const deleteIndices: number[] = [];
      let j = i;
      while (j < lines.length && lines[j].type === "delete") {
        deleteIndices.push(j);
        j++;
      }

      const addIndices: number[] = [];
      while (j < lines.length && lines[j].type === "add") {
        addIndices.push(j);
        j++;
      }

      const minPairs = Math.min(deleteIndices.length, addIndices.length);

      for (let k = 0; k < minPairs; k++) {
        const groupId = nextGroupId++;
        groups.set(groupId, [deleteIndices[k], addIndices[k]]);
        lineToGroup.set(deleteIndices[k], groupId);
        lineToGroup.set(addIndices[k], groupId);
      }

      for (let k = minPairs; k < deleteIndices.length; k++) {
        const groupId = nextGroupId++;
        groups.set(groupId, [deleteIndices[k]]);
        lineToGroup.set(deleteIndices[k], groupId);
      }

      for (let k = minPairs; k < addIndices.length; k++) {
        const groupId = nextGroupId++;
        groups.set(groupId, [addIndices[k]]);
        lineToGroup.set(addIndices[k], groupId);
      }

      i = j;
    } else if (line.type === "add") {
      const groupId = nextGroupId++;
      groups.set(groupId, [i]);
      lineToGroup.set(i, groupId);
      i++;
    }
  }

  return { lineToGroup, groups };
};

export const getGroupedLineIndices = (lineIndex: number, lineGroupMap: LineGroupMap): number[] => {
  const groupId = lineGroupMap.lineToGroup.get(lineIndex);
  if (groupId === undefined || groupId === -1) {
    return [];
  }
  return lineGroupMap.groups.get(groupId) || [];
};

export const groupLinesByHunks = (lines: DiffLine[]): Hunk[] | null => {
  if (lines.length === 0) {
    return null;
  }

  const hunks: Hunk[] = [];

  lines.forEach((line) => {
    const hunkIndex = line.hunkIndex ?? 0;
    if (!hunks[hunkIndex]) {
      hunks[hunkIndex] = {
        index: hunkIndex,
        header: line.hunkHeader || "",
        lines: [],
        startLine: line.lineNumber || 0,
        endLine: line.lineNumber || 0,
      };
    }
    hunks[hunkIndex].lines.push(line);
    if (line.lineNumber) {
      hunks[hunkIndex].endLine = Math.max(hunks[hunkIndex].endLine, line.lineNumber);
    }
  });

  return hunks.filter((h) => h); // Remove any undefined entries
};

export const pairSplitLines = (lines: DiffLine[]): SplitLine[] | null => {
  if (lines.length === 0) {
    return null;
  }

  const splitLines: SplitLine[] = [];
  let leftLineNumber = 0;
  let rightLineNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.type === "context") {
      leftLineNumber++;
      rightLineNumber++;
      splitLines.push({
        leftLine: {
          content: line.content,
          lineNumber: leftLineNumber,
          type: "context",
        },
        rightLine: {
          content: line.content,
          lineNumber: rightLineNumber,
          type: "context",
        },
        leftGlobalIndex: i,
        rightGlobalIndex: i,
      });
    } else if (line.type === "delete") {
      const deleteIndices: number[] = [];
      let j = i;
      while (j < lines.length && lines[j].type === "delete") {
        deleteIndices.push(j);
        j++;
      }

      const addIndices: number[] = [];
      while (j < lines.length && lines[j].type === "add") {
        addIndices.push(j);
        j++;
      }

      const maxLines = Math.max(deleteIndices.length, addIndices.length);
      for (let k = 0; k < maxLines; k++) {
        const deleteIdx = deleteIndices[k];
        const addIdx = addIndices[k];
        const deleteLine = deleteIdx !== undefined ? lines[deleteIdx] : undefined;
        const addLine = addIdx !== undefined ? lines[addIdx] : undefined;

        splitLines.push({
          leftLine: deleteLine
            ? {
                content: deleteLine.content,
                lineNumber: ++leftLineNumber,
                type: "delete",
              }
            : undefined,
          rightLine: addLine
            ? {
                content: addLine.content,
                lineNumber: ++rightLineNumber,
                type: "add",
              }
            : undefined,
          leftGlobalIndex: deleteIdx,
          rightGlobalIndex: addIdx,
        });
      }

      i = j - 1;
    } else if (line.type === "add") {
      rightLineNumber++;
      splitLines.push({
        rightLine: {
          content: line.content,
          lineNumber: rightLineNumber,
          type: "add",
        },
        rightGlobalIndex: i,
      });
    }
  }

  return splitLines;
};
