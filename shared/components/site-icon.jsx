import { useState } from 'react';
import { cn } from '@/shared/lib/utils';

// Ícone do site, ou a inicial enquanto o background não tiver conseguido um.
// O fundo branco no tema escuro é para ícones pretos, como o do GitHub.
export function SiteIcon({ domain, icons, className }) {
  const src = icons[domain];
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return <img src={src} alt="" className={cn('size-6 flex-none rounded-md dark:bg-white dark:p-0.5', className)} onError={() => setBroken(true)} />;
  }
  return <span className={cn('monogram', className)} aria-hidden="true">{domain[0]}</span>;
}
