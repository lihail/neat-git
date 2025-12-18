import { type DiffViewerMode } from "@/components/git/DiffViewerModeToggle";
import { useEffect, useState } from "react";
import { getDiffViewerMode, saveDiffViewerMode } from "@/lib/localStorage";

export const useDiffViewerMode = () => {
  const [diffViewerMode, setDiffViewerMode] = useState<DiffViewerMode>(() => {
    if (typeof window !== "undefined") {
      const savedValue = getDiffViewerMode();
      if (
        savedValue === "full" ||
        savedValue === "hunks" ||
        savedValue === "split"
      ) {
        return savedValue;
      }
    }
    return "full";
  });

  useEffect(() => {
    saveDiffViewerMode(diffViewerMode);
  }, [diffViewerMode]);

  return {
    diffViewerMode,
    setDiffViewerMode,
  };
};
