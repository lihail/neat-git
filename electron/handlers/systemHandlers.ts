import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../ipcChannels";
import { showItemInFolder, openInExternalEditor } from "../services/systemService";

export const registerSystemHandlers = () => {
  ipcMain.handle(IPC_CHANNELS.SYSTEM_SHOW_ITEM_IN_FOLDER, (_, fullPath: string) => {
    return showItemInFolder(fullPath);
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_IN_EXTERNAL_EDITOR, async (_, fullPath: string) => {
    return await openInExternalEditor(fullPath);
  });
};
