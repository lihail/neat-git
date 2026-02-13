import { getPlatform } from "./platform";
import { GIT_CREDENTIAL_OSXKEYCHAIN_HELPER } from "./gitCredentialOsxkeychain";
import { GIT_CREDENTIAL_MANAGER_HELPER } from "./gitCredentialManager";
import { isHttpRemote } from "./url";
import { execGitCommand } from "../services/dugiteService";

interface CredentialHelperConfig {
  args: string[];
  env?: Record<string, string>;
}

const GIT_INLINE_CREDENTIAL_HELPER =
  '!f() { echo "username=$GIT_CRED_USERNAME"; echo "password=$GIT_CRED_PASSWORD"; }; f';

const getCredentialHelper = () => {
  const platform = getPlatform();

  if (platform === "mac") {
    return GIT_CREDENTIAL_OSXKEYCHAIN_HELPER;
  }
  if (platform === "win") {
    return GIT_CREDENTIAL_MANAGER_HELPER;
  }

  return "";
};

export const getCredentialHelperConfig = (
  isHttpUrl: boolean,
  username: string | null,
  password: string | null
): CredentialHelperConfig => {
  if (!isHttpUrl) {
    return { args: [] };
  }

  if (username && password) {
    return {
      args: ["-c", `credential.helper=${GIT_INLINE_CREDENTIAL_HELPER}`],
      env: {
        GIT_CRED_USERNAME: username,
        GIT_CRED_PASSWORD: password,
      },
    };
  }

  const helper = getCredentialHelper();
  return {
    args: ["-c", `credential.helper=${helper}`],
  };
};

export const storeCredentials = async (
  remoteUrl: string,
  repoPath: string,
  username: string | null,
  password: string | null
): Promise<void> => {
  const isHttpUrl = isHttpRemote(remoteUrl);

  if (!isHttpUrl || !username || !password) {
    return;
  }

  try {
    const helper = getCredentialHelper();
    const args = ["-c", `credential.helper=${helper}`, "credential", "approve"];
    const url = new URL(remoteUrl);
    const credentialInput = `protocol=${url.protocol.replace(":", "")}\nhost=${url.host}\nusername=${username}\npassword=${password}\n\n`;

    await execGitCommand(args, repoPath, undefined, credentialInput);
  } catch (error) {
    console.error("Failed to store credentials:", error);
  }
};
