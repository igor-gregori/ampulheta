import * as store from '../shared/storage.js';

// A semana do resumo vai de sábado a sexta. No sábado de manhã chega o resumo
// da semana que acabou de terminar.
const SATURDAY = 6;
const TOP_SITES = 8;

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const demo = params.has('demo');

const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
const weekdayShort = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const weekdayLong = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

let data = null;
let weekStart = null;

// ---------- datas ----------

function startOfWeek(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return store.addDays(day, -((day.getDay() - SATURDAY + 7) % 7));
}

function weekDays(start) {
  return Array.from({ length: 7 }, (_, i) => store.addDays(start, i));
}

function formatRange(start) {
  const end = store.addDays(start, 6);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} a ${end.getDate()} de ${monthName.format(end)}`;
  }
  return `${dayMonth.format(start)} a ${dayMonth.format(end)}`;
}

const shortDay = (date) => weekdayShort.format(date).replace('.', '');

// ---------- dados ----------

function sumDay(dayUsage = {}) {
  return Object.values(dayUsage).reduce((a, b) => a + b, 0);
}

function summarize(start) {
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

  const sites = {};
  for (const d of days) {
    for (const [domain, seconds] of Object.entries(data.usage[d.key] ?? {})) {
      sites[domain] = (sites[domain] ?? 0) + seconds;
    }
  }
  const ranking = Object.entries(sites)
    .filter(([, seconds]) => seconds >= 60)
    .sort((a, b) => b[1] - a[1]);

  return { days, elapsed, total, previous, ranking, inProgress: elapsed < 7 };
}

// ---------- números ----------

function renderStats(summary) {
  const { total, previous, days, inProgress, elapsed } = summary;
  const tracked = days.filter((d) => d.tracked);

  $('stat-total').textContent = store.formatDuration(total);
  $('stat-total-sub').textContent = tracked.length
    ? `média de ${store.formatDuration(total / tracked.length)} por dia`
    : 'sem registros';

  if (previous > 0) {
    const change = Math.round(((total - previous) / previous) * 100);
    const sign = change > 0 ? '+' : change < 0 ? '−' : '';
    $('stat-compare').textContent = `${sign}${Math.abs(change)}%`;
    const period = inProgress
      ? `nos mesmos ${elapsed} dias da semana anterior`
      : 'na semana anterior';
    const previousText = `(${store.formatDuration(previous)})`;
    $('stat-compare-sub').textContent = change === 0
      ? `igual ao tempo ${period} ${previousText}`
      : `${change > 0 ? 'a mais' : 'a menos'} que ${period} ${previousText}`;
  } else {
    $('stat-compare').textContent = '—';
    $('stat-compare-sub').textContent = 'sem dados da semana anterior';
  }

  if (tracked.length) {
    const respected = tracked.filter((d) => d.exceeded.length === 0).length;
    $('stat-respected').textContent = `${respected} de ${tracked.length}`;
    $('stat-respected-sub').textContent = tracked.length === 1
      ? 'dia sem estourar nenhum limite'
      : 'dias sem estourar nenhum limite';
  } else {
    $('stat-respected').textContent = '—';
    $('stat-respected-sub').textContent = 'sem registros';
  }
}

// ---------- gráfico por dia ----------

function renderDays(summary) {
  const { days } = summary;
  const max = Math.max(...days.map((d) => d.total), 1);
  const peak = days.reduce((best, d) => (d.total > (best?.total ?? 0) ? d : best), null);
  const chart = $('day-chart');

  chart.setAttribute(
    'aria-label',
    days.map((d) => `${weekdayLong.format(d.date)}: ${store.formatDuration(d.total)}`).join('; '),
  );

  chart.replaceChildren(
    ...days.map((d) => {
      const column = document.createElement('button');
      column.type = 'button';
      column.className = 'day';
      if (d.today) column.classList.add('is-today');

      const plot = document.createElement('div');
      plot.className = 'day-plot';

      // Só o pico ganha rótulo; o resto fica no tooltip e na tabela.
      if (peak && d === peak) {
        const value = document.createElement('span');
        value.className = 'day-value tabular';
        value.textContent = store.formatDuration(d.total);
        plot.append(value);
      }

      const col = document.createElement('div');
      col.className = 'day-col';
      if (d.future) col.classList.add('future');
      else if (d.today) col.classList.add('today');
      // Desconta o espaço do rótulo do pico para a coluna não estourar a área.
      col.style.height = d.total ? `calc((100% - 22px) * ${d.total / max})` : '2px';
      plot.append(col);

      const label = document.createElement('div');
      label.className = 'day-label';
      label.append(d.today ? 'hoje' : shortDay(d.date));
      if (d.exceeded.length) {
        const dot = document.createElement('i');
        dot.className = 'dot-over';
        dot.setAttribute('aria-hidden', 'true');
        label.append(dot);
      }

      column.append(plot, label);
      bindTooltip(column, () => dayTooltip(d));
      return column;
    }),
  );

  $('days-legend').hidden = !days.some((d) => d.exceeded.length);

  $('day-table').tBodies[0].replaceChildren(
    ...days.map((d) => {
      const row = document.createElement('tr');
      const cells = [
        weekdayLong.format(d.date),
        d.future ? '—' : store.formatDuration(d.total),
        d.exceeded.length ? `atingido em ${d.exceeded.join(', ')}` : d.tracked ? 'respeitados' : '—',
      ];
      for (const text of cells) {
        const cell = document.createElement('td');
        cell.textContent = text;
        row.append(cell);
      }
      return row;
    }),
  );
}

function dayTooltip(d) {
  const box = document.createDocumentFragment();
  const title = document.createElement('strong');
  title.textContent = weekdayLong.format(d.date);
  box.append(title);

  if (d.future) {
    box.append('Ainda não chegou.');
    return box;
  }

  const total = document.createElement('div');
  total.className = 'row';
  total.innerHTML = '<span class="muted">Total</span><span class="tabular"></span>';
  total.lastChild.textContent = store.formatDuration(d.total);
  box.append(total);

  const top = Object.entries(data.usage[d.key] ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  for (const [domain, seconds] of top) {
    const row = document.createElement('div');
    row.className = 'row';
    const name = document.createElement('span');
    name.className = 'muted';
    name.textContent = domain;
    const value = document.createElement('span');
    value.className = 'tabular';
    value.textContent = store.formatDuration(seconds);
    row.append(name, value);
    box.append(row);
  }

  if (d.exceeded.length) {
    const over = document.createElement('div');
    over.className = 'over';
    over.innerHTML = '<i class="dot-over" aria-hidden="true"></i>';
    over.append(`Limite atingido: ${d.exceeded.join(', ')}`);
    box.append(over);
  }
  return box;
}

// ---------- ranking ----------

function renderRanking(summary) {
  const { ranking, total } = summary;
  let rows = ranking.slice(0, TOP_SITES);
  const rest = ranking.slice(TOP_SITES);
  if (rest.length) {
    rows = [...rows, [`Outros (${rest.length})`, rest.reduce((sum, [, s]) => sum + s, 0), true]];
  }
  const max = Math.max(...rows.map(([, seconds]) => seconds), 1);

  $('ranking-empty').hidden = rows.length > 0;
  $('sites-count').textContent = ranking.length
    ? `${ranking.length} ${ranking.length === 1 ? 'site' : 'sites'}`
    : '';

  $('ranking').replaceChildren(
    ...rows.map(([domain, seconds, isOther]) => {
      const item = document.createElement('li');
      item.className = 'rank';
      item.tabIndex = 0;
      if (isOther) item.classList.add('other');

      const mono = document.createElement('span');
      mono.className = 'monogram';
      mono.textContent = isOther ? '…' : domain[0];

      const name = document.createElement('span');
      name.className = 'rank-name';
      name.textContent = domain;

      const bar = document.createElement('div');
      bar.className = 'rank-bar';
      const fill = document.createElement('span');
      fill.className = 'rank-fill';
      // Deixa espaço para o rótulo na ponta da maior barra.
      fill.style.width = `calc((100% - 120px) * ${seconds / max})`;
      const value = document.createElement('span');
      value.className = 'rank-value tabular';
      value.textContent = store.formatDuration(seconds);
      const share = document.createElement('span');
      share.className = 'muted';
      share.textContent = `${Math.round((seconds / total) * 100)}%`;
      value.append(share);
      bar.append(fill, value);

      item.append(mono, name, bar);
      bindTooltip(item, () => siteTooltip(domain, isOther, summary));
      return item;
    }),
  );
}

function siteTooltip(domain, isOther, summary) {
  const box = document.createDocumentFragment();
  const title = document.createElement('strong');
  title.textContent = domain;
  box.append(title);
  if (isOther) {
    box.append('Sites fora do top 8, somados.');
    return box;
  }
  for (const d of summary.days.filter((day) => !day.future)) {
    const seconds = data.usage[d.key]?.[domain] ?? 0;
    const row = document.createElement('div');
    row.className = 'row';
    const name = document.createElement('span');
    name.className = 'muted';
    name.textContent = d.today ? 'hoje' : shortDay(d.date);
    const value = document.createElement('span');
    value.className = 'tabular';
    value.textContent = seconds ? store.formatDuration(seconds) : '—';
    row.append(name, value);
    box.append(row);
  }
  return box;
}

// ---------- tooltip ----------

const tooltip = $('tooltip');

function bindTooltip(element, build) {
  const show = () => {
    tooltip.replaceChildren(build());
    tooltip.hidden = false;
    const rect = element.getBoundingClientRect();
    const tip = tooltip.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tip.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tip.width - 8));
    let top = rect.top - tip.height - 8;
    if (top < 8) top = rect.bottom + 8;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };
  const hide = () => { tooltip.hidden = true; };
  element.addEventListener('mouseenter', show);
  element.addEventListener('focus', show);
  element.addEventListener('mouseleave', hide);
  element.addEventListener('blur', hide);
}

window.addEventListener('scroll', () => { tooltip.hidden = true; }, { passive: true });

// ---------- navegação ----------

function render() {
  const current = startOfWeek(new Date());
  const summary = summarize(weekStart);
  $('range').textContent = `${formatRange(weekStart)}${summary.inProgress ? ' · em andamento' : ''}`;
  $('next-week').disabled = weekStart >= current;
  $('this-week').disabled = weekStart.getTime() === current.getTime();
  renderStats(summary);
  renderDays(summary);
  renderRanking(summary);

  const url = new URL(location.href);
  url.searchParams.set('week', store.dayKey(weekStart));
  history.replaceState(null, '', url);
}

function goTo(start) {
  weekStart = start;
  tooltip.hidden = true;
  render();
}

$('prev-week').addEventListener('click', () => goTo(store.addDays(weekStart, -7)));
$('next-week').addEventListener('click', () => goTo(store.addDays(weekStart, 7)));
$('this-week').addEventListener('click', () => goTo(startOfWeek(new Date())));

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

// ---------- dados de exemplo (?demo) ----------

function demoData() {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const sites = {
    'youtube.com': 3200, 'github.com': 2600, 'docs.google.com': 1900, 'reddit.com': 1300,
    'instagram.com': 1100, 'wikipedia.org': 700, 'g1.globo.com': 600, 'stackoverflow.com': 500,
    'mail.google.com': 450, 'linkedin.com': 300, 'netflix.com': 260,
  };
  const usage = {};
  const exceeded = {};
  const today = new Date();
  for (let i = 27; i >= 0; i--) {
    const date = store.addDays(today, -i);
    const key = store.dayKey(date);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const scale = i === 0 ? 0.45 : 1;
    usage[key] = {};
    for (const [domain, base] of Object.entries(sites)) {
      if (random() < 0.2) continue;
      const boost = weekend && /youtube|netflix|instagram|reddit/.test(domain) ? 1.6 : 1;
      usage[key][domain] = Math.round(base * boost * scale * (0.4 + random()));
    }
    if (usage[key]['youtube.com'] >= 3600) {
      usage[key]['youtube.com'] = 3600;
      exceeded[key] = { 'youtube.com': true };
    }
  }
  return { usage, exceeded, limits: { 'youtube.com': 60, 'instagram.com': 30 } };
}

// ---------- início ----------

async function load() {
  if (demo) {
    data = demoData();
    $('demo-note').hidden = false;
  } else {
    // Pede ao background para gravar o tempo que ainda não foi salvo.
    try {
      await chrome.runtime.sendMessage({ type: 'status' });
    } catch {
      // Sem resposta, usa o que já está gravado.
    }
    data = await store.getAll();
  }
  render();
}

weekStart = initialWeek();
load();
