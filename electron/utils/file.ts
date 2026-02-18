import fs from "node:fs";
import path from "node:path";
import { getPlatform } from "./platform";

export const getUserHomeFolder = () => {
  const platform = getPlatform();
  if (platform === "win") {
    return process.env.USERPROFILE || "";
  }
  if (platform === "mac") {
    return process.env.HOME || "";
  }
  return "";
};

export const isGitRepository = (folderPath: string): boolean => {
  const gitPath = path.join(folderPath, ".git");
  return fs.existsSync(gitPath);
};
