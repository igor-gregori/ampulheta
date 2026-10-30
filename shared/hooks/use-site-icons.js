import { useEffect, useState } from 'react';
import * as store from '@/shared/storage.js';
import { useStorageChange } from '@/shared/hooks/use-storage-change.js';

const ICON_KEYS = ['siteIcons'];

export function useSiteIcons() {
  const [icons, setIcons] = useState({});
  const refresh = () => store.getSiteIcons().then(setIcons);
  useEffect(() => { refresh(); }, []);
  useStorageChange(ICON_KEYS, refresh);
  return icons;
}
