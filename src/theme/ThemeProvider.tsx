import { createContext, useContext, useState, type ReactNode, type CSSProperties } from 'react';
import { readableOn } from './contrast';

export interface TeamTokens {
  primary: string;
  secondary: string;
  tertiary: string;
  /** Explicit text-on-primary. Auto-computed from primary if omitted. */
  onPrimary?: string;
  /** Explicit text-on-secondary. Auto-computed from secondary if omitted. */
  onSecondary?: string;
}

interface ThemeContextValue {
  tokens: TeamTokens;
  setTeam: (tokens: TeamTokens) => void;
  clearTeam: () => void;
}

const DEFAULT_TOKENS: TeamTokens = {
  primary: '#14161a',
  secondary: '#f3efe3',
  tertiary: '#14161a',
  onPrimary: '#ffffff',
  onSecondary: '#1a1a1a',
};

const ThemeContext = createContext<ThemeContextValue>({
  tokens: DEFAULT_TOKENS,
  setTeam: () => {},
  clearTeam: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<TeamTokens>(DEFAULT_TOKENS);

  function setTeam(next: TeamTokens) {
    setTokens(next);
  }

  function clearTeam() {
    setTokens(DEFAULT_TOKENS);
  }

  const onPrimary = tokens.onPrimary ?? readableOn(tokens.primary);
  const onSecondary = tokens.onSecondary ?? readableOn(tokens.secondary);

  const cssVars = {
    '--team-primary': tokens.primary,
    '--team-secondary': tokens.secondary,
    '--team-tertiary': tokens.tertiary,
    '--team-on-primary': onPrimary,
    '--team-on-secondary': onSecondary,
  } as CSSProperties;

  return (
    <ThemeContext.Provider value={{ tokens, setTeam, clearTeam }}>
      <div style={cssVars} className="contents">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
