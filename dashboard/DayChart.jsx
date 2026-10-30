import { useMemo, useState } from 'react';
import { ChevronDown, Maximize2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis, YAxis } from 'recharts';
import * as store from '@/shared/storage.js';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from '@/shared/ui/chart';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { weekdayLong } from './summary.js';

// Degraus do eixo Y, em minutos. Usa o menor que deixa no máximo 4 divisões.
const TICK_STEPS = [15, 30, 60, 120, 180, 240, 360];
const SEGMENT_GAP = 2;

function yTicks(maxSeconds) {
  const maxMinutes = maxSeconds / 60;
  const step = TICK_STEPS.find((s) => maxMinutes / s <= 4) ?? 480;
  const count = Math.max(1, Math.ceil(maxMinutes / step));
  return Array.from({ length: count + 1 }, (_, i) => i * step * 60);
}

function tickLabel(seconds) {
  const minutes = seconds / 60;
  if (minutes < 60) return minutes ? `${minutes} min` : '0';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

// Só o topo da coluna é arredondado, e o espaço entre as partes sai da
// própria parte, para a altura total continuar exata.
function Segment({ seriesId, series, peak, selected, ...props }) {
  const { x, y, width, height, payload } = props;
  if (!height) return null;
  const isTop = series.findLast((s) => payload[s.id])?.id === seriesId;
  const gap = !isTop && height > SEGMENT_GAP * 2 ? SEGMENT_GAP : 0;
  return (
    <g>
      <Rectangle
        {...props}
        y={y + gap}
        height={height - gap}
        radius={isTop ? [4, 4, 0, 0] : 0}
        fillOpacity={selected && payload.key !== selected ? 0.3 : 1}
      />
      {isTop && payload.key === peak?.key && (
        <text x={x + width / 2} y={y - 8} textAnchor="middle" className="fill-foreground text-xs tabular-nums">
          {store.formatDuration(payload.total)}
        </text>
      )}
    </g>
  );
}

function DayTick({ x, y, payload, rows, selected }) {
  const row = rows.find((r) => r.label === payload.value);
  const strong = row?.today || (selected && row?.key === selected);
  return (
    <g>
      <text x={x} y={y + 10} textAnchor="middle" className={cn('fill-muted-foreground text-xs', strong && 'fill-foreground font-medium')}>
        {payload.value}
      </text>
      {row?.exceeded.length > 0 && <circle cx={x} cy={y + 20} r={3} className="fill-destructive" />}
    </g>
  );
}

function DayTooltip({ active, payload, series }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  const parts = series
    .filter((s) => row[s.id])
    .sort((a, b) => row[b.id] - row[a.id]);

  return (
    <div className="grid min-w-44 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium">{weekdayLong.format(row.date)}</p>
      {row.future ? <p className="text-muted-foreground">Ainda não chegou.</p> : (
        <>
          {parts.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="size-2.5 rounded-[2px]" style={{ background: s.color }} />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="ml-auto pl-3 tabular-nums">{store.formatDuration(row[s.id])}</span>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t pt-1.5 font-medium">
            <span>Total</span>
            <span className="tabular-nums">{store.formatDuration(row.total)}</span>
          </div>
          {row.exceeded.length > 0 && (
            <p className="text-destructive">Limite atingido: {row.exceeded.join(', ')}</p>
          )}
        </>
      )}
    </div>
  );
}

function DayTable({ rows, onSelect }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Dia</TableHead>
          <TableHead>Tempo</TableHead>
          <TableHead>Limites</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((d) => (
          <TableRow key={d.key}>
            <TableCell className="capitalize">
              {d.total > 0
                ? <Button variant="link" size="sm" className="h-auto p-0 font-normal capitalize" onClick={() => onSelect(d.key)}>{weekdayLong.format(d.date)}</Button>
                : weekdayLong.format(d.date)}
            </TableCell>
            <TableCell className="tabular-nums">{d.future ? '—' : store.formatDuration(d.total)}</TableCell>
            <TableCell>
              {d.exceeded.length ? `atingido em ${d.exceeded.join(', ')}` : d.tracked ? 'respeitados' : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Só o gráfico: usado no cartão e, maior, na janela de zoom.
export function DayPlot({ series, rows, selected, onSelect, className }) {
  const peak = rows.reduce((best, d) => (d.total > (best?.total ?? 0) ? d : best), null);
  const ticks = yTicks(peak?.total ?? 3600);
  const config = useMemo(
    () => Object.fromEntries(series.map((s) => [s.id, { label: s.label, color: s.color }])),
    [series],
  );

  const handleClick = (state) => {
    const row = rows[Number(state?.activeTooltipIndex)];
    if (row?.total) onSelect(row.key === selected ? null : row.key);
  };

  return (
    <ChartContainer
      config={config}
      className={cn('aspect-auto w-full [&_.recharts-surface]:cursor-pointer [&_g]:outline-hidden', className)}
      role="img"
      aria-label={rows.map((d) => `${weekdayLong.format(d.date)}: ${store.formatDuration(d.total)}`).join('; ')}
    >
      <BarChart data={rows} margin={{ top: 20, right: 4, left: 0, bottom: 8 }} onClick={handleClick}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          interval={0}
          height={36}
          tick={<DayTick rows={rows} selected={selected} />}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={52}
          ticks={ticks}
          domain={[0, ticks.at(-1)]}
          tickFormatter={tickLabel}
        />
        <ChartTooltip cursor={{ fill: 'var(--muted)' }} content={<DayTooltip series={series} />} />
        {series.length > 1 && <ChartLegend itemSorter={null} content={<ChartLegendContent className="flex-wrap gap-y-1" />} />}
        {series.map((s) => (
          <Bar
            key={s.id}
            dataKey={s.id}
            stackId="day"
            fill={`var(--color-${s.id})`}
            maxBarSize={28}
            isAnimationActive={false}
            shape={<Segment seriesId={s.id} series={series} peak={peak} selected={selected} />}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

export function DayChart({ series, rows, selected, onSelect, onZoom, className }) {
  const [tableOpen, setTableOpen] = useState(false);
  const hasExceeded = rows.some((d) => d.exceeded.length);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Por dia</CardTitle>
        <CardDescription>Clique em um dia para ver os sites dele</CardDescription>
        <CardAction className="flex items-center gap-3">
          {hasExceeded && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <i className="size-2 rounded-full bg-destructive" aria-hidden="true" />limite atingido
            </span>
          )}
          <Button variant="outline" size="icon-sm" title="Ampliar gráfico" aria-label="Ampliar gráfico" onClick={onZoom}>
            <Maximize2 />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <DayPlot className="h-80" series={series} rows={rows} selected={selected} onSelect={onSelect} />

        <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
              <ChevronDown className={cn('transition-transform', tableOpen && 'rotate-180')} />
              Ver como tabela
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2"><DayTable rows={rows} onSelect={onSelect} /></CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
