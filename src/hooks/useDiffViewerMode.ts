import { useEffect, useState } from "react";
import { getDiffViewerMode, saveDiffViewerMode } from "@/lib/localStorage";
import { DiffViewerMode } from "@/types/git";

export const useDiffViewerMode = () => {
  const [diffViewerMode, setDiffViewerMode] = useState<DiffViewerMode>(() => {
    const savedValue = getDiffViewerMode();
    if (savedValue === "full" || savedValue === "hunks" || savedValue === "split") {
      return savedValue;
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
