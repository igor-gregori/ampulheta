import { useEffect, useEffectEvent } from 'react';

// Chama `callback` quando alguma das chaves muda no chrome.storage.local.
export function useStorageChange(keys, callback) {
  const onChange = useEffectEvent(callback);
  useEffect(() => {
    const listener = (changes, area) => {
      if (area === 'local' && keys.some((key) => key in changes)) onChange();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [keys]);
}
