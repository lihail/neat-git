import { getWordWrap, saveWordWrap } from "@/lib/localStorage";
import { useEffect, useState } from "react";

export const useWordWrap = () => {
  const [wordWrap, setWordWrap] = useState<boolean>(() => {
    const savedValue = getWordWrap();
    return savedValue === "true";
  });

  useEffect(() => {
    saveWordWrap(wordWrap);
  }, [wordWrap]);

  return {
    wordWrap,
    setWordWrap,
  };
};
