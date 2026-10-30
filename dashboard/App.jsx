import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as store from '@/shared/storage.js';
import { useStorageChange } from '@/shared/hooks/use-storage-change.js';
import { ModeToggle } from '@/shared/components/mode-toggle.jsx';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Toaster } from '@/shared/ui/sonner';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { demoData } from './demo.js';
import { chartSeries, startOfWeek, summarize } from './summary.js';
import { DayChart, DayPlot } from './DayChart.jsx';
import { Limits } from './Limits.jsx';
import { SiteRanking } from './SiteRanking.jsx';
import { Stats } from './Stats.jsx';

const HISTORY_KEYS = ['usage', 'exceeded'];
const REPOSITORY = 'https://github.com/igor-gregori/ampulheta';

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
        <div className="flex items-center gap-1">
          <nav className="flex gap-1" aria-label="Seções">
            <Button variant="ghost" size="sm" asChild><a href="#resumo">Resumo</a></Button>
            <Button variant="ghost" size="sm" asChild><a href="#limites">Sites e limites</a></Button>
          </nav>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 text-sm text-muted-foreground">
        <span>Ampulheta</span>
        <a href={REPOSITORY} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-foreground">
          <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
            <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.7.1-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.3v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3" />
          </svg>
          igor-gregori/ampulheta
        </a>
      </div>
    </footer>
  );
}

export function App() {
  const [data, setData] = useState(null);
  const [weekStart, setWeekStart] = useState(initialWeek);
  const [selectedDay, setSelectedDay] = useState(null);
  const [zoomed, setZoomed] = useState(false);

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

  const changeWeek = (start) => {
    setWeekStart(start);
    setSelectedDay(null);
  };

  const ranking = (
    <SiteRanking
      className="lg:col-span-2 lg:h-0 lg:min-h-full"
      data={data}
      summary={summary}
      series={chart.series}
      day={selectedDay}
      onClearDay={() => setSelectedDay(null)}
    />
  );

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
              <Button variant="outline" size="icon" aria-label="Semana anterior" onClick={() => changeWeek(store.addDays(weekStart, -7))}>
                <ChevronLeft />
              </Button>
              <Button variant="outline" disabled={inCurrentWeek} onClick={() => changeWeek(current)}>Esta semana</Button>
              <Button variant="outline" size="icon" aria-label="Próxima semana" disabled={weekStart >= current} onClick={() => changeWeek(store.addDays(weekStart, 7))}>
                <ChevronRight />
              </Button>
            </nav>
          </div>

          {demo && (
            <Alert><AlertDescription>Dados de exemplo, só para visualização. Nada foi gravado.</AlertDescription></Alert>
          )}

          <Stats summary={summary} />

          {/* h-0 + min-h-full: quem dá a altura da linha é o gráfico, e a lista rola por dentro. */}
          <div className="grid gap-4 lg:grid-cols-5">
            <DayChart
              className="lg:col-span-3"
              series={chart.series}
              rows={chart.rows}
              selected={selectedDay}
              onSelect={setSelectedDay}
              onZoom={() => setZoomed(true)}
            />
            {!zoomed && ranking}
          </div>
        </section>

        <Limits />
      </main>
      <Footer />

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="flex h-[90vh] flex-col sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Por dia</DialogTitle>
            <DialogDescription>{formatRange(weekStart)} · clique em um dia para ver os sites dele</DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-5 lg:overflow-visible">
            <DayPlot
              className="h-96 lg:col-span-3 lg:h-full"
              series={chart.series}
              rows={chart.rows}
              selected={selectedDay}
              onSelect={setSelectedDay}
            />
            {ranking}
          </div>
        </DialogContent>
      </Dialog>

      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
