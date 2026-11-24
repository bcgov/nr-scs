import { Theme } from '@carbon/react';
import { useState, useEffect, type ReactNode } from 'react';

import { type CarbonTheme } from '@/context/preference/types';
import { usePreference } from '@/context/preference/usePreference';

import { ThemeContext } from './ThemeContext';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const preferences = usePreference();
  const { updatePreferences, userPreference } = preferences;
  const [theme, setTheme] = useState<CarbonTheme | undefined>(undefined);

  // Set theme when userPreference.theme changes
  useEffect(() => {
    if (userPreference?.theme) {
      setTheme(userPreference.theme);
    }
  }, [userPreference]);

  // Keep the document theme attribute in sync with the active theme.
  useEffect(() => {
    if (theme) {
      document.documentElement.dataset.carbonTheme = theme;
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'white' ? 'g100' : 'white'));
  };

  // Sync theme changes to preferences, but only after initial load
  useEffect(() => {
    if (theme && theme !== userPreference.theme) {
      updatePreferences({ theme });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Only render Theme when theme is set
  return (
    <ThemeContext.Provider value={{ theme: theme ?? 'white', setTheme, toggleTheme }}>
      {theme ? <Theme theme={theme}>{children}</Theme> : null}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
