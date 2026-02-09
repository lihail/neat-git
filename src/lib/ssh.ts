export const isHostTrusted = async (
  hostname: string
): Promise<{ success: boolean; isTrusted?: boolean; error?: string }> => {
  try {
    return await window.electronAPI.isHostTrusted(hostname);
  } catch (error) {
    console.error("Error checking if host is trusted:", error);
    throw error;
  }
};

export const trustHost = async (
  hostname: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    return await window.electronAPI.trustHost(hostname);
  } catch (error) {
    console.error("Error trusting host:", error);
    throw error;
  }
};

export const findSshKeys = async (): Promise<{
  success: boolean;
  hasKeys?: boolean;
  keys?: Array<{ name: string; privatePath: string; publicPath: string }>;
  error?: string;
}> => {
  try {
    return await window.electronAPI.findSshKeys();
  } catch (error) {
    console.error("Error finding SSH keys:", error);
    throw error;
  }
};

export const readSshPublicKey = async (
  publicKeyPath: string
): Promise<{ success: boolean; content?: string; error?: string }> => {
  try {
    return await window.electronAPI.readSshPublicKey(publicKeyPath);
  } catch (error) {
    console.error("Error reading SSH public key:", error);
    throw error;
  }
};

export const generateSshKey = async (): Promise<{
  success: boolean;
  keyPath?: string;
  publicKeyPath?: string;
  error?: string;
}> => {
  try {
    return await window.electronAPI.generateSshKey();
  } catch (error) {
    console.error("Error generating SSH key:", error);
    throw error;
  }
};
