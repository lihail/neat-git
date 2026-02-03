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
export const INLINE_CREDENTIAL_HELPER =
  '!f() { echo "username=$GIT_CRED_USERNAME"; echo "password=$GIT_CRED_PASSWORD"; }; f';

// Create environment variables for the inline credential helper
export const createCredentialEnv = (
  username: string,
  password: string
): Record<string, string> => ({
  GIT_CRED_USERNAME: username,
  GIT_CRED_PASSWORD: password,
});
