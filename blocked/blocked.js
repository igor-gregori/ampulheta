import * as store from '../shared/storage.js';

const $ = (id) => document.getElementById(id);

const PHRASES = [
  'Por hoje é só.',
  'Hora de fazer uma pausa.',
  'O resto do dia é seu.',
  'Amanhã tem mais.',
  'Que tal levantar um pouco?',
];

const params = new URLSearchParams(location.search);
const site = store.normalizeDomain(params.get('site')) ?? '';

// Só volta para endereços do próprio site bloqueado.
function returnUrl() {
  const url = params.get('url');
  const domain = store.domainFromUrl(url);
  if (domain && (domain === site || domain.endsWith(`.${site}`))) return url;
  return `https://${site}`;
}

async function render() {
  const day = store.dayKey();
  const used = store.usedForLimit(site, await store.getUsageForDay(day));
  const allowance = await store.allowanceSeconds(site, day);
  const extended = await store.hasExtension(site, day);

  $('site').textContent = site;
  $('used').textContent = store.formatDuration(used);
  $('limit-note').textContent = allowance
    ? `O limite é de ${Math.round(allowance / 60)} min por dia. Amanhã o contador recomeça.`
    : 'Este site não tem mais limite.';

  // O limite pode ter sido aumentado ou removido nas opções.
  const free = allowance === null || used < allowance;
  $('go-back').hidden = !free;
  $('extend').hidden = free;
  $('extend').disabled = extended;
  $('extend-note').textContent = !free && extended
    ? 'Os 5 minutos extras de hoje já foram usados.'
    : !free ? 'Dá para pedir mais 5 minutos uma vez por dia.' : '';
}

$('extend').addEventListener('click', async () => {
  $('extend').disabled = true;
  const result = await chrome.runtime.sendMessage({ type: 'extend', site });
  if (result?.ok) {
    location.replace(returnUrl());
  } else {
    render();
  }
});

$('go-back').addEventListener('click', () => location.replace(returnUrl()));

$('close-tab').addEventListener('click', async () => {
  const tab = await chrome.tabs.getCurrent();
  if (tab?.id !== undefined) chrome.tabs.remove(tab.id);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.limits || changes.extensions)) render();
});

$('phrase').textContent = PHRASES[Math.floor(Math.random() * PHRASES.length)];
document.title = `${site} · limite atingido`;
render();
