import path from "node:path";
import { app } from "electron";
import { execGitCommand } from "../services/dugiteService";

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

export const createCredentialEnv = (
  username: string,
  password: string
): Record<string, string> => ({
  GIT_CRED_USERNAME: username,
  GIT_CRED_PASSWORD: password,
});

export const storeCredentialsToOsxkeychain = async (
  remoteUrl: string,
  repoPath: string,
  username: string,
  password: string
): Promise<void> => {
  const args = [
    "-c",
    `credential.helper=${GIT_CREDENTIAL_OSXKEYCHAIN_PATH}`,
    "credential",
    "approve",
  ];
  const url = new URL(remoteUrl);
  const credentialInput = `protocol=${url.protocol.replace(":", "")}\nhost=${url.host}\nusername=${username}\npassword=${password}\n\n`;

  await execGitCommand(args, repoPath, undefined, credentialInput);
};
