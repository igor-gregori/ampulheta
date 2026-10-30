import * as store from '../shared/storage.js';

// A semana do resumo vai de sábado a sexta. No sábado de manhã chega o resumo
// da semana que acabou de terminar.
const SATURDAY = 6;
// Sites com cor própria no gráfico; o resto vira "Outros".
export const CHART_SITES = 6;
const COLOR_SLOTS = 7;

const weekdayShort = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });

export const shortDay = (date) => weekdayShort.format(date).replace('.', '');
export const weekdayLong = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

export function startOfWeek(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return store.addDays(day, -((day.getDay() - SATURDAY + 7) % 7));
}

function weekDays(start) {
  return Array.from({ length: 7 }, (_, i) => store.addDays(start, i));
}

function sumDay(dayUsage = {}) {
  return Object.values(dayUsage).reduce((a, b) => a + b, 0);
}

export function summarize(data, start) {
  const todayKey = store.dayKey();
  const firstDay = Object.keys(data.usage).sort()[0] ?? todayKey;
  const days = weekDays(start).map((date) => {
    const key = store.dayKey(date);
    return {
      date,
      key,
      total: sumDay(data.usage[key]),
      exceeded: Object.keys(data.exceeded[key] ?? {}),
      future: key > todayKey,
      today: key === todayKey,
      // Dias antes do primeiro registro não entram na conta de limites.
      tracked: key <= todayKey && key >= firstDay,
    };
  });

  const elapsed = days.filter((d) => !d.future).length;
  const total = days.reduce((sum, d) => sum + d.total, 0);

  // Semana em andamento: compara com os mesmos dias da semana anterior.
  const previous = weekDays(store.addDays(start, -7))
    .slice(0, elapsed)
    .reduce((sum, date) => sum + sumDay(data.usage[store.dayKey(date)]), 0);

  const ranking = rankSites(data.usage, days.map((d) => d.key));

  return { days, elapsed, total, previous, ranking, inProgress: elapsed < 7 };
}

// Sites usados nos dias `keys`, do mais usado ao menos usado.
export function rankSites(usage, keys) {
  const sites = {};
  for (const key of keys) {
    for (const [domain, seconds] of Object.entries(usage[key] ?? {})) {
      sites[domain] = (sites[domain] ?? 0) + seconds;
    }
  }
  return Object.entries(sites)
    .filter(([, seconds]) => seconds > 0)
    .sort((a, b) => b[1] - a[1]);
}

// A cor acompanha o site, não a posição na semana: os mais usados no histórico
// têm uma cor fixa e os demais pegam uma das que sobraram.
export function assignColors(usage, domains) {
  const totals = {};
  for (const day of Object.values(usage)) {
    for (const [domain, seconds] of Object.entries(day)) {
      totals[domain] = (totals[domain] ?? 0) + seconds;
    }
  }
  const history = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);

  const colors = new Map();
  for (const domain of domains) {
    const rank = history.indexOf(domain);
    if (rank >= 0 && rank < COLOR_SLOTS) colors.set(domain, rank);
  }
  const taken = new Set(colors.values());
  const free = Array.from({ length: COLOR_SLOTS }, (_, i) => i).filter((slot) => !taken.has(slot));
  for (const domain of domains) {
    if (!colors.has(domain)) colors.set(domain, free.shift());
  }
  return colors;
}

// Séries e linhas do gráfico empilhado. O id não pode ser o domínio porque o
// Recharts lê pontos na chave como caminho de objeto.
export function chartSeries(data, summary) {
  const top = summary.ranking.slice(0, CHART_SITES).map(([domain]) => domain);
  const colors = assignColors(data.usage, top);
  const series = top.map((domain, i) => ({
    id: `s${i}`,
    label: domain,
    color: `var(--chart-${colors.get(domain) + 1})`,
  }));
  if (summary.ranking.length > CHART_SITES) {
    series.push({ id: 'other', label: 'Outros', color: 'var(--chart-other)' });
  }

  const idOf = new Map(top.map((domain, i) => [domain, `s${i}`]));
  const rows = summary.days.map((day) => {
    const row = { ...day, label: day.today ? 'hoje' : shortDay(day.date) };
    for (const [domain, seconds] of Object.entries(data.usage[day.key] ?? {})) {
      const id = idOf.get(domain) ?? 'other';
      row[id] = (row[id] ?? 0) + seconds;
    }
    return row;
  });

  return { series, rows };
}
