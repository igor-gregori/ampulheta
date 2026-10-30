import { useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import * as store from '@/shared/storage.js';
import { SiteIcon } from '@/shared/components/site-icon.jsx';
import { useSiteIcons } from '@/shared/hooks/use-site-icons.js';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { CHART_SITES, rankSites, shortDay, weekdayLong } from './summary.js';

function formatSite(seconds) {
  return seconds < 60 ? '< 1 min' : store.formatDuration(seconds);
}

function SiteDays({ domain, data, summary }) {
  return (
    <div className="grid min-w-32 gap-0.5">
      <p className="font-medium">{domain}</p>
      {summary.days.filter((day) => !day.future).map((d) => {
        const seconds = data.usage[d.key]?.[domain] ?? 0;
        return (
          <div key={d.key} className="flex justify-between gap-4">
            <span className="opacity-70">{d.today ? 'hoje' : shortDay(d.date)}</span>
            <span className="tabular-nums">{seconds ? formatSite(seconds) : '—'}</span>
          </div>
        );
      })}
    </div>
  );
}

function SiteRow({ domain, seconds, color, max, total, icons, details }) {
  const row = (
    <li tabIndex={0} className="grid gap-1.5 rounded-md px-1 py-1.5 outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50">
      <div className="flex items-center gap-2 text-sm">
        <SiteIcon domain={domain} icons={icons} className="size-5" />
        <span className="min-w-0 truncate">{domain}</span>
        <span className="ml-auto flex-none tabular-nums">{formatSite(seconds)}</span>
        <span className="w-9 flex-none text-right text-xs text-muted-foreground tabular-nums">
          {Math.round((seconds / total) * 100)}%
        </span>
      </div>
      <span className="h-1 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full" style={{ width: `${Math.max(1, (seconds / max) * 100)}%`, background: color }} />
      </span>
    </li>
  );
  if (!details) return row;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="left">{details}</TooltipContent>
    </Tooltip>
  );
}

// Com `day`, mostra só aquele dia; sem ele, a semana inteira.
export function SiteRanking({ data, summary, series, day, onClearDay, className }) {
  const [open, setOpen] = useState(false);
  const icons = useSiteIcons();
  const selected = day && summary.days.find((d) => d.key === day);
  const ranking = selected ? rankSites(data.usage, [selected.key]) : summary.ranking;
  const total = selected ? selected.total : summary.total;
  const colorOf = new Map(series.map((s) => [s.label, s.color]));
  const rest = ranking.slice(CHART_SITES);
  const max = ranking[0]?.[1] ?? 1;
  const count = `${ranking.length} ${ranking.length === 1 ? 'site' : 'sites'}`;

  const rows = (items) => items.map(([domain, seconds]) => (
    <SiteRow
      key={domain}
      domain={domain}
      seconds={seconds}
      color={colorOf.get(domain) ?? 'var(--chart-other)'}
      max={max}
      total={total}
      icons={icons}
      details={!selected && <SiteDays domain={domain} data={data} summary={summary} />}
    />
  ));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Sites mais usados</CardTitle>
        <CardDescription>
          {selected
            ? `${count} em ${weekdayLong.format(selected.date)}`
            : ranking.length ? `${count} nesta semana` : 'Nenhum tempo registrado nesta semana.'}
        </CardDescription>
        {selected && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={onClearDay}>
              <ArrowLeft />
              Ver semana
            </Button>
          </CardAction>
        )}
      </CardHeader>
      {ranking.length > 0 && (
        <CardContent className="flex min-h-0 flex-1 flex-col">
          <Collapsible open={open} onOpenChange={setOpen} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ol>{rows(ranking.slice(0, CHART_SITES))}</ol>
              <CollapsibleContent><ol>{rows(rest)}</ol></CollapsibleContent>
            </div>
            {rest.length > 0 && (
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="mt-3 w-full flex-none">
                  <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
                  {open ? 'Mostrar menos' : `Ver todos os ${ranking.length} sites`}
                </Button>
              </CollapsibleTrigger>
            )}
          </Collapsible>
        </CardContent>
      )}
    </Card>
  );
}
