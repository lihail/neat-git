type Platform = "mac" | "win";

export const getPlatform = (): Platform => {
  const rawPlatform = process.platform;
  if (rawPlatform === "darwin") {
    return "mac";
  } else if (rawPlatform === "win32") {
    return "win";
  }
  // Default to Windows arbitrarily
  return "win";
};
