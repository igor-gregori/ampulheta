import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import * as store from '@/shared/storage.js';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { CHART_SITES, shortDay } from './summary.js';

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

function SiteRow({ domain, seconds, color, max, data, summary }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <li tabIndex={0} className="grid gap-1.5 rounded-md px-1 py-1.5 outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50">
          <div className="flex items-center gap-2 text-sm">
            <span className="size-2.5 flex-none rounded-[2px]" style={{ background: color }} aria-hidden="true" />
            <span className="min-w-0 truncate">{domain}</span>
            <span className="ml-auto flex-none tabular-nums">{formatSite(seconds)}</span>
            <span className="w-9 flex-none text-right text-xs text-muted-foreground tabular-nums">
              {Math.round((seconds / summary.total) * 100)}%
            </span>
          </div>
          <span className="h-1 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full" style={{ width: `${Math.max(1, (seconds / max) * 100)}%`, background: color }} />
          </span>
        </li>
      </TooltipTrigger>
      <TooltipContent side="left"><SiteDays domain={domain} data={data} summary={summary} /></TooltipContent>
    </Tooltip>
  );
}

export function SiteRanking({ data, summary, series, className }) {
  const [open, setOpen] = useState(false);
  const { ranking } = summary;
  const colorOf = new Map(series.map((s) => [s.label, s.color]));
  const rest = ranking.slice(CHART_SITES);
  const max = ranking[0]?.[1] ?? 1;

  const rows = (items) => items.map(([domain, seconds]) => (
    <SiteRow
      key={domain}
      domain={domain}
      seconds={seconds}
      color={colorOf.get(domain) ?? 'var(--chart-other)'}
      max={max}
      data={data}
      summary={summary}
    />
  ));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Sites mais usados</CardTitle>
        <CardDescription>
          {ranking.length
            ? `${ranking.length} ${ranking.length === 1 ? 'site' : 'sites'} nesta semana`
            : 'Nenhum tempo registrado nesta semana.'}
        </CardDescription>
      </CardHeader>
      {ranking.length > 0 && (
        <CardContent>
          <Collapsible open={open} onOpenChange={setOpen}>
            <ol>{rows(ranking.slice(0, CHART_SITES))}</ol>
            <CollapsibleContent><ol>{rows(rest)}</ol></CollapsibleContent>
            {rest.length > 0 && (
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="mt-3 w-full">
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
