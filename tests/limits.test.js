// Limites por dia da semana e dados do resumo.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeChrome } from './fake-chrome.js';

const chrome = createFakeChrome();
globalThis.chrome = chrome;

const store = await import('../shared/storage.js');
const { assignColors, chartSeries, summarize, startOfWeek } = await import('../dashboard/summary.js');

// 2026-10-24 é sábado, 2026-10-25 é domingo e 2026-10-26 é segunda.
const SATURDAY = '2026-10-24';
const SUNDAY = '2026-10-25';
const MONDAY = '2026-10-26';

test('limite simples vale para todos os dias', () => {
  const limits = { 'youtube.com': 60 };
  assert.equal(store.limitForDay(limits, 'youtube.com', SATURDAY), 60);
  assert.equal(store.limitForDay(limits, 'youtube.com', MONDAY), 60);
});

test('dias próprios entram no lugar do limite padrão', async () => {
  await chrome.storage.local.set({ limits: { 'youtube.com': 60 } });
  await store.setDayLimit('youtube.com', 6, 120);
  await store.setDayLimit('youtube.com', 0, 90);

  const limits = await store.getLimits();
  assert.equal(store.limitForDay(limits, 'youtube.com', SATURDAY), 120);
  assert.equal(store.limitForDay(limits, 'youtube.com', SUNDAY), 90);
  assert.equal(store.limitForDay(limits, 'youtube.com', MONDAY), 60);
  assert.equal(await store.allowanceSeconds('youtube.com', SATURDAY), 120 * 60);

  await store.markExtension('youtube.com', 5, SATURDAY);
  assert.equal(await store.allowanceSeconds('youtube.com', SATURDAY), 125 * 60);
});

test('mudar o limite padrão mantém os dias próprios', async () => {
  await store.setLimit('youtube.com', 30);
  const limits = await store.getLimits();
  assert.equal(store.limitForDay(limits, 'youtube.com', SATURDAY), 120);
  assert.equal(store.limitForDay(limits, 'youtube.com', MONDAY), 30);
});

test('sem dias próprios o limite volta a ser um número', async () => {
  await store.setDayLimit('youtube.com', 6, null);
  await store.setDayLimit('youtube.com', 0, null);
  assert.deepEqual(await store.getLimits(), { 'youtube.com': 30 });
});

function week(usage) {
  const data = { usage, exceeded: {}, limits: {} };
  return { data, summary: summarize(data, startOfWeek(store.parseDayKey(SATURDAY))) };
}

test('o gráfico separa cada dia por site e junta o resto em Outros', () => {
  const usage = {
    [SATURDAY]: { 'a.com': 700, 'b.com': 600, 'c.com': 500, 'd.com': 400, 'e.com': 300, 'f.com': 200, 'g.com': 100 },
    [SUNDAY]: { 'a.com': 50, 'g.com': 40, 'h.com': 30 },
  };
  const { data, summary } = week(usage);
  const { series, rows } = chartSeries(data, summary);

  assert.deepEqual(series.map((s) => s.label), ['a.com', 'b.com', 'c.com', 'd.com', 'e.com', 'f.com', 'Outros']);
  assert.equal(rows[0].date, summary.days[0].date);
  assert.equal(rows[0].other, 100);
  assert.equal(rows[1].other, 70);
  assert.equal(rows[1].s0, 50);
  assert.equal(rows[2].s0, undefined);

  for (const [i, day] of summary.days.entries()) {
    const stacked = series.reduce((sum, s) => sum + (rows[i][s.id] ?? 0), 0);
    assert.equal(stacked, day.total, 'as partes somam o total do dia');
  }
});

test('o ranking traz todos os sites usados, mesmo os de poucos segundos', () => {
  const { summary } = week({ [SATURDAY]: { 'a.com': 700, 'rapido.com': 12 } });
  assert.deepEqual(summary.ranking.map(([domain]) => domain), ['a.com', 'rapido.com']);
});

test('a cor segue o site entre semanas, sem repetir dentro da mesma', () => {
  const usage = { '2026-10-01': { 'a.com': 9000, 'b.com': 8000 }, [SATURDAY]: { 'b.com': 900, 'novo.com': 800 } };
  const colors = assignColors(usage, ['b.com', 'novo.com']);
  assert.equal(colors.get('b.com'), assignColors(usage, ['a.com', 'b.com']).get('b.com'));
  assert.notEqual(colors.get('novo.com'), colors.get('b.com'));

  const crowded = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`s${i}.com`, 1000 - i]));
  const domains = ['s8.com', 's7.com', 's6.com', 's5.com', 's4.com', 's3.com'];
  const slots = domains.map((d) => assignColors({ [SATURDAY]: crowded }, domains).get(d));
  assert.equal(new Set(slots).size, domains.length);
  assert.ok(slots.every((slot) => slot >= 0 && slot < 7));
});
