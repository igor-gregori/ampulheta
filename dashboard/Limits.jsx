import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import * as store from '@/shared/storage.js';
import { SiteIcon } from '@/shared/components/site-icon.jsx';
import { useSiteIcons } from '@/shared/hooks/use-site-icons.js';
import { useStorageChange } from '@/shared/hooks/use-storage-change.js';
import { cn } from '@/shared/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

const LIMIT_KEYS = ['limits'];

// A grade começa na segunda; os números são os de Date.getDay().
const WEEKDAYS = [
  [1, 'Seg'], [2, 'Ter'], [3, 'Qua'], [4, 'Qui'], [5, 'Sex'], [6, 'Sáb'], [0, 'Dom'],
];

function parseMinutes(value) {
  const minutes = Math.round(Number(value));
  return Number.isFinite(minutes) && minutes >= 1 && minutes <= 1440 ? minutes : null;
}

// Salva ao sair do campo ou com Enter. Com `optional`, vazio vira null.
function MinutesInput({ value, onCommit, optional, ...props }) {
  const [text, setText] = useState(value ?? '');
  useEffect(() => setText(value ?? ''), [value]);

  const commit = () => {
    if (String(text).trim() === String(value ?? '')) return;
    if (optional && String(text).trim() === '') {
      onCommit(null);
      return;
    }
    const minutes = parseMinutes(text);
    if (minutes) onCommit(minutes);
    else setText(value ?? '');
  };

  return (
    <Input
      type="number"
      min="1"
      max="1440"
      className="tabular-nums"
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      {...props}
    />
  );
}

function dayBadges({ minutes, days }) {
  const groups = new Map();
  for (const [weekday, label] of WEEKDAYS) {
    if (days[weekday] === undefined || days[weekday] === minutes) continue;
    groups.set(days[weekday], [...(groups.get(days[weekday]) ?? []), label]);
  }
  return [...groups].map(([value, labels]) => `${labels.join(', ')}: ${value} min`);
}

function LimitRow({ domain, limit, icons }) {
  const entry = store.limitEntry(limit);
  const [open, setOpen] = useState(false);
  const badges = dayBadges(entry);

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <li className="py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <SiteIcon domain={domain} icons={icons} />
          <div className="min-w-32 flex-1">
            <p className="truncate text-sm font-medium" title={domain}>{domain}</p>
            {badges.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {badges.map((text) => <Badge key={text} variant="secondary">{text}</Badge>)}
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <MinutesInput
              className="h-8 w-20 tabular-nums"
              value={entry.minutes}
              aria-label={`Minutos por dia em ${domain}`}
              onCommit={async (minutes) => {
                await store.setLimit(domain, minutes);
                toast.success(`${domain}: ${minutes} min por dia`);
              }}
            />
            min por dia
          </label>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarDays />
              Por dia da semana
              <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Remover ${domain}`}
            onClick={async () => {
              await store.removeLimit(domain);
              toast(`${domain} removido`);
            }}
          >
            <Trash2 />
          </Button>
        </div>
        <CollapsibleContent>
          <div className="mt-3 rounded-lg bg-muted/50 p-3">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEKDAYS.map(([weekday, label]) => (
                <label key={weekday} className="grid gap-1 text-xs text-muted-foreground">
                  {label}
                  <MinutesInput
                    className="h-8 bg-background tabular-nums dark:bg-background"
                    optional
                    value={entry.days[weekday]}
                    placeholder={entry.minutes}
                    aria-label={`Minutos em ${domain} no dia ${label}`}
                    onCommit={async (minutes) => {
                      await store.setDayLimit(domain, weekday, minutes);
                      toast.success(minutes === null
                        ? `${label}: volta a ${entry.minutes} min`
                        : `${domain}: ${minutes} min em ${label.toLowerCase()}`);
                    }}
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Dia em branco usa o limite padrão de {entry.minutes} min. O valor vale para toda semana.
            </p>
          </div>
        </CollapsibleContent>
      </li>
    </Collapsible>
  );
}

function AddSite({ limits }) {
  const prefill = new URLSearchParams(location.search).get('add') ?? '';
  const [domainText, setDomainText] = useState(prefill);
  const [minutesText, setMinutesText] = useState('30');
  const [error, setError] = useState('');
  const minutesRef = useRef(null);

  // ?add=site.com vem do popup ("Definir limite").
  useEffect(() => {
    if (prefill) minutesRef.current.select();
  }, [prefill]);

  const submit = async (event) => {
    event.preventDefault();
    const domain = store.normalizeDomain(domainText);
    const minutes = parseMinutes(minutesText);
    if (!domain) {
      setError('Digite um endereço válido, como instagram.com.');
      return;
    }
    if (!minutes) {
      setError('Use um número de minutos entre 1 e 1440.');
      return;
    }
    setError('');
    await store.setLimit(domain, minutes);
    setDomainText('');
    toast.success(`${domain}: ${minutes} min por dia`);
  };

  return (
    <form onSubmit={submit} autoComplete="off" className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-48 flex-1 gap-1.5">
          <Label htmlFor="add-domain">Site</Label>
          <Input id="add-domain" placeholder="instagram.com" required value={domainText} onChange={(e) => setDomainText(e.target.value)} />
        </div>
        <div className="grid w-32 gap-1.5">
          <Label htmlFor="add-minutes">Minutos por dia</Label>
          <Input id="add-minutes" ref={minutesRef} type="number" min="1" max="1440" required className="tabular-nums" value={minutesText} onChange={(e) => setMinutesText(e.target.value)} />
        </div>
        <Button type="submit">Adicionar</Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {domainText && store.normalizeDomain(domainText) in limits && (
        <p className="text-xs text-muted-foreground">Esse site já tem limite. Adicionar troca o limite padrão.</p>
      )}
    </form>
  );
}

function ExtendMessage() {
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    store.getExtendMessage().then((value) => {
      setMessage(value);
      setSaved(value);
    });
  }, []);

  const save = async () => {
    if (message.trim() === saved) return;
    await store.setExtendMessage(message);
    setSaved(message.trim());
    toast.success(message.trim() ? 'Mensagem salva' : 'Mensagem removida');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mensagem ao pedir mais tempo</CardTitle>
        <CardDescription>
          Aparece na tela de bloqueio ao clicar em "Mais 5 min" ou "Mais 10 min", antes de liberar o tempo.
          Em branco, o tempo é liberado direto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          aria-label="Mensagem ao pedir mais tempo"
          maxLength={280}
          placeholder="Tem certeza? Você combinou com você mesmo que ia parar por hoje."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onBlur={save}
        />
      </CardContent>
    </Card>
  );
}

function ClearHistory() {
  const clear = async () => {
    await chrome.storage.local.remove(['usage', 'extensions', 'warned', 'exceeded', 'siteIcons']);
    toast('Histórico apagado');
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">Apagar histórico</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar todo o histórico de uso?</AlertDialogTitle>
          <AlertDialogDescription>Os limites continuam salvos. Isso não pode ser desfeito.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={clear}>Apagar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Limits() {
  const [limits, setLimits] = useState(null);
  const sectionRef = useRef(null);
  const icons = useSiteIcons();

  const refresh = () => store.getLimits().then(setLimits);
  useEffect(() => { refresh(); }, []);
  useStorageChange(LIMIT_KEYS, refresh);

  // O popup abre direto nesta parte da página.
  const ready = limits !== null;
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (ready && (location.hash === '#limites' || params.has('add'))) sectionRef.current.scrollIntoView();
  }, [ready]);

  if (!ready) return null;
  const domains = Object.keys(limits).sort();

  return (
    <section id="limites" ref={sectionRef} className="scroll-mt-20 space-y-4" aria-labelledby="limites-titulo">
      <div>
        <h2 id="limites-titulo" className="text-2xl font-semibold tracking-tight">Sites e limites</h2>
        <p className="text-sm text-muted-foreground">
          Tempo máximo por dia em cada site. Subdomínios entram na conta do site principal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar site</CardTitle>
        </CardHeader>
        <CardContent><AddSite limits={limits} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limites</CardTitle>
          <CardDescription>
            Abra "Por dia da semana" para dar mais ou menos tempo em dias específicos, como no fim de semana.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domains.length
            ? <ul className="divide-y">{domains.map((domain) => <LimitRow key={domain} domain={domain} limit={limits[domain]} icons={icons} />)}</ul>
            : <p className="text-sm text-muted-foreground">Nenhum limite cadastrado.</p>}
        </CardContent>
      </Card>

      <ExtendMessage />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>Tudo fica só neste navegador. O histórico com mais de 90 dias é apagado automaticamente.</p>
        <ClearHistory />
      </div>
    </section>
  );
}
