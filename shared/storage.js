// Leitura e gravação no chrome.storage.local. Tudo fica no navegador.
//
// usage:      { "2026-10-23": { "youtube.com": 2280 } }   segundos por dia
// limits:     { "youtube.com": 60 }                       minutos por dia
// extensions: { "2026-10-23": { "youtube.com": true } }   "mais 5 min" usado
// warned:     { "2026-10-23": { "youtube.com": true } }   aviso de 5 min enviado
// exceeded:   { "2026-10-23": { "youtube.com": true } }   limite estourou no dia

export const DEFAULT_LIMITS = { 'youtube.com': 60 };
export const EXTENSION_SECONDS = 5 * 60;
export const WARNING_SECONDS = 5 * 60;
export const RETENTION_DAYS = 90;

const DAILY_KEYS = ['usage', 'extensions', 'warned', 'exceeded'];

// ---------- datas ----------

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// ---------- domínios ----------

const STRIPPED_PREFIXES = ['www.', 'm.', 'mobile.'];

export function normalizeDomain(input) {
  let host = String(input || '').trim().toLowerCase();
  if (!host) return null;
  try {
    if (host.includes('://')) host = new URL(host).hostname;
    else host = new URL(`http://${host}`).hostname;
  } catch {
    return null;
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of STRIPPED_PREFIXES) {
      if (host.startsWith(prefix) && host.length > prefix.length) {
        host = host.slice(prefix.length);
        changed = true;
      }
    }
  }
  return host.includes('.') || host === 'localhost' ? host : null;
}

export function domainFromUrl(url) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  return normalizeDomain(url);
}

// Retorna o domínio com limite que cobre `domain` ("music.youtube.com" -> "youtube.com").
export function matchLimitDomain(domain, limits) {
  if (!domain) return null;
  if (domain in limits) return domain;
  for (const limited of Object.keys(limits)) {
    if (domain.endsWith(`.${limited}`)) return limited;
  }
  return null;
}

// ---------- leitura e gravação ----------

async function get(key, fallback) {
  const data = await chrome.storage.local.get(key);
  return data[key] ?? fallback;
}

async function set(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

export async function getAll() {
  const data = await chrome.storage.local.get([...DAILY_KEYS, 'limits']);
  return {
    usage: data.usage ?? {},
    limits: data.limits ?? { ...DEFAULT_LIMITS },
    extensions: data.extensions ?? {},
    warned: data.warned ?? {},
    exceeded: data.exceeded ?? {},
  };
}

export async function getUsage() {
  return get('usage', {});
}

export async function getUsageForDay(day = dayKey()) {
  const usage = await getUsage();
  return usage[day] ?? {};
}

export async function addUsage(domain, seconds, day = dayKey()) {
  if (!domain || seconds <= 0) return;
  const usage = await getUsage();
  const today = usage[day] ?? {};
  today[domain] = Math.round((today[domain] ?? 0) + seconds);
  usage[day] = today;
  await set('usage', usage);
}

export async function getLimits() {
  return get('limits', { ...DEFAULT_LIMITS });
}

export async function setLimit(domain, minutes) {
  const limits = await getLimits();
  limits[domain] = minutes;
  await set('limits', limits);
}

export async function removeLimit(domain) {
  const limits = await getLimits();
  delete limits[domain];
  await set('limits', limits);
}

export async function ensureDefaults() {
  const data = await chrome.storage.local.get('limits');
  if (!data.limits) await set('limits', { ...DEFAULT_LIMITS });
}

async function getDailyFlag(key, domain, day) {
  const all = await get(key, {});
  return Boolean(all[day]?.[domain]);
}

async function setDailyFlag(key, domain, day) {
  const all = await get(key, {});
  all[day] = { ...(all[day] ?? {}), [domain]: true };
  await set(key, all);
}

export const hasExtension = (domain, day = dayKey()) => getDailyFlag('extensions', domain, day);
export const markExtension = (domain, day = dayKey()) => setDailyFlag('extensions', domain, day);
export const wasWarned = (domain, day = dayKey()) => getDailyFlag('warned', domain, day);
export const markWarned = (domain, day = dayKey()) => setDailyFlag('warned', domain, day);
export const wasExceeded = (domain, day = dayKey()) => getDailyFlag('exceeded', domain, day);
export const markExceeded = (domain, day = dayKey()) => setDailyFlag('exceeded', domain, day);

// Limite efetivo do dia em segundos, já somando o "mais 5 min".
export async function allowanceSeconds(limitDomain, day = dayKey()) {
  const limits = await getLimits();
  if (!(limitDomain in limits)) return null;
  const extra = (await hasExtension(limitDomain, day)) ? EXTENSION_SECONDS : 0;
  return limits[limitDomain] * 60 + extra;
}

// Soma o uso de hoje de todos os domínios cobertos por um limite.
export function usedForLimit(limitDomain, dayUsage) {
  let total = 0;
  for (const [domain, seconds] of Object.entries(dayUsage)) {
    if (domain === limitDomain || domain.endsWith(`.${limitDomain}`)) total += seconds;
  }
  return total;
}

// Apaga dados diários com mais de RETENTION_DAYS dias.
export async function pruneOldData(now = new Date()) {
  const cutoff = dayKey(addDays(now, -RETENTION_DAYS));
  const data = await chrome.storage.local.get(DAILY_KEYS);
  const updates = {};
  for (const key of DAILY_KEYS) {
    const all = data[key];
    if (!all) continue;
    let removed = false;
    for (const day of Object.keys(all)) {
      if (day < cutoff) {
        delete all[day];
        removed = true;
      }
    }
    if (removed) updates[key] = all;
  }
  if (Object.keys(updates).length) await chrome.storage.local.set(updates);
}

// ---------- formatação ----------

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds / 60));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
