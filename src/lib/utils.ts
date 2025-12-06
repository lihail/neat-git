import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import languageMap from "language-map";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type LanguageData = {
  type?: string;
  aceMode?: string;
  extensions?: string[];
  filenames?: string[];
  [key: string]: unknown;
};

export const detectLanguageFromPath = (filePath: string): string => {
  const filename = filePath.split("/").pop() || "";
  const extension = filename.includes(".")
    ? `.${filename.split(".").pop()?.toLowerCase()}`
    : "";

  // Search through language-map for matching extension or filename
  for (const [_langName, langData] of Object.entries(languageMap) as [
    string,
    LanguageData
  ][]) {
    // Check exact filenames first (for files like Dockerfile, Makefile, etc.)
    if (
      langData.filenames?.some(
        (fn) => fn.toLowerCase() === filename.toLowerCase()
      )
    ) {
      return mapAceModeToPrism(langData.aceMode || "");
    }

    // Check file extensions
    if (extension && langData.extensions?.includes(extension)) {
      return mapAceModeToPrism(langData.aceMode || "");
    }
  }

  return "text";
};

const mapAceModeToPrism = (aceMode: string): string => {
  // Only map the cases where aceMode differs from Prism's language name
  const exceptions: Record<string, string> = {
    c_cpp: "cpp",
    sh: "bash",
    dockerfile: "docker",
    text: "text",
  };

  return exceptions[aceMode] || aceMode || "text";
};
