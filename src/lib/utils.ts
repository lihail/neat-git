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

/**
 * Validates a git branch name according to git naming rules
 * @param name - The branch name to validate
 * @returns Error message if invalid, null if valid
 */
export const validateBranchName = (name: string): string | null => {
  if (!name.trim()) {
    return "Branch name cannot be empty";
  }

  // Git branch naming rules
  if (name.startsWith(".")) {
    return "Branch name cannot start with a dot";
  }
  if (name.endsWith("/")) {
    return "Branch name cannot end with a slash";
  }
  if (name.endsWith(".lock")) {
    return "Branch name cannot end with .lock";
  }
  if (name.includes("..")) {
    return "Branch name cannot contain consecutive dots";
  }
  if (name.includes("//")) {
    return "Branch name cannot contain consecutive slashes";
  }
  if (name.includes("@{")) {
    return "Branch name cannot contain @{";
  }
  if (/[\s~^:?*\[\]\\]/.test(name)) {
    return "Branch name cannot contain spaces or special characters (~^:?*[]\\)";
  }
  if (name.startsWith("/")) {
    return "Branch name cannot start with a slash";
  }

  return null;
};
