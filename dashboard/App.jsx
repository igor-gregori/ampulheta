import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as store from '@/shared/storage.js';
import { useStorageChange } from '@/shared/hooks/use-storage-change.js';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Toaster } from '@/shared/ui/sonner';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { demoData } from './demo.js';
import { chartSeries, startOfWeek, summarize } from './summary.js';
import { DayChart } from './DayChart.jsx';
import { Limits } from './Limits.jsx';
import { SiteRanking } from './SiteRanking.jsx';
import { Stats } from './Stats.jsx';

const HISTORY_KEYS = ['usage', 'exceeded'];

const params = new URLSearchParams(location.search);
const demo = params.has('demo');

const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });

function formatRange(start) {
  const end = store.addDays(start, 6);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} a ${end.getDate()} de ${monthName.format(end)}`;
  }
  return `${dayMonth.format(start)} a ${dayMonth.format(end)}`;
}

function initialWeek() {
  const week = params.get('week');
  const current = startOfWeek(new Date());
  if (week === 'last') return store.addDays(current, -7);
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) {
    const start = startOfWeek(store.parseDayKey(week));
    return start > current ? current : start;
  }
  return current;
}

async function loadData() {
  if (demo) return demoData();
  // Pede ao background para gravar o tempo que ainda não foi salvo.
  try {
    await chrome.runtime.sendMessage({ type: 'status' });
  } catch {
    // Sem resposta, usa o que já está gravado.
  }
  return store.getAll();
}

function Header() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <a href="#resumo" className="flex items-center gap-2.5 font-semibold">
          <img src="/icons/icon48.png" alt="" width="24" height="24" />
          Ampulheta
        </a>
        <nav className="flex gap-1" aria-label="Seções">
          <Button variant="ghost" size="sm" asChild><a href="#resumo">Resumo</a></Button>
          <Button variant="ghost" size="sm" asChild><a href="#limites">Sites e limites</a></Button>
        </nav>
      </div>
    </header>
  );
}

export function App() {
  const [data, setData] = useState(null);
  const [weekStart, setWeekStart] = useState(initialWeek);

  useEffect(() => { loadData().then(setData); }, []);
  useStorageChange(HISTORY_KEYS, () => { if (!demo) store.getAll().then(setData); });

  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set('week', store.dayKey(weekStart));
    history.replaceState(null, '', url);
  }, [weekStart]);

  const summary = useMemo(() => data && summarize(data, weekStart), [data, weekStart]);
  const chart = useMemo(() => data && chartSeries(data, summary), [data, summary]);

  if (!data) return null;

  const current = startOfWeek(new Date());
  const inCurrentWeek = weekStart.getTime() === current.getTime();

  return (
    <TooltipProvider>
      <Header />
      <main className="mx-auto max-w-5xl space-y-12 px-4 pt-8 pb-16">
        <section id="resumo" className="scroll-mt-20 space-y-4" aria-labelledby="resumo-titulo">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 id="resumo-titulo" className="text-2xl font-semibold tracking-tight">Resumo da semana</h1>
              <p className="text-sm text-muted-foreground">
                {formatRange(weekStart)}{summary.inProgress ? ' · em andamento' : ''}
              </p>
            </div>
            <nav className="flex gap-1.5" aria-label="Trocar semana">
              <Button variant="outline" size="icon" aria-label="Semana anterior" onClick={() => setWeekStart(store.addDays(weekStart, -7))}>
                <ChevronLeft />
              </Button>
              <Button variant="outline" disabled={inCurrentWeek} onClick={() => setWeekStart(current)}>Esta semana</Button>
              <Button variant="outline" size="icon" aria-label="Próxima semana" disabled={weekStart >= current} onClick={() => setWeekStart(store.addDays(weekStart, 7))}>
                <ChevronRight />
              </Button>
            </nav>
          </div>

          {demo && (
            <Alert><AlertDescription>Dados de exemplo, só para visualização. Nada foi gravado.</AlertDescription></Alert>
          )}

          <Stats summary={summary} />

          <div className="grid items-start gap-4 lg:grid-cols-5">
            <DayChart className="lg:col-span-3" series={chart.series} rows={chart.rows} />
            <SiteRanking className="lg:col-span-2" data={data} summary={summary} series={chart.series} />
          </div>
        </section>

        <Limits />
      </main>
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
