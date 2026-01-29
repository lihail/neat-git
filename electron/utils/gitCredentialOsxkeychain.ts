import path from "node:path";
import { app } from "electron";

const getGitCredentialOsxkeychainPath = (): string => {
  const appPath = app.isPackaged ? process.resourcesPath : app.getAppPath();
  return path.join(
    appPath,
    "resources",
    "third_party",
    "git-credential-osxkeychain",
    "git-credential-osxkeychain"
  );
};

export const GIT_CREDENTIAL_OSXKEYCHAIN_PATH = getGitCredentialOsxkeychainPath();
