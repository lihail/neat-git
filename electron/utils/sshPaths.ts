import path from "node:path";
import { app } from "electron";
import { getPlatform } from "./platform";

const getWindowsSshToolPath = (toolName: string): string => {
  const appPath = app.isPackaged ? process.resourcesPath : app.getAppPath();
  return path.join(appPath, "resources", "third_party", "openssh-portable", toolName);
};

const getSshKeygenPath = (): string => {
  const platform = getPlatform();
  if (platform === "mac") {
    return "ssh-keygen";
  }
  if (platform === "win") {
    return getWindowsSshToolPath("ssh-keygen.exe");
  }

  return "";
};

const getSshKeyscanPath = (): string => {
  const platform = getPlatform();
  if (platform === "mac") {
    return "ssh-keyscan";
  }
  if (platform === "win") {
    return getWindowsSshToolPath("ssh-keyscan.exe");
  }

  return "";
};

export const SSH_KEYGEN_COMMAND_PATH = getSshKeygenPath();
export const SSH_KEYSCAN_COMMAND_PATH = getSshKeyscanPath();
