import { useEffect, useState } from 'react';
import * as store from '@/shared/storage.js';
import { useStorageChange } from '@/shared/hooks/use-storage-change.js';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';

const REFRESH_KEYS = ['limits', 'extensions'];

const PHRASES = [
  'Por hoje é só.',
  'Hora de fazer uma pausa.',
  'O resto do dia é seu.',
  'Amanhã tem mais.',
  'Que tal levantar um pouco?',
];
const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];

const params = new URLSearchParams(location.search);
const site = store.normalizeDomain(params.get('site')) ?? '';

// Só volta para endereços do próprio site bloqueado.
function returnUrl() {
  const url = params.get('url');
  const domain = store.domainFromUrl(url);
  if (domain && (domain === site || domain.endsWith(`.${site}`))) return url;
  return `https://${site}`;
}

async function readStatus() {
  const day = store.dayKey();
  return {
    used: store.usedForLimit(site, await store.getUsageForDay(day)),
    allowance: await store.allowanceSeconds(site, day),
    extended: await store.hasExtension(site, day),
  };
}

export function App() {
  const [status, setStatus] = useState(null);
  const [waiting, setWaiting] = useState(false);

  const refresh = () => readStatus().then(setStatus);
  useEffect(() => {
    document.title = `${site} · limite atingido`;
    refresh();
  }, []);
  useStorageChange(REFRESH_KEYS, refresh);

  if (!status) return null;
  const { used, allowance, extended } = status;

  // O limite pode ter sido aumentado ou removido nas opções.
  const free = allowance === null || used < allowance;

  const extend = async () => {
    setWaiting(true);
    const result = await chrome.runtime.sendMessage({ type: 'extend', site });
    if (result?.ok) location.replace(returnUrl());
    else {
      setWaiting(false);
      refresh();
    }
  };

  const closeTab = async () => {
    const tab = await chrome.tabs.getCurrent();
    if (tab?.id !== undefined) chrome.tabs.remove(tab.id);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4 py-6">
      <Card className="w-full max-w-md py-10 text-center">
        <CardContent className="flex flex-col items-center px-8">
          <img className="mb-5 rounded-xl" src="/icons/icon128.png" alt="" width="56" height="56" />
          <Badge variant="destructive">Bloqueado por hoje</Badge>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{phrase}</h1>
          <p className="mt-1 text-sm break-all text-muted-foreground">{site}</p>
          <p className="mt-5">
            Você passou <strong className="font-semibold tabular-nums">{store.formatDuration(used)}</strong> aqui hoje.
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {allowance
              ? `O limite de hoje é de ${Math.round(allowance / 60)} min. Amanhã o contador recomeça.`
              : 'Este site não tem mais limite.'}
          </p>

          <div className="mt-7 flex w-full flex-wrap justify-center gap-2.5">
            {free
              ? <Button className="min-w-32 flex-1" onClick={() => location.replace(returnUrl())}>Voltar ao site</Button>
              : <Button className="min-w-32 flex-1" disabled={extended || waiting} onClick={extend}>Mais 5 min</Button>}
            <Button className="min-w-32 flex-1" variant="outline" onClick={closeTab}>Fechar aba</Button>
          </div>
          <p className="mt-3.5 min-h-5 text-sm text-muted-foreground">
            {!free && (extended ? 'Os 5 minutos extras de hoje já foram usados.' : 'Dá para pedir mais 5 minutos uma vez por dia.')}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
