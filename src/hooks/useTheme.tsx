import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { applyTheme, DEFAULT_THEME, themes, type ThemeId } from "@/lib/themes";
import { getTheme, saveTheme } from "@/lib/localStorage";

interface ThemeContextValue {
  themeId: ThemeId;
  setThemeId: (themeId: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const loadAndApplySavedTheme = (): ThemeId => {
  const saved = getTheme();
  const id = saved && saved in themes ? (saved as ThemeId) : DEFAULT_THEME;
  applyTheme(id);
  return id;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeId, setThemeId] = useState<ThemeId>(loadAndApplySavedTheme);

  useEffect(() => {
    applyTheme(themeId);
    saveTheme(themeId);
  }, [themeId]);

  return <ThemeContext.Provider value={{ themeId, setThemeId }}>{children}</ThemeContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
