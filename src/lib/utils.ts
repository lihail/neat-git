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
  const extension = filename.includes(".") ? `.${filename.split(".").pop()?.toLowerCase()}` : "";

  // Search through language-map for matching extension or filename
  for (const [_langName, langData] of Object.entries(languageMap) as [string, LanguageData][]) {
    // Check exact filenames first (for files like Dockerfile, Makefile, etc.)
    if (langData.filenames?.some((fn) => fn.toLowerCase() === filename.toLowerCase())) {
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
  if (/[\s~^:?*[\]\\]/.test(name)) {
    return "Branch name cannot contain spaces or special characters (~^:?*[]\\)";
  }
  if (name.startsWith("/")) {
    return "Branch name cannot start with a slash";
  }

  return null;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateRepoName = (name: string): string | null => {
  if (!name.trim()) {
    return "Repository name cannot be empty";
  }

  // Git repository naming rules
  if (name.startsWith(".")) {
    return "Repository name cannot start with a dot";
  }
  if (name.endsWith(".git")) {
    return "Repository name cannot end with .git";
  }
  if (name.endsWith(".lock")) {
    return "Repository name cannot end with .lock";
  }
  if (name.includes("..")) {
    return "Repository name cannot contain consecutive dots";
  }
  if (/[\s~^:?*[\]\\]/.test(name)) {
    return "Repository name cannot contain spaces or special characters (~^:?*[]\\)";
  }
  if (name.includes("/")) {
    return "Repository name cannot contain slashes";
  }
  if (name.length > 255) {
    return "Repository name is too long (max 255 characters)";
  }

  return null;
};

const extractRepoNameFromUrl = (url: string): string => {
  try {
    // Remove trailing slashes and .git extension
    const repoPath = url
      .trim()
      .replace(/\.git$/, "")
      .replace(/\/$/, "");

    // Extract the last part of the URL path
    const parts = repoPath.split("/");
    const repoName = parts[parts.length - 1];

    return repoName || "repo";
  } catch {
    return "repo";
  }
};

export const extractHostFromUrl = (url: string): string => {
  try {
    // Handle HTTPS/HTTP URLs
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const urlObj = new URL(url);
      return urlObj.hostname;
    }

    // Handle SSH URLs (git@github.com:user/repo.git)
    if (url.startsWith("git@")) {
      const match = url.match(/^git@([^:]+):/);
      return match ? match[1] : "remote server";
    }

    // Handle git:// URLs
    if (url.startsWith("git://")) {
      const urlObj = new URL(url);
      return urlObj.hostname;
    }

    return "remote server";
  } catch {
    return "remote server";
  }
};

export const extractCredentialsFromUrl = (
  url: string
): { username: string; password: string } | null => {
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const urlObj = new URL(url);
      if (urlObj.username || urlObj.password) {
        return {
          username: decodeURIComponent(urlObj.username),
          password: decodeURIComponent(urlObj.password),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
};

export const isSshUrl = (url: string): boolean => {
  return /^git@.+:.+/.test(url.trim());
};

export const validateCloneUrl = (url: string): string | null => {
  const trimmedUrl = url.trim();
  const invalidUrlError = "Please enter a valid Git repository URL (https://, git@, or git://)";

  if (!trimmedUrl) {
    return null;
  }

  const isHttpUrl = /^https?:\/\/.+/.test(trimmedUrl);
  const isSshUrl = /^git@.+:.+/.test(trimmedUrl);
  const isGitUrl = /^git:\/\/.+/.test(trimmedUrl);

  if (!isHttpUrl && !isSshUrl && !isGitUrl) {
    return invalidUrlError;
  }

  const hostname = extractHostFromUrl(trimmedUrl);
  if (hostname && hostname !== "remote server") {
    const isValidHostname =
      // IPv6 address
      /^(\[)?[a-fA-F0-9:]+(\])?$/.test(hostname) ||
      // IPv4 address
      /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) ||
      // RFC 1123 hostname: alphanumeric, hyphens, and dots only
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
        hostname
      );

    if (!isValidHostname) {
      return invalidUrlError;
    }
  }

  return null;
};

export const getFullClonePath = (cloneDestination: string, cloneUrl: string): string => {
  if (!cloneDestination || !cloneUrl) {
    return "";
  }
  const repoName = extractRepoNameFromUrl(cloneUrl);
  return `${cloneDestination}/${repoName}`;
};
