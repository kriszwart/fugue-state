'use client';

import { useState, useEffect, useCallback } from 'react';

type Preferences = {
  autoVoice: boolean;
  theme: 'dark' | 'light' | 'auto';
  animations: boolean;
  reducedMotion: boolean;
};

const defaultPreferences: Preferences = {
  autoVoice: false,
  theme: 'dark',
  animations: true,
  reducedMotion: false
};

const STORAGE_KEY = 'fuguestate_preferences';

export function usePreferences() {
  const [preferences, setPreferencesState] = useState<Preferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferencesState({ ...defaultPreferences, ...parsed });
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading preferences:', error);
      setIsLoaded(true);
    }
  }, []);

  // Save preferences to localStorage
  const setPreferences = useCallback((newPreferences: Partial<Preferences>) => {
    setPreferencesState((prev) => {
      const updated = { ...prev, ...newPreferences };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
      return updated;
    });
  }, []);

  // Update single preference
  const updatePreference = useCallback(<K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) => {
    setPreferences({ [key]: value });
  }, [setPreferences]);

  return {
    preferences,
    setPreferences,
    updatePreference,
    isLoaded
  };
}
