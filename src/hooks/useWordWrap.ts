import { getWordWrap, saveWordWrap } from "@/lib/localStorage";
import { useEffect, useState } from "react";

export const useWordWrap = () => {
  const [wordWrap, setWordWrap] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const savedValue = getWordWrap();
      return savedValue === "true";
    }
    return false;
  });

  useEffect(() => {
    saveWordWrap(wordWrap);
  }, [wordWrap]);

  return {
    wordWrap,
    setWordWrap,
  };
};
