import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../ipcChannels";
import {
  showFileInFileExplorer,
  openFileInExternalEditor,
  getFullClonePath,
} from "../services/systemService";
import { getPlatform } from "../utils/platform";

export const registerSystemHandlers = () => {
  ipcMain.handle(
    IPC_CHANNELS.SYSTEM_SHOW_FILE_IN_FILE_EXPLORER,
    (_, repoPath: string, filePath: string) => {
      return showFileInFileExplorer(repoPath, filePath);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SYSTEM_OPEN_FILE_IN_EXTERNAL_EDITOR,
    async (_, repoPath: string, filePath: string) => {
      return await openFileInExternalEditor(repoPath, filePath);
    }
  );

  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_PLATFORM, () => {
    return getPlatform();
  });

  ipcMain.handle(
    IPC_CHANNELS.SYSTEM_GET_FULL_CLONE_PATH,
    (_, cloneDestination: string, repoName: string) => {
      return getFullClonePath(cloneDestination, repoName);
    }
  );
};
