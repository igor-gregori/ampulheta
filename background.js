// Service worker: contagem de tempo, verificação de limites e alarme de sábado.
//
// O Chrome encerra o service worker quando quer, então o estado da contagem
// fica em chrome.storage.session ({ domain, tabId, since }) e o tempo acumulado
// é gravado em chrome.storage.local a cada evento e a cada minuto.

import * as store from './shared/storage.js';

const TICK_ALARM = 'tick';
const LIMIT_ALARM = 'limit-check';
const WEEKLY_ALARM = 'weekly-summary';
const WEEKLY_NOTIFICATION = 'weekly';

const IDLE_SECONDS = 60;
// Teto de tempo somado de uma vez. Evita contar horas se o computador dormir
// com o Chrome em foco e o alarme de 1 min não rodar.
const MAX_GAP_SECONDS = 120;
const WEEKLY_HOUR = 9;
const SATURDAY = 6;

const BLOCKED_PAGE = chrome.runtime.getURL('blocked/blocked.html');
const DASHBOARD_PAGE = chrome.runtime.getURL('dashboard/dashboard.html');

// ---------- fila: um evento por vez, para não somar o mesmo intervalo duas vezes ----------

let queue = Promise.resolve();
function serial(task) {
  const run = queue.then(task, task);
  queue = run.catch((error) => console.error('[ampulheta]', error));
  return run;
}

// ---------- estado da contagem ----------

async function getCurrent() {
  const data = await chrome.storage.session.get('current');
  return data.current ?? null;
}

async function setCurrent(current) {
  if (current) await chrome.storage.session.set({ current });
  else await chrome.storage.session.remove('current');
}

// Grava o tempo desde `since` no domínio atual, dividindo na meia-noite.
async function flush(now = Date.now()) {
  const current = await getCurrent();
  if (!current) return;
  const start = Math.max(current.since, now - MAX_GAP_SECONDS * 1000);
  if (now > start) {
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    if (start < midnight.getTime()) {
      await store.addUsage(current.domain, (midnight - start) / 1000, store.dayKey(new Date(start)));
      await store.addUsage(current.domain, (now - midnight) / 1000, store.dayKey(new Date(now)));
    } else {
      await store.addUsage(current.domain, (now - start) / 1000, store.dayKey(new Date(now)));
    }
  }
  await setCurrent({ ...current, since: now });
}

// A aba que deve estar contando agora, ou null.
async function resolveActiveTab() {
  let win;
  try {
    win = await chrome.windows.getLastFocused();
  } catch {
    return null;
  }
  if (!win?.focused) return null;
  const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
  const domain = store.domainFromUrl(tab?.url);
  if (!domain) return null;

  // Sem teclado/mouse por 60 s conta como ocioso, exceto se a aba estiver
  // tocando áudio (vídeo no YouTube). Tela bloqueada nunca conta.
  const idle = await chrome.idle.queryState(IDLE_SECONDS);
  if (idle === 'locked') return null;
  if (idle === 'idle' && !tab.audible) return null;

  return { tab, domain };
}

function update() {
  return serial(async () => {
    const now = Date.now();
    await flush(now);
    const active = await resolveActiveTab();
    if (!active) {
      await setCurrent(null);
      await chrome.alarms.clear(LIMIT_ALARM);
      return;
    }
    const blocked = await enforce(active.tab, active.domain);
    if (blocked) {
      await setCurrent(null);
      await chrome.alarms.clear(LIMIT_ALARM);
      return;
    }
    await setCurrent({ domain: active.domain, tabId: active.tab.id, since: now });
    await scheduleLimitCheck(active.domain);
  });
}

// ---------- limites ----------

async function limitStatus(domain) {
  const limits = await store.getLimits();
  const limitDomain = store.matchLimitDomain(domain, limits);
  if (!limitDomain) return null;
  const day = store.dayKey();
  const used = store.usedForLimit(limitDomain, await store.getUsageForDay(day));
  const allowance = await store.allowanceSeconds(limitDomain, day);
  return { limitDomain, used, allowance, remaining: allowance - used, day };
}

// Avisa ou bloqueia. Retorna true se a aba foi redirecionada.
async function enforce(tab, domain) {
  const status = await limitStatus(domain);
  if (!status) return false;
  const { limitDomain, remaining, day } = status;

  if (remaining <= 0) {
    await store.markExceeded(limitDomain, day);
    const params = new URLSearchParams({ site: limitDomain, url: tab.url });
    await chrome.tabs.update(tab.id, { url: `${BLOCKED_PAGE}?${params}` });
    return true;
  }

  if (remaining <= store.WARNING_SECONDS && !(await store.wasWarned(limitDomain, day))) {
    await store.markWarned(limitDomain, day);
    const minutes = Math.max(1, Math.ceil(remaining / 60));
    chrome.notifications.create(`warn:${limitDomain}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: `Faltam ${minutes} min no ${limitDomain}`,
      message: 'Depois disso o site fica pausado até amanhã.',
    });
  }
  return false;
}

// Agenda a próxima verificação para o momento do aviso ou do bloqueio,
// assim a precisão não depende só do alarme de 1 minuto.
async function scheduleLimitCheck(domain) {
  const status = await limitStatus(domain);
  if (!status) {
    await chrome.alarms.clear(LIMIT_ALARM);
    return;
  }
  const { remaining } = status;
  const untilNext = remaining > store.WARNING_SECONDS ? remaining - store.WARNING_SECONDS : remaining;
  // O Chrome não dispara alarmes com menos de 30 s.
  const delay = Math.max(30, Math.ceil(untilNext) + 1);
  await chrome.alarms.create(LIMIT_ALARM, { when: Date.now() + delay * 1000 });
}

async function enforceBackgroundTab(tab) {
  const domain = store.domainFromUrl(tab.url);
  if (domain) await enforce(tab, domain);
}

// ---------- resumo de sábado ----------

function nextSaturdayMorning(now = new Date()) {
  const next = new Date(now);
  next.setHours(WEEKLY_HOUR, 0, 0, 0);
  const daysAhead = (SATURDAY - next.getDay() + 7) % 7;
  next.setDate(next.getDate() + daysAhead);
  if (next <= now) next.setDate(next.getDate() + 7);
  return next;
}

// Sem `periodInMinutes` para não escorregar 1 h no horário de verão.
async function scheduleWeekly() {
  await chrome.alarms.create(WEEKLY_ALARM, { when: nextSaturdayMorning().getTime() });
}

function showWeeklyNotification() {
  chrome.notifications.create(WEEKLY_NOTIFICATION, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Seu resumo da semana está pronto',
    message: 'Veja onde seu tempo foi parar nos últimos 7 dias.',
    requireInteraction: true,
  });
}

function openDashboard(week) {
  const url = week ? `${DASHBOARD_PAGE}?week=${week}` : DASHBOARD_PAGE;
  return chrome.tabs.create({ url });
}

// ---------- inicialização ----------

async function setup() {
  await store.ensureDefaults();
  chrome.idle.setDetectionInterval(IDLE_SECONDS);
  if (!(await chrome.alarms.get(TICK_ALARM))) {
    await chrome.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
  }
  if (!(await chrome.alarms.get(WEEKLY_ALARM))) await scheduleWeekly();
  await store.pruneOldData();
  await update();
}

// ---------- eventos ----------

chrome.tabs.onActivated.addListener(() => update());
chrome.tabs.onRemoved.addListener(() => update());
chrome.windows.onFocusChanged.addListener(() => update());
chrome.idle.onStateChanged.addListener(() => update());

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url && changeInfo.audible === undefined) return;
  if (tab.active) update();
  else if (changeInfo.url) serial(() => enforceBackgroundTab(tab));
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === WEEKLY_ALARM) {
    showWeeklyNotification();
    await scheduleWeekly();
    return;
  }
  await update();
});

chrome.notifications.onClicked.addListener((id) => {
  chrome.notifications.clear(id);
  if (id === WEEKLY_NOTIFICATION) openDashboard('last');
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.limits) update();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});

async function handleMessage(message) {
  switch (message?.type) {
    // Popup: grava o que está pendente e devolve o que está contando agora.
    case 'status': {
      await update();
      return { ok: true, current: await getCurrent(), now: Date.now() };
    }
    // Tela de bloqueio: "mais 5 min", 1x por dia por site.
    case 'extend': {
      const site = store.normalizeDomain(message.site);
      if (!site) return { ok: false, reason: 'invalid' };
      return serial(async () => {
        if (await store.hasExtension(site)) return { ok: false, reason: 'used' };
        await store.markExtension(site);
        return { ok: true };
      });
    }
    case 'open-dashboard': {
      await openDashboard(message.week);
      return { ok: true };
    }
    default:
      return { ok: false, reason: 'unknown' };
  }
}

// Roda sempre que o service worker sobe: na instalação, ao abrir o Chrome
// e quando ele acorda por um evento.
setup().catch((error) => console.error('[ampulheta]', error));
