import path from "node:path";
import fs from "node:fs";
import { isValidHostname } from "../utils/url";
import { spawnAsync } from "../utils/process";
import { getUserHomeFolder } from "../utils/file";

const SSH_KEYS_FOLDER = ".ssh";

const getSshKeysFolder = () => {
  const homeFolder = getUserHomeFolder();
  return path.join(homeFolder, SSH_KEYS_FOLDER);
};

export const findKeys = () => {
  try {
    const sshFolder = getSshKeysFolder();

    if (!fs.existsSync(sshFolder)) {
      return { success: true, hasKeys: false, keys: [] };
    }

    const keyTypes = [
      { private: "id_ed25519", public: "id_ed25519.pub" },
      { private: "id_rsa", public: "id_rsa.pub" },
    ];

    const foundKeys: Array<{
      name: string;
      privatePath: string;
      publicPath: string;
    }> = [];
    for (const keyType of keyTypes) {
      const privatePath = path.join(sshFolder, keyType.private);
      const publicPath = path.join(sshFolder, keyType.public);

      if (fs.existsSync(privatePath) && fs.existsSync(publicPath)) {
        foundKeys.push({
          name: keyType.private,
          privatePath,
          publicPath,
        });
      }
    }

    return {
      success: true,
      hasKeys: foundKeys.length > 0,
      keys: foundKeys,
    };
  } catch (error) {
    console.error("Error checking SSH keys:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const generateKey = async () => {
  try {
    const sshFolder = getSshKeysFolder();

    // Create SSH keys folder if it doesn't exist
    if (!fs.existsSync(sshFolder)) {
      fs.mkdirSync(sshFolder, { recursive: true, mode: 0o700 });
    }

    const keyPath = path.join(sshFolder, "id_ed25519");
    const publicKeyPath = `${keyPath}.pub`;

    // Backup existing keys if they exist (instead of deleting)
    const timestamp = Date.now();
    if (fs.existsSync(keyPath)) {
      const backupPath = `${keyPath}.backup.${timestamp}`;
      fs.renameSync(keyPath, backupPath);
    }
    if (fs.existsSync(publicKeyPath)) {
      const backupPath = `${publicKeyPath}.backup.${timestamp}`;
      fs.renameSync(publicKeyPath, backupPath);
    }

    // Generate key with empty passphrase
    await spawnAsync("ssh-keygen", [
      "-t",
      "ed25519",
      "-f",
      keyPath,
      "-N",
      "",
      "-C",
      "neatgit-generated-key",
    ]);

    return {
      success: true,
      keyPath,
      publicKeyPath,
    };
  } catch (error) {
    console.error("Error generating SSH key:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const readPublicKey = (keyPath: string) => {
  try {
    const content = fs.readFileSync(keyPath, "utf8").trim();
    return { success: true, content };
  } catch (error) {
    console.error("Error reading public key:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const isHostTrusted = async (hostname: string) => {
  try {
    if (!isValidHostname(hostname)) {
      return {
        success: false,
        error: "Invalid hostname format",
      };
    }

    const sshFolder = getSshKeysFolder();
    const knownHostsPath = path.join(sshFolder, "known_hosts");

    // If known_hosts file doesn't exist, host is not trusted
    if (!fs.existsSync(knownHostsPath)) {
      return { success: true, isTrusted: false };
    }

    // Check if hostname exists in known_hosts
    try {
      await spawnAsync("ssh-keygen", ["-F", hostname]);
      // If no error, host is found
      return { success: true, isTrusted: true };
    } catch {
      // Host not found
      return { success: true, isTrusted: false };
    }
  } catch (error) {
    console.error("Error checking SSH host:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const trustHost = async (hostname: string) => {
  try {
    if (!isValidHostname(hostname)) {
      return {
        success: false,
        error: "Invalid hostname format",
      };
    }

    const sshFolder = getSshKeysFolder();
    const knownHostsPath = path.join(sshFolder, "known_hosts");

    if (!fs.existsSync(sshFolder)) {
      fs.mkdirSync(sshFolder, { recursive: true, mode: 0o700 });
    }

    // Run ssh-keyscan to get the host key
    const { stdout } = await spawnAsync("ssh-keyscan", ["-H", hostname]);

    fs.appendFileSync(knownHostsPath, stdout);

    return { success: true };
  } catch (error) {
    console.error("Error trusting SSH host:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
