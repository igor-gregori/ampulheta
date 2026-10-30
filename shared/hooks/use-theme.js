import { useSyncExternalStore } from 'react';

const { get, set, subscribe } = window.ampulhetaTheme;

export function useTheme() {
  return { theme: useSyncExternalStore(subscribe, get), setTheme: set };
}
