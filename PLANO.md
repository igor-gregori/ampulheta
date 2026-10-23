# Ampulheta — plano do projeto

Extensão para Google Chrome (Manifest V3) que limita o tempo em sites escolhidos (principalmente o YouTube) e, todo sábado, mostra um dashboard com os sites onde mais se gastou tempo.

## Funcionalidades

### 1. Contagem de tempo
- Conta só quando a aba está ativa, a janela do Chrome está em foco e o usuário não está ocioso (`chrome.idle`, 60s sem atividade).
- Agrupa por domínio: `m.youtube.com` e `www.youtube.com` contam como `youtube.com`.

### 2. Limites
- Cada site tem um limite diário em minutos. O YouTube já vem configurado com 60 min.
- Aviso por notificação quando faltam 5 minutos.
- Quando o limite estoura, a aba é redirecionada para a tela de bloqueio (`blocked/`). Ela mostra o tempo usado e tem um botão "mais 5 min", que pode ser usado no máximo 1x por dia.
- Para depois: limites diferentes em dias úteis e no fim de semana.

### 3. Dashboard semanal
- Todo sábado de manhã chega a notificação "Seu resumo da semana está pronto", que abre o dashboard.
- O dashboard também pode ser aberto a qualquer momento pelo popup.
- Conteúdo:
  - tempo total da semana
  - comparação com a semana anterior (%)
  - quantos dias os limites foram respeitados
  - ranking dos sites (barras)
  - gráfico por dia da semana

## Arquitetura

```
ampulheta/
├── manifest.json        permissões: tabs, storage, idle, alarms, notifications
├── background.js        service worker: contagem, verificação de limites, alarme de sábado
├── popup/               popup.html / .css / .js — anel de progresso + lista de sites
├── dashboard/           dashboard.html / .css / .js — resumo semanal
├── blocked/             blocked.html / .css / .js — tela de "limite atingido"
├── options/             options.html / .css / .js — cadastro de sites e limites
├── shared/storage.js    funções de leitura/gravação no chrome.storage.local
└── icons/               16, 32, 48, 128 px
```

- **Armazenamento:** `chrome.storage.local`, sem servidor e com tudo local.
  - Uso diário em segundos: `usage: { "2026-10-23": { "youtube.com": 2280 } }`
  - Limites em minutos: `limits: { "youtube.com": 60 }`
  - Extensões do dia: `extensions: { "2026-10-23": { "youtube.com": true } }`
- **Precisão:** um `chrome.alarms` roda a cada 1 minuto e grava o tempo acumulado. O service worker do MV3 é encerrado pelo Chrome, então nada de estado só em memória.
- **Stack:** HTML, CSS e JS puros (ES modules), sem build. Gráficos em CSS ou com Chart.js, se precisar.

## Design
- Visual limpo e plano, com bordas finas e bastante espaço em branco.
- Cor principal verde-azulada calma (`#1D9E75`, clara `#9FE1CB`, escura `#0F6E56`). Vermelho só para "bloqueado".
- Tema claro e escuro automático (`prefers-color-scheme`), com cores definidas como variáveis CSS em `:root`.
- Popup: o anel de progresso do site atual é o elemento central ("38 min de 60 hoje").
- Tela de bloqueio: tom gentil, com uma frase curta, o tempo usado e o botão "mais 5 min".
- Ícone: ampulheta simples na cor principal.

## Etapas
1. **Esqueleto:** `manifest.json` e contagem de tempo no `background.js`. Validar pelo console do service worker.
2. **Popup:** anel de progresso e tempo de hoje por site.
3. **Opções e bloqueio:** cadastro de limites, redirecionamento e "mais 5 min".
4. **Dashboard:** agregação semanal, gráficos e notificação de sábado.
5. **Acabamento:** ícones, tema escuro e limpeza de dados com mais de 90 dias.

## Como testar
1. Abrir `chrome://extensions` e ativar o "Modo do desenvolvedor".
2. Clicar em "Carregar sem compactação" e selecionar a pasta `ampulheta/`.
3. Para testar rápido, definir um limite de 1–2 min no YouTube e conferir o aviso e o bloqueio.
4. Para testar o dashboard sem esperar o sábado, abrir pelo botão do popup. Dá para inserir dados falsos no `chrome.storage.local` pelo console.

## Decisões tomadas
- **Nome:** Ampulheta.
- **Ao estourar o limite:** tela de bloqueio com botão "mais 5 min", que pode ser usado 1x por dia por site.
- **Vídeo sem mexer no mouse:** a aba que está tocando áudio continua contando mesmo com o `chrome.idle` em "ocioso". Sem isso, assistir YouTube parado deixaria de contar depois de 60 s. Tela bloqueada nunca conta.
- **Semana do resumo:** de sábado a sexta. A notificação sai no sábado às 9h e abre a semana que acabou de terminar. Pelo popup abre a semana atual, comparada com os mesmos dias da semana anterior.
- **"Limites respeitados":** dias em que nenhum site chegou ao bloqueio (registro `exceeded` por dia), contados a partir do primeiro dia com dados.
- **Gráficos:** feitos em CSS, sem Chart.js.
- **Precisão do bloqueio:** além do alarme de 1 min, um alarme extra é agendado para o momento exato do aviso ou do bloqueio. Cada gravação soma no máximo 2 min, para não contar horas se o computador dormir com o Chrome em foco.
