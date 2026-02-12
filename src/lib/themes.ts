export interface Theme {
  name: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  codeBg: string;
}

export const themes = {
  cyan: {
    name: "Cyan Ocean",
    background: "216 28% 10%",
    foreground: "210 20% 95%",
    card: "217 28% 13%",
    cardForeground: "210 20% 95%",
    popover: "217 28% 13%",
    popoverForeground: "210 20% 95%",
    primary: "187 72% 56%",
    primaryForeground: "217 28% 10%",
    secondary: "217 25% 18%",
    secondaryForeground: "210 20% 95%",
    muted: "217 25% 18%",
    mutedForeground: "215 15% 65%",
    accent: "187 72% 56%",
    accentForeground: "217 28% 10%",
    destructive: "0 72% 51%",
    destructiveForeground: "210 20% 95%",
    border: "217 20% 25%",
    input: "217 20% 25%",
    ring: "187 72% 56%",
    codeBg: "217 30% 8%",
  },
  violet: {
    name: "Violet Nebula",
    background: "270 20% 10%",
    foreground: "270 15% 95%",
    card: "270 22% 13%",
    cardForeground: "270 15% 95%",
    popover: "270 22% 13%",
    popoverForeground: "270 15% 95%",
    primary: "260 85% 70%",
    primaryForeground: "270 20% 10%",
    secondary: "270 16% 18%",
    secondaryForeground: "270 15% 95%",
    muted: "270 16% 18%",
    mutedForeground: "270 12% 65%",
    accent: "260 85% 70%",
    accentForeground: "270 20% 10%",
    destructive: "0 72% 51%",
    destructiveForeground: "270 15% 95%",
    border: "270 13% 25%",
    input: "270 13% 25%",
    ring: "260 85% 70%",
    codeBg: "270 25% 8%",
  },
  red: {
    name: "Red Lava",
    background: "5 25% 9%",
    foreground: "5 15% 95%",
    card: "5 28% 12%",
    cardForeground: "5 15% 95%",
    popover: "5 28% 12%",
    popoverForeground: "5 15% 95%",
    primary: "4 90% 50%",
    primaryForeground: "5 15% 95%",
    secondary: "5 22% 17%",
    secondaryForeground: "5 15% 95%",
    muted: "5 22% 17%",
    mutedForeground: "5 14% 65%",
    accent: "4 90% 50%",
    accentForeground: "5 15% 95%",
    destructive: "0 72% 51%",
    destructiveForeground: "5 15% 95%",
    border: "5 18% 24%",
    input: "5 18% 24%",
    ring: "4 90% 50%",
    codeBg: "5 30% 7%",
  },
  green: {
    name: "Green Forest",
    background: "150 20% 10%",
    foreground: "150 15% 95%",
    card: "150 22% 13%",
    cardForeground: "150 15% 95%",
    popover: "150 22% 13%",
    popoverForeground: "150 15% 95%",
    primary: "145 72% 50%",
    primaryForeground: "150 20% 10%",
    secondary: "150 16% 18%",
    secondaryForeground: "150 15% 95%",
    muted: "150 16% 18%",
    mutedForeground: "150 12% 65%",
    accent: "145 72% 50%",
    accentForeground: "150 20% 10%",
    destructive: "0 72% 51%",
    destructiveForeground: "150 15% 95%",
    border: "150 13% 25%",
    input: "150 13% 25%",
    ring: "145 72% 50%",
    codeBg: "150 25% 8%",
  },
  gold: {
    name: "Golden Dune",
    background: "35 20% 10%",
    foreground: "35 15% 95%",
    card: "35 22% 13%",
    cardForeground: "35 15% 95%",
    popover: "35 22% 13%",
    popoverForeground: "35 15% 95%",
    primary: "40 90% 55%",
    primaryForeground: "35 20% 10%",
    secondary: "35 16% 18%",
    secondaryForeground: "35 15% 95%",
    muted: "35 16% 18%",
    mutedForeground: "35 12% 65%",
    accent: "40 90% 55%",
    accentForeground: "35 20% 10%",
    destructive: "0 72% 51%",
    destructiveForeground: "35 15% 95%",
    border: "35 13% 25%",
    input: "35 13% 25%",
    ring: "40 90% 55%",
    codeBg: "35 25% 8%",
  },
} as const satisfies Record<string, Theme>;

export type ThemeId = keyof typeof themes;

export const DEFAULT_THEME: ThemeId = "cyan";

export const applyTheme = (themeId: ThemeId) => {
  const theme = themes[themeId];
  const root = document.documentElement;

  root.style.setProperty("--background", theme.background);
  root.style.setProperty("--foreground", theme.foreground);
  root.style.setProperty("--card", theme.card);
  root.style.setProperty("--card-foreground", theme.cardForeground);
  root.style.setProperty("--popover", theme.popover);
  root.style.setProperty("--popover-foreground", theme.popoverForeground);
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-foreground", theme.primaryForeground);
  root.style.setProperty("--secondary", theme.secondary);
  root.style.setProperty("--secondary-foreground", theme.secondaryForeground);
  root.style.setProperty("--muted", theme.muted);
  root.style.setProperty("--muted-foreground", theme.mutedForeground);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-foreground", theme.accentForeground);
  root.style.setProperty("--destructive", theme.destructive);
  root.style.setProperty("--destructive-foreground", theme.destructiveForeground);
  root.style.setProperty("--border", theme.border);
  root.style.setProperty("--input", theme.input);
  root.style.setProperty("--ring", theme.ring);
  root.style.setProperty("--code-bg", theme.codeBg);
};
