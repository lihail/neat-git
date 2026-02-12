import { useEffect, useState } from "react";

type Platform = "mac" | "win";

export const usePlatform = () => {
  const [platform, setPlatform] = useState<Platform | null>(null);

  useEffect(() => {
    let isCanceled = false;

    const fetchAndSetPlatform = async () => {
      try {
        const platformResult = await window.electronAPI.getPlatform();
        if (!isCanceled) {
          setPlatform(platformResult);
        }
      } catch (error) {
        console.error("Failed to get platform from main process:", error);
        if (!isCanceled) {
          // Default to Windows arbitrarily
          setPlatform("win");
        }
      }
    };

    fetchAndSetPlatform();

    return () => {
      isCanceled = true;
    };
  }, []);

  return {
    isWindows: platform === "win",
    isMac: platform === "mac",
  };
};
