import * as store from '@/shared/storage.js';
import { Card, CardContent } from '@/shared/ui/card';

function Stat({ label, value, sub }) {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="space-y-1 px-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function compare({ total, previous, inProgress, elapsed }) {
  if (previous <= 0) return { value: '—', sub: 'sem dados da semana anterior' };
  const change = Math.round(((total - previous) / previous) * 100);
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  const period = inProgress ? `nos mesmos ${elapsed} dias da semana anterior` : 'na semana anterior';
  const previousText = `(${store.formatDuration(previous)})`;
  return {
    value: `${sign}${Math.abs(change)}%`,
    sub: change === 0
      ? `igual ao tempo ${period} ${previousText}`
      : `${change > 0 ? 'a mais' : 'a menos'} que ${period} ${previousText}`,
  };
}

export function Stats({ summary }) {
  const tracked = summary.days.filter((d) => d.tracked);
  const respected = tracked.filter((d) => d.exceeded.length === 0).length;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat
        label="Tempo total"
        value={store.formatDuration(summary.total)}
        sub={tracked.length ? `média de ${store.formatDuration(summary.total / tracked.length)} por dia` : 'sem registros'}
      />
      <Stat label="Comparado à semana anterior" {...compare(summary)} />
      <Stat
        label="Limites respeitados"
        value={tracked.length ? `${respected} de ${tracked.length}` : '—'}
        sub={!tracked.length
          ? 'sem registros'
          : tracked.length === 1 ? 'dia sem estourar nenhum limite' : 'dias sem estourar nenhum limite'}
      />
    </div>
  );
}
