import type { DiffLine } from "./git";
import type { SplitLine, Hunk } from "@/types/git";

export function groupLinesByHunks(lines: DiffLine[]): Hunk[] | null {
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
}

export function pairSplitLines(lines: DiffLine[]): SplitLine[] | null {
  if (lines.length === 0) {
    return null;
  }

  const splitLines: SplitLine[] = [];
  let leftLineNumber = 0;
  let rightLineNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.type === "context") {
      // Context appears on both sides
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
      });
    } else if (line.type === "delete") {
      // Collect all consecutive delete lines
      const deleteLines: DiffLine[] = [];
      let j = i;
      while (j < lines.length && lines[j].type === "delete") {
        deleteLines.push(lines[j]);
        j++;
      }

      // Collect all consecutive add lines that follow
      const addLines: DiffLine[] = [];
      while (j < lines.length && lines[j].type === "add") {
        addLines.push(lines[j]);
        j++;
      }

      // Pair up deletes and adds side by side
      const maxLines = Math.max(deleteLines.length, addLines.length);
      for (let k = 0; k < maxLines; k++) {
        const deleteLine = deleteLines[k];
        const addLine = addLines[k];

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
        });
      }

      // Move index forward (minus 1 because the loop will increment)
      i = j - 1;
    } else if (line.type === "add") {
      // Standalone add line (not preceded by deletes)
      rightLineNumber++;
      splitLines.push({
        rightLine: {
          content: line.content,
          lineNumber: rightLineNumber,
          type: "add",
        },
      });
    }
  }

  return splitLines;
}
