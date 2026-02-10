type Platform = "mac" | "win";

export const getPlatform = (): Platform => {
  const rawPlatform = process.platform;
  return rawPlatform === "darwin" ? "mac" : "win";
};
