import * as store from '../shared/storage.js';

// Dados de exemplo (?demo), só para visualização.
export function demoData() {
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
