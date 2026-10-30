// Testes do service worker com um chrome.* falso.
// Rode com: npm test

import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeChrome } from './fake-chrome.js';

// Quarta-feira, 21/10/2026, 10:00 (horário local).
const START = new Date(2026, 9, 21, 10, 0, 0);
mock.timers.enable({ apis: ['Date'], now: START.getTime() });

const chrome = createFakeChrome();
globalThis.chrome = chrome;

// O _favicon do Chrome: um ícone por página e um globo para o que não conhece.
const favicons = { 'https://www.youtube.com/watch?v=abc': 'yt', 'https://github.com/igor': 'gh' };
globalThis.fetch = async (url) => new Response(favicons[new URL(url).searchParams.get('pageUrl')] ?? 'globo', {
  headers: { 'content-type': 'image/png' },
});

const store = await import('../shared/storage.js');
await import('../background.js');

const settle = async () => {
  for (let i = 0; i < 50; i++) await new Promise((resolve) => setImmediate(resolve));
};
const advance = (seconds) => mock.timers.tick(seconds * 1000);
const tick = async () => {
  await chrome.alarms.onAlarm.fire({ name: 'tick' });
  await settle();
};
// Avança o relógio disparando o alarme de 1 min, como o Chrome faria.
const run = async (seconds) => {
  while (seconds > 0) {
    const step = Math.min(60, seconds);
    advance(step);
    await tick();
    seconds -= step;
  }
};
const usageToday = () => chrome.storage.local.items().usage?.[store.dayKey()] ?? {};

await settle();

test('instalação cria limite padrão e alarmes', () => {
  assert.deepEqual(chrome.storage.local.items().limits, { 'youtube.com': 60 });
  assert.equal(chrome.env.alarms.get('tick').periodInMinutes, 1);
  const weekly = new Date(chrome.env.alarms.get('weekly-summary').when);
  assert.equal(weekly.getDay(), 6);
  assert.equal(weekly.getHours(), 9);
  assert.equal(store.dayKey(weekly), '2026-10-24');
});

test('conta o tempo da aba ativa e agrupa www. no domínio', async () => {
  advance(30);
  await tick();
  assert.equal(usageToday()['youtube.com'], 30);
});

test('selo mostra o tempo no site, por aba', async () => {
  assert.equal(chrome.env.badges.get(1).text, '0m');
  assert.equal(store.formatBadge(38 * 60 + 59), '38m');
  assert.equal(store.formatBadge(65 * 60), '1:05');
  assert.equal(store.formatBadge(125 * 60), '2:05');
});

test('guarda o ícone do site e ignora o globo genérico', async () => {
  const icons = chrome.storage.local.items().siteIcons;
  assert.equal(icons['youtube.com'], `data:image/png;base64,${btoa('yt')}`);

  chrome.env.tabs[0].url = 'https://sem-icone.com/';
  await chrome.tabs.onUpdated.fire(1, { url: chrome.env.tabs[0].url }, chrome.env.tabs[0]);
  await settle();
  assert.equal('sem-icone.com' in chrome.storage.local.items().siteIcons, false);

  chrome.env.tabs[0].url = 'https://www.youtube.com/watch?v=abc';
  await chrome.tabs.onUpdated.fire(1, { url: chrome.env.tabs[0].url }, chrome.env.tabs[0]);
  await settle();
});

test('m.youtube.com conta como youtube.com', async () => {
  chrome.env.tabs[0].url = 'https://m.youtube.com/';
  await chrome.tabs.onUpdated.fire(1, { url: chrome.env.tabs[0].url }, chrome.env.tabs[0]);
  await settle();
  advance(20);
  await tick();
  assert.equal(usageToday()['youtube.com'], 50);
});

test('não conta com a janela fora de foco', async () => {
  chrome.env.focused = false;
  await chrome.windows.onFocusChanged.fire(-1);
  await settle();
  advance(60);
  await tick();
  assert.equal(usageToday()['youtube.com'], 50);
  chrome.env.focused = true;
  await chrome.windows.onFocusChanged.fire(1);
  await settle();
});

test('ocioso não conta, a menos que a aba esteja tocando áudio', async () => {
  chrome.env.idleState = 'idle';
  await chrome.idle.onStateChanged.fire('idle');
  await settle();
  advance(60);
  await tick();
  assert.equal(usageToday()['youtube.com'], 50);

  chrome.env.tabs[0].audible = true;
  await chrome.tabs.onUpdated.fire(1, { audible: true }, chrome.env.tabs[0]);
  await settle();
  advance(40);
  await tick();
  assert.equal(usageToday()['youtube.com'], 90);

  chrome.env.idleState = 'locked';
  await chrome.idle.onStateChanged.fire('locked');
  await settle();
  advance(60);
  await tick();
  assert.equal(usageToday()['youtube.com'], 90);

  chrome.env.idleState = 'active';
  chrome.env.tabs[0].audible = false;
  await chrome.idle.onStateChanged.fire('active');
  await settle();
});

test('não soma mais que 2 min de uma vez (computador dormindo)', async () => {
  advance(3600);
  await tick();
  assert.equal(usageToday()['youtube.com'], 90 + 120);
});

test('outros sites são contados separadamente', async () => {
  chrome.env.tabs[0].url = 'https://github.com/igor';
  await chrome.tabs.onActivated.fire({ tabId: 1 });
  await settle();
  advance(45);
  await tick();
  assert.equal(usageToday()['github.com'], 45);
  assert.equal(usageToday()['youtube.com'], 210);
});

test('aviso de 5 minutos é enviado uma vez', async () => {
  await store.addUsage('youtube.com', 55 * 60 - 210);
  chrome.env.tabs[0].url = 'https://www.youtube.com/';
  await chrome.tabs.onActivated.fire({ tabId: 1 });
  await settle();
  advance(30);
  await tick();
  const warnings = chrome.env.notifications.filter((n) => n.id === 'warn:youtube.com');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].title, /Faltam 5 min/);
  const limitAlarm = chrome.env.alarms.get('limit-check');
  assert.ok(limitAlarm, 'agenda verificação para o momento do bloqueio');
  assert.equal(chrome.env.badges.get(1).text, '55m');
  assert.equal(chrome.env.badges.get(1).color, '#D97706', 'selo muda de cor perto do limite');
});

test('bloqueia ao estourar o limite', async () => {
  await run(4 * 60 + 40);
  await settle();
  const url = new URL(chrome.env.tabs[0].url);
  assert.equal(url.protocol, 'chrome-extension:');
  assert.equal(url.pathname, '/blocked/blocked.html');
  assert.equal(url.searchParams.get('site'), 'youtube.com');
  assert.equal(url.searchParams.get('url'), 'https://www.youtube.com/');
  assert.equal(await store.wasExceeded('youtube.com'), true);
  assert.equal(chrome.env.notifications.filter((n) => n.id === 'warn:youtube.com').length, 1);
});

test('aba em segundo plano também é bloqueada ao navegar', async () => {
  const tab = { id: 2, windowId: 1, active: false, url: 'https://music.youtube.com/' };
  chrome.env.tabs.push(tab);
  await chrome.tabs.onUpdated.fire(2, { url: tab.url }, tab);
  await settle();
  assert.match(tab.url, /blocked\.html\?site=youtube\.com/);
  chrome.env.tabs.pop();
});

test('"mais 5 min" funciona uma vez por dia', async () => {
  assert.deepEqual(await chrome.send({ type: 'extend', site: 'youtube.com' }), { ok: true });
  assert.deepEqual(await chrome.send({ type: 'extend', site: 'youtube.com' }), { ok: false, reason: 'used' });

  chrome.env.tabs[0].url = 'https://www.youtube.com/';
  await chrome.tabs.onUpdated.fire(1, { url: chrome.env.tabs[0].url }, chrome.env.tabs[0]);
  await settle();
  assert.equal(chrome.env.tabs[0].url, 'https://www.youtube.com/', 'não bloqueia durante a extensão');

  await run(5 * 60 + 5);
  await settle();
  assert.match(chrome.env.tabs[0].url, /blocked\.html/);
});

test('"mais 10 min" soma 10 minutos e também vale uma vez por dia', async () => {
  const day = '2026-10-23';
  await store.markExtension('reddit.com', 10, day);
  await store.setLimit('reddit.com', 30);
  assert.equal(await store.allowanceSeconds('reddit.com', day), 40 * 60);
  assert.equal(await store.hasExtension('reddit.com', day), true);

  assert.deepEqual(await chrome.send({ type: 'extend', site: 'x.com', minutes: 10 }), { ok: true });
  assert.equal(chrome.storage.local.items().extensions[store.dayKey()]['x.com'], 10);
  assert.deepEqual(await chrome.send({ type: 'extend', site: 'x.com', minutes: 5 }), { ok: false, reason: 'used' });

  // Valor fora das opções cai nos 5 minutos.
  await chrome.send({ type: 'extend', site: 'y.com', minutes: 999 });
  assert.equal(chrome.storage.local.items().extensions[store.dayKey()]['y.com'], 5);

  assert.equal(store.extensionSeconds(true), 5 * 60, 'registro antigo vale 5 min');
  await store.removeLimit('reddit.com');
});

test('status devolve o que está contando agora', async () => {
  chrome.env.tabs[0].url = 'https://github.com/';
  await chrome.tabs.onActivated.fire({ tabId: 1 });
  await settle();
  const status = await chrome.send({ type: 'status' });
  assert.equal(status.ok, true);
  assert.equal(status.current.domain, 'github.com');
});

test('divide o tempo na meia-noite', async () => {
  // Leva o relógio até 23:59:30.
  const target = new Date(2026, 9, 21, 23, 59, 30).getTime();
  mock.timers.tick(target - Date.now());
  await chrome.tabs.onActivated.fire({ tabId: 1 }); // reinicia a contagem às 23:59:30
  await settle();
  const before = usageToday()['github.com'];
  advance(60);
  await tick();
  const usage = chrome.storage.local.items().usage;
  assert.equal(usage['2026-10-21']['github.com'], before + 30);
  assert.equal(usage['2026-10-22']['github.com'], 30);
});

test('limite do dia da semana vale no lugar do limite padrão', async () => {
  // Agora é quinta-feira (4), logo depois da meia-noite.
  await store.setLimit('github.com', 1);
  await store.setDayLimit('github.com', 4, 10);
  await settle();
  await run(120);
  assert.equal(chrome.env.tabs[0].url, 'https://github.com/', 'quinta tem 10 min');

  await store.setDayLimit('github.com', 4, null);
  await settle();
  assert.match(chrome.env.tabs[0].url, /blocked\.html\?site=github\.com/, 'sem o dia, volta a 1 min');
});

test('alarme de sábado mostra a notificação e reagenda', async () => {
  await chrome.alarms.onAlarm.fire({ name: 'weekly-summary' });
  await settle();
  assert.ok(chrome.env.notifications.some((n) => n.id === 'weekly'));
  await chrome.notifications.onClicked.fire('weekly');
  await settle();
  assert.match(chrome.env.created.url, /dashboard\.html\?week=last$/);
});

test('limpeza apaga dados com mais de 90 dias', async () => {
  const usage = chrome.storage.local.items().usage;
  await chrome.storage.local.set({ usage: { ...usage, '2026-06-01': { 'old.com': 10 }, '2026-07-30': { 'ok.com': 10 } } });
  await store.pruneOldData(new Date(2026, 9, 22));
  const after = chrome.storage.local.items().usage;
  assert.equal(after['2026-06-01'], undefined);
  assert.ok(after['2026-07-30']);
});

test('limpeza tira os ícones de sites que saíram do histórico', async () => {
  await chrome.storage.local.set({ siteIcons: { 'youtube.com': 'a', 'old.com': 'b' } });
  await store.pruneOldData(new Date(2026, 9, 22));
  assert.deepEqual(Object.keys(chrome.storage.local.items().siteIcons), ['youtube.com']);
});

test('normalizeDomain e matchLimitDomain', () => {
  assert.equal(store.normalizeDomain('https://www.m.youtube.com/watch'), 'youtube.com');
  assert.equal(store.normalizeDomain('Instagram.com'), 'instagram.com');
  assert.equal(store.normalizeDomain('não é site'), null);
  assert.equal(store.domainFromUrl('chrome://extensions'), null);
  assert.equal(store.matchLimitDomain('music.youtube.com', { 'youtube.com': 60 }), 'youtube.com');
  assert.equal(store.matchLimitDomain('notyoutube.com', { 'youtube.com': 60 }), null);
  assert.equal(store.formatDuration(38 * 60), '38 min');
  assert.equal(store.formatDuration(125 * 60), '2 h 5 min');
});
