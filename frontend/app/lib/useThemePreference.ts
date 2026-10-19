'use client';

import { useSyncExternalStore } from 'react';

const THEME_STORAGE_KEY = 'takemeout-theme';
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      listener();
    }
  };
  window.addEventListener('storage', handleStorageChange);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', handleStorageChange);
  };
}

function getThemeSnapshot(): string {
  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

function getServerThemeSnapshot(): string {
  return 'light';
}

function setThemePreference(isDarkMode: boolean): void {
  window.localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
  listeners.forEach((listener) => listener());
}

export default function useThemePreference(): [boolean, (isDarkMode: boolean) => void] {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, getServerThemeSnapshot);
  return [theme === 'dark', setThemePreference];
}
