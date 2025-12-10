import { BrowserWindow, ipcMain } from "electron";
import { IPC_CHANNELS } from "../ipcChannels";
import {
  openSelectGitRepositoryFolderDialog,
  openSelectParentFolderDialog,
} from "../services/dialogService";

export const registerDialogHandlers = (win: BrowserWindow) => {
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_SELECT_GIT_REPOSITORY_FOLDER, async () => {
    return await openSelectGitRepositoryFolderDialog(win);
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_SELECT_PARENT_FOLDER, async () => {
    return await openSelectParentFolderDialog(win);
  });
};
