import path from "node:path";
import fs from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export const findKeys = async () => {
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    const sshDir = path.join(homeDir, ".ssh");

    if (!fs.existsSync(sshDir)) {
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
      const privatePath = path.join(sshDir, keyType.private);
      const publicPath = path.join(sshDir, keyType.public);

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
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    const sshDir = path.join(homeDir, ".ssh");

    // Create .ssh directory if it doesn't exist
    if (!fs.existsSync(sshDir)) {
      fs.mkdirSync(sshDir, { recursive: true, mode: 0o700 });
    }

    const keyPath = path.join(sshDir, "id_ed25519");
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
    await execAsync(
      `ssh-keygen -t ed25519 -f "${keyPath}" -N "" -C "neatgit-generated-key"`,
      { encoding: "utf8" }
    );

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

export const readPublicKey = async (keyPath: string) => {
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
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    const sshDir = path.join(homeDir, ".ssh");
    const knownHostsPath = path.join(sshDir, "known_hosts");

    // If known_hosts doesn't exist, host is not trusted
    if (!fs.existsSync(knownHostsPath)) {
      return { success: true, isTrusted: false };
    }

    // Check if hostname exists in known_hosts
    // Use ssh-keygen to check (more reliable than parsing the file)
    try {
      await execAsync(`ssh-keygen -F ${hostname}`, {
        encoding: "utf8",
      });
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
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    const sshDir = path.join(homeDir, ".ssh");
    const knownHostsPath = path.join(sshDir, "known_hosts");

    if (!fs.existsSync(sshDir)) {
      fs.mkdirSync(sshDir, { recursive: true, mode: 0o700 });
    }

    // Run ssh-keyscan to get the host key
    const { stdout } = await execAsync(`ssh-keyscan -H ${hostname}`, {
      encoding: "utf8",
    });

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
