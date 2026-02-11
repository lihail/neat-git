import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../ipcChannels";
import { showFileInFileExplorer, openFileInExternalEditor } from "../services/systemService";
import { getPlatform } from "../utils/platform";

export const registerSystemHandlers = () => {
  ipcMain.handle(IPC_CHANNELS.SYSTEM_SHOW_FILE_IN_FILE_EXPLORER, (_, fullPath: string) => {
    return showFileInFileExplorer(fullPath);
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_FILE_IN_EXTERNAL_EDITOR, async (_, fullPath: string) => {
    return await openFileInExternalEditor(fullPath);
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_PLATFORM, () => {
    return getPlatform();
  });
};
