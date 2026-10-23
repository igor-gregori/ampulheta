import * as store from '../shared/storage.js';

const $ = (id) => document.getElementById(id);

let savedTimer;
function flashSaved(text = 'Salvo') {
  $('saved').textContent = text;
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { $('saved').textContent = ''; }, 1800);
}

function parseMinutes(value) {
  const minutes = Math.round(Number(value));
  return Number.isFinite(minutes) && minutes >= 1 && minutes <= 1440 ? minutes : null;
}

async function renderLimits() {
  const limits = await store.getLimits();
  const domains = Object.keys(limits).sort();
  $('no-limits').hidden = domains.length > 0;

  $('limit-list').replaceChildren(
    ...domains.map((domain) => {
      const item = document.createElement('li');
      item.className = 'limit';

      const mono = document.createElement('span');
      mono.className = 'monogram';
      mono.textContent = domain[0];

      const name = document.createElement('span');
      name.className = 'limit-domain';
      name.textContent = domain;
      name.title = domain;

      const minutesLabel = document.createElement('label');
      minutesLabel.className = 'limit-minutes';
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.max = '1440';
      input.value = limits[domain];
      input.className = 'tabular';
      input.setAttribute('aria-label', `Minutos por dia em ${domain}`);
      input.addEventListener('change', async () => {
        const minutes = parseMinutes(input.value);
        if (!minutes) {
          input.value = limits[domain];
          return;
        }
        await store.setLimit(domain, minutes);
        flashSaved();
      });
      minutesLabel.append(input, 'min por dia');

      const remove = document.createElement('button');
      remove.className = 'remove';
      remove.type = 'button';
      remove.textContent = 'Remover';
      remove.addEventListener('click', async () => {
        await store.removeLimit(domain);
        flashSaved(`${domain} removido`);
      });

      item.append(mono, name, minutesLabel, remove);
      return item;
    }),
  );
}

$('add-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const error = $('add-error');
  const domain = store.normalizeDomain($('add-domain').value);
  const minutes = parseMinutes($('add-minutes').value);
  if (!domain) {
    error.textContent = 'Digite um endereço válido, como instagram.com.';
    error.hidden = false;
    return;
  }
  if (!minutes) {
    error.textContent = 'Use um número de minutos entre 1 e 1440.';
    error.hidden = false;
    return;
  }
  error.hidden = true;
  await store.setLimit(domain, minutes);
  $('add-domain').value = '';
  flashSaved(`${domain}: ${minutes} min por dia`);
});

$('open-dashboard').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'open-dashboard' });
});

$('clear-history').addEventListener('click', async () => {
  if (!confirm('Apagar todo o histórico de uso? Os limites continuam salvos.')) return;
  await chrome.storage.local.remove(['usage', 'extensions', 'warned', 'exceeded']);
  flashSaved('Histórico apagado');
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.limits) renderLimits();
});

// options.html?add=site.com vem do popup ("Definir limite").
const prefill = new URLSearchParams(location.search).get('add');
if (prefill) {
  $('add-domain').value = prefill;
  $('add-minutes').focus();
  $('add-minutes').select();
}

renderLimits();
