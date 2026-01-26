import path from "node:path";
import fs from "node:fs";

/**
 * Recursively list all files in a directory
 * @param dirPath - Absolute path to the directory
 * @param relativePath - Relative path prefix (from repo root)
 * @returns Array of relative file paths
 */
export const listFilesRecursively = (dirPath: string, relativePath: string): string[] => {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryRelativePath = relativePath + entry.name;
      const entryFullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively list files in subdirectory
        const subFiles = listFilesRecursively(entryFullPath, entryRelativePath + "/");
        files.push(...subFiles);
      } else if (entry.isFile()) {
        files.push(entryRelativePath);
      }
    }
  } catch (error) {
    console.error("Error listing files in directory:", dirPath, error);
  }

  return files;
};
