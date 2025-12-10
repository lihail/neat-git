import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../ipcChannels";
import {
  findKeys,
  generateKey,
  isHostTrusted,
  readPublicKey,
  trustHost,
} from "../services/sshService";

export const registerSshHandlers = () => {
  ipcMain.handle(IPC_CHANNELS.SSH_FIND_KEYS, async () => {
    return await findKeys();
  });

  ipcMain.handle(IPC_CHANNELS.SSH_GENERATE_KEY, async () => {
    return await generateKey();
  });

  ipcMain.handle(
    IPC_CHANNELS.SSH_READ_PUBLIC_KEY,
    async (_, keyPath: string) => {
      return await readPublicKey(keyPath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SSH_IS_HOST_TRUSTED,
    async (_, hostname: string) => {
      return await isHostTrusted(hostname);
    }
  );

  ipcMain.handle(IPC_CHANNELS.SSH_TRUST_HOST, async (_, hostname: string) => {
    return await trustHost(hostname);
  });
};
