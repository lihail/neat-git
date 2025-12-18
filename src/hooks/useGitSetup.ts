import { useState, useEffect } from "react";
import { getGitSetupComplete, saveGitSetupComplete } from "@/lib/localStorage";

export const useGitSetup = () => {
  const [showGitSetup, setShowGitSetup] = useState(false);

  const handleGitSetupComplete = () => {
    saveGitSetupComplete(true);
    setShowGitSetup(false);
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) {
      return;
    }

    const setupComplete = getGitSetupComplete();
    if (setupComplete === "true") {
      return;
    }

    setShowGitSetup(true);
  }, []);

  return {
    showGitSetup,
    handleGitSetupComplete,
  };
};
