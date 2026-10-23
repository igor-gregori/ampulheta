# Ampulheta

Extensão para Google Chrome (Manifest V3) que limita o tempo em sites escolhidos, principalmente o YouTube, e todo sábado mostra um resumo dos sites onde seu tempo foi parar.

Tudo fica no seu navegador (`chrome.storage.local`). Não há servidor, conta ou coleta de dados.

## O que faz

- **Conta o tempo por site** só quando a aba está ativa, a janela do Chrome está em foco e você não está ocioso. Vídeo tocando conta mesmo sem mexer no mouse. `www.youtube.com` e `m.youtube.com` contam como `youtube.com`.
- **Limite diário por site.** O YouTube já vem com 60 min. Faltando 5 min chega um aviso; quando o limite estoura, a aba vai para uma tela de bloqueio com o botão **mais 5 min**, que pode ser usado uma vez por dia por site.
- **Popup** com um anel de progresso do site atual ("38 min de 60 hoje") e o tempo de hoje em cada site.
- **Resumo semanal** (sábado a sexta): tempo total, comparação com a semana anterior, dias em que os limites foram respeitados, ranking dos sites e gráfico por dia. A notificação chega no sábado às 9h e o resumo também abre pelo popup.
- Tema claro e escuro automático. Histórico com mais de 90 dias é apagado sozinho.

## Instalar

1. Baixe ou clone este repositório.
2. Abra `chrome://extensions` e ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta do projeto.

## Testar

- **Limite e bloqueio:** em *Sites e limites*, coloque 1 ou 2 min no YouTube e assista um pouco.
- **Resumo sem esperar o sábado:** abra pelo botão do popup. Para ver com dados de exemplo, sem gravar nada, abra `dashboard/dashboard.html?demo` pela extensão.
- **Console do service worker:** em `chrome://extensions`, link *service worker* da Ampulheta.
- **Testes automatizados** (Node 22+), com um `chrome.*` simulado:

```bash
npm test
```

## Estrutura

```
manifest.json        permissões: tabs, storage, idle, alarms, notifications
background.js        service worker: contagem, limites e alarme de sábado
popup/               anel de progresso e lista de hoje
dashboard/           resumo semanal
blocked/             tela de limite atingido
options/             sites e limites
shared/storage.js    leitura e gravação no chrome.storage.local
shared/theme.css     cores e base comuns
icons/               ícone (icon.svg) e PNGs gerados por tools/make_icons.py
tests/               testes do background com Node
```

HTML, CSS e JavaScript puros com ES modules, sem build e sem dependências.

## Licença

[MIT](LICENSE)
