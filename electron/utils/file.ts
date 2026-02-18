import { getPlatform } from "./platform";

export const getUserHomeFolder = () => {
  const platform = getPlatform();
  if (platform === "win") {
    return process.env.USERPROFILE || "";
  }
  if (platform === "mac") {
    return process.env.HOME || "";
  }
  return "";
};
