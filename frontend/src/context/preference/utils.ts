import { CARBON_THEMES, type CarbonTheme, type UserPreference } from './types';

const USER_PREFERENCE_STORAGE_KEY = 'userPreference';

export const initialValue: UserPreference = {
  theme: 'white',
};

const getStorage = (): Storage | null => {
  if (globalThis.localStorage == null) {
    return null;
  }

  return globalThis.localStorage;
};

const isCarbonTheme = (value: unknown): value is CarbonTheme => {
  return typeof value === 'string' && CARBON_THEMES.includes(value as CarbonTheme);
};

const parseStoredPreference = (rawPreference: string | null): UserPreference | null => {
  if (!rawPreference) {
    return null;
  }

  try {
    const parsedPreference = JSON.parse(rawPreference) as Partial<UserPreference>;

    if (!parsedPreference || typeof parsedPreference !== 'object' || !isCarbonTheme(parsedPreference.theme)) {
      return null;
    }

    return {
      ...initialValue,
      ...parsedPreference,
      theme: parsedPreference.theme,
    };
  } catch {
    return null;
  }
};

const loadUserPreference = async (): Promise<UserPreference> => {
  const storedPreference = parseStoredPreference(getStorage()?.getItem(USER_PREFERENCE_STORAGE_KEY) ?? null);
  if (storedPreference) {
    return storedPreference;
  }

  return await saveUserPreference(initialValue);
};

const saveUserPreference = async (preference: Partial<UserPreference>): Promise<UserPreference> => {
  const currentPreferences =
    parseStoredPreference(getStorage()?.getItem(USER_PREFERENCE_STORAGE_KEY) ?? null) ?? initialValue;
  const mergedPreferences = {
    ...currentPreferences,
    ...preference,
  };
  const updatedPreferences: UserPreference = {
    ...mergedPreferences,
    theme: isCarbonTheme(mergedPreferences.theme) ? mergedPreferences.theme : initialValue.theme,
  };

  getStorage()?.setItem(USER_PREFERENCE_STORAGE_KEY, JSON.stringify(updatedPreferences));
  return updatedPreferences;
};

export { loadUserPreference, saveUserPreference };
