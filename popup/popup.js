import * as store from '../shared/storage.js';

const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

const $ = (id) => document.getElementById(id);

let state = {
  tabDomain: null,
  dayUsage: {},
  limits: {},
  extensions: {},
  current: null, // { domain, since } do background
  clockOffset: 0,
};

function liveUsage() {
  const usage = { ...state.dayUsage };
  const { current } = state;
  if (current) {
    const elapsed = (Date.now() + state.clockOffset - current.since) / 1000;
    if (elapsed > 0) usage[current.domain] = (usage[current.domain] ?? 0) + elapsed;
  }
  return usage;
}

function allowanceFor(limitDomain) {
  const extra = state.extensions[limitDomain] ? store.EXTENSION_SECONDS : 0;
  return state.limits[limitDomain] * 60 + extra;
}

function renderRing(usage) {
  const ring = $('ring-value');
  ring.style.strokeDasharray = RING_CIRCUMFERENCE;
  const domain = state.tabDomain;
  const limitDomain = store.matchLimitDomain(domain, state.limits);

  $('current-site').textContent = domain ?? 'Esta aba não é um site';
  $('set-limit').hidden = !domain || Boolean(limitDomain);

  if (!domain) {
    const total = Object.values(usage).reduce((a, b) => a + b, 0);
    $('ring-main').textContent = store.formatDuration(total);
    $('ring-sub').textContent = 'em sites hoje';
    ring.classList.add('none');
    ring.style.strokeDashoffset = RING_CIRCUMFERENCE;
    return;
  }

  if (!limitDomain) {
    $('ring-main').textContent = store.formatDuration(usage[domain] ?? 0);
    $('ring-sub').textContent = 'hoje, sem limite';
    ring.classList.add('none');
    ring.style.strokeDashoffset = RING_CIRCUMFERENCE;
    return;
  }

  const used = store.usedForLimit(limitDomain, usage);
  const allowance = allowanceFor(limitDomain);
  const fraction = Math.min(1, used / allowance);
  const over = used >= allowance;
  ring.classList.remove('none');
  ring.classList.toggle('over', over);
  ring.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - fraction);
  $('ring-main').textContent = store.formatDuration(used);
  $('ring-sub').textContent = over
    ? 'limite atingido'
    : `de ${Math.round(allowance / 60)} min hoje`;
}

function renderList(usage) {
  const entries = Object.entries(usage)
    .filter(([, seconds]) => seconds >= 30)
    .sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] ?? 1;
  const total = entries.reduce((sum, [, seconds]) => sum + seconds, 0);

  $('today-total').textContent = entries.length ? store.formatDuration(total) : '';
  $('empty').hidden = entries.length > 0;

  const list = $('site-list');
  list.replaceChildren(
    ...entries.map(([domain, seconds]) => {
      const limitDomain = store.matchLimitDomain(domain, state.limits);
      const over = limitDomain && store.usedForLimit(limitDomain, usage) >= allowanceFor(limitDomain);

      const item = document.createElement('li');
      item.className = 'site';

      const mono = document.createElement('span');
      mono.className = 'monogram';
      mono.textContent = domain[0];

      const name = document.createElement('span');
      name.className = 'site-name';
      name.textContent = domain;
      name.title = domain;

      const time = document.createElement('span');
      time.className = 'site-time tabular';
      if (over) time.classList.add('over');
      time.textContent = limitDomain === domain
        ? `${Math.round(seconds / 60)} de ${state.limits[domain]} min`
        : store.formatDuration(seconds);

      const bar = document.createElement('span');
      bar.className = 'bar';
      const fill = document.createElement('span');
      if (over) fill.classList.add('over');
      fill.style.width = `${Math.max(3, (seconds / max) * 100)}%`;
      bar.append(fill);

      item.append(mono, name, time, bar);
      return item;
    }),
  );
}

function render() {
  const usage = liveUsage();
  renderRing(usage);
  $('ring-main').classList.toggle('long', $('ring-main').textContent.length > 6);
  renderList(usage);
}

async function load() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.tabDomain = store.domainFromUrl(tab?.url);

  let status = null;
  try {
    status = await chrome.runtime.sendMessage({ type: 'status' });
  } catch {
    // Service worker ainda subindo; mostra o que já está gravado.
  }

  const day = store.dayKey();
  const all = await store.getAll();
  state.dayUsage = all.usage[day] ?? {};
  state.limits = all.limits;
  state.extensions = all.extensions[day] ?? {};
  state.current = status?.current ?? null;
  state.clockOffset = status?.now ? status.now - Date.now() : 0;
  render();
}

$('open-options').addEventListener('click', () => chrome.runtime.openOptionsPage());

$('set-limit').addEventListener('click', () => {
  const url = chrome.runtime.getURL(`options/options.html?add=${encodeURIComponent(state.tabDomain)}`);
  chrome.tabs.create({ url });
  window.close();
});

$('open-dashboard').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'open-dashboard' });
  window.close();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.limits || changes.extensions)) load();
});

load();
setInterval(render, 1000);
