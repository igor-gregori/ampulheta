import { useEffect, useState } from 'react';
import { ChartColumnStacked, Settings2 } from 'lucide-react';
import * as store from '@/shared/storage.js';
import { useStorageChange } from '@/shared/hooks/use-storage-change.js';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Progress } from '@/shared/ui/progress';

const RING_CIRCUMFERENCE = 2 * Math.PI * 52;
const REFRESH_KEYS = ['limits', 'extensions'];

const INITIAL = {
  tabDomain: null,
  dayUsage: {},
  limits: {},
  extensions: {},
  current: null, // { domain, since } do background
  clockOffset: 0,
};

function liveUsage(state) {
  const usage = { ...state.dayUsage };
  const { current } = state;
  if (current) {
    const elapsed = (Date.now() + state.clockOffset - current.since) / 1000;
    if (elapsed > 0) usage[current.domain] = (usage[current.domain] ?? 0) + elapsed;
  }
  return usage;
}

function allowanceFor(state, limitDomain) {
  const extra = state.extensions[limitDomain] ? store.EXTENSION_SECONDS : 0;
  return store.limitForDay(state.limits, limitDomain) * 60 + extra;
}

// O que o anel mostra para a aba atual.
function ringStatus(state, usage) {
  const domain = state.tabDomain;
  if (!domain) {
    const total = Object.values(usage).reduce((a, b) => a + b, 0);
    return { main: store.formatDuration(total), sub: 'em sites hoje' };
  }
  const limitDomain = store.matchLimitDomain(domain, state.limits);
  if (!limitDomain) {
    return { main: store.formatDuration(usage[domain] ?? 0), sub: 'hoje, sem limite' };
  }
  const used = store.usedForLimit(limitDomain, usage);
  const allowance = allowanceFor(state, limitDomain);
  const over = used >= allowance;
  return {
    main: store.formatDuration(used),
    sub: over ? 'limite atingido' : `de ${Math.round(allowance / 60)} min hoje`,
    fraction: Math.min(1, used / allowance),
    tone: over ? 'stroke-destructive' : allowance - used <= store.WARNING_SECONDS ? 'stroke-warning' : 'stroke-foreground',
  };
}

function Ring({ main, sub, fraction, tone }) {
  return (
    <div className="relative size-36">
      <svg className="size-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
        <circle className="fill-none stroke-muted" strokeWidth="9" cx="60" cy="60" r="52" />
        {fraction !== undefined && (
          <circle
            className={cn('fill-none transition-[stroke-dashoffset,stroke] duration-300', tone)}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - fraction)}
            cx="60"
            cy="60"
            r="52"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <strong className={cn('font-semibold leading-tight tracking-tight tabular-nums', main.length > 6 ? 'text-xl' : 'text-2xl')}>{main}</strong>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </div>
    </div>
  );
}

function SiteItem({ domain, seconds, max, usage, state }) {
  const limitDomain = store.matchLimitDomain(domain, state.limits);
  const over = limitDomain && store.usedForLimit(limitDomain, usage) >= allowanceFor(state, limitDomain);

  return (
    <li className="grid grid-cols-[24px_1fr_auto] items-center gap-x-2.5 gap-y-1 py-1.5">
      <span className="monogram row-span-2">{domain[0]}</span>
      <span className="truncate text-sm" title={domain}>{domain}</span>
      <span className={cn('text-xs text-muted-foreground tabular-nums', over && 'text-destructive')}>
        {limitDomain === domain
          ? `${Math.round(seconds / 60)} de ${store.limitForDay(state.limits, domain)} min`
          : store.formatDuration(seconds)}
      </span>
      <Progress
        value={Math.max(3, (seconds / max) * 100)}
        className={cn('col-span-2 h-1 bg-muted', over && '[&>[data-slot=progress-indicator]]:bg-destructive')}
      />
    </li>
  );
}

function openPage(path) {
  chrome.tabs.create({ url: chrome.runtime.getURL(`dashboard/dashboard.html${path}`) });
  window.close();
}

export function App() {
  const [state, setState] = useState(INITIAL);
  const [, setTick] = useState(0);

  const load = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    let status = null;
    try {
      status = await chrome.runtime.sendMessage({ type: 'status' });
    } catch {
      // Service worker ainda subindo; mostra o que já está gravado.
    }

    const day = store.dayKey();
    const all = await store.getAll();
    setState({
      tabDomain: store.domainFromUrl(tab?.url),
      dayUsage: all.usage[day] ?? {},
      limits: all.limits,
      extensions: all.extensions[day] ?? {},
      current: status?.current ?? null,
      clockOffset: status?.now ? status.now - Date.now() : 0,
    });
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => setTick((tick) => tick + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  useStorageChange(REFRESH_KEYS, load);

  const usage = liveUsage(state);
  const domain = state.tabDomain;
  const entries = Object.entries(usage)
    .filter(([, seconds]) => seconds >= 30)
    .sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] ?? 1;
  const total = entries.reduce((sum, [, seconds]) => sum + seconds, 0);

  return (
    // O Chrome corta o popup em 600 px: a lista rola por dentro para o botão
    // do resumo ficar sempre à vista.
    <div className="flex max-h-[600px] w-[340px] flex-col">
      <header className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <img src="/icons/icon32.png" alt="" width="18" height="18" />
          Ampulheta
        </div>
        <Button variant="ghost" size="icon-sm" title="Sites e limites" aria-label="Sites e limites" onClick={() => openPage('#limites')}>
          <Settings2 />
        </Button>
      </header>

      <section className="flex flex-col items-center px-4 pt-1 pb-3" aria-live="polite">
        <Ring {...ringStatus(state, usage)} />
        <p className="mt-2 max-w-full truncate text-sm font-medium">{domain ?? 'Esta aba não é um site'}</p>
        {domain && !store.matchLimitDomain(domain, state.limits) && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => openPage(`?add=${encodeURIComponent(domain)}#limites`)}
          >
            Definir limite
          </Button>
        )}
      </section>

      <section className="flex min-h-0 flex-1 flex-col border-t px-4 pt-3">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Hoje</h2>
          <span className="text-xs text-muted-foreground tabular-nums">{entries.length ? store.formatDuration(total) : ''}</span>
        </div>
        {entries.length
          ? (
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {entries.map(([site, seconds]) => (
                <SiteItem key={site} domain={site} seconds={seconds} max={max} usage={usage} state={state} />
              ))}
            </ul>
          )
          : <p className="pb-1 text-sm text-muted-foreground">Nenhum site visitado ainda hoje.</p>}
      </section>

      <footer className="flex-none border-t p-3">
        <Button
          className="w-full"
          size="lg"
          onClick={async () => {
            await chrome.runtime.sendMessage({ type: 'open-dashboard' });
            window.close();
          }}
        >
          <ChartColumnStacked />
          Resumo da semana
        </Button>
      </footer>
    </div>
  );
}
