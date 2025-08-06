import { useTheme as useNextTheme } from 'next-themes';

export type Theme = 'dark' | 'light' | 'system';

export const useTheme = () => {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme();

  return {
    theme: theme as Theme,
    setTheme: (theme: Theme) => setTheme(theme),
    resolvedTheme: resolvedTheme as 'dark' | 'light' | undefined,
    systemTheme: systemTheme as 'dark' | 'light' | undefined,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isSystem: theme === 'system',
  };
};