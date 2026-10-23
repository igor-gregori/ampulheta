# Chrome Web Store: textos e respostas

Tudo o que o painel do desenvolvedor pede, na ordem das abas. É só copiar e colar.

## Pacote

Envie `dist/ampulheta-<versão>.zip` (gerado por `npm run package`).

## Página na loja

**Nome** (vem do manifest): Ampulheta

**Resumo** (vem do manifest, até 132 caracteres):

> Limita o tempo em sites escolhidos e mostra um resumo semanal todo sábado.

**Descrição:**

```
Passou "só um minutinho" no YouTube e já foi uma hora? A Ampulheta ajuda você a decidir quanto tempo quer gastar em cada site e avisa com calma quando esse tempo acaba.

LIMITES DIÁRIOS
• Escolha um limite em minutos para cada site. O YouTube já vem com 60 minutos.
• Um aviso chega quando faltam 5 minutos.
• Quando o limite acaba, o site fica pausado até o dia seguinte. Se precisar mesmo, o botão "Mais 5 min" pode ser usado uma vez por dia.
• Subdomínios contam juntos: www.youtube.com, m.youtube.com e music.youtube.com entram na conta do youtube.com.

CONTAGEM JUSTA
• Conta só quando a aba está aberta na frente, a janela do Chrome está em foco e você está no computador.
• Vídeo tocando continua contando, mesmo sem mexer no mouse.

RESUMO DA SEMANA
Todo sábado de manhã chega o seu resumo:
• tempo total da semana;
• comparação com a semana anterior;
• em quantos dias você respeitou os limites;
• ranking dos sites onde você mais passou tempo;
• gráfico por dia da semana.
O resumo também abre a qualquer momento pelo botão da extensão.

PRIVACIDADE
Tudo fica só no seu navegador. Não há conta, servidor, anúncios ou rastreamento, e a extensão não faz nenhuma requisição de rede. O histórico com mais de 90 dias é apagado automaticamente.

Código aberto: https://github.com/igor-gregori/ampulheta
```

**Categoria:** Produtividade (Ferramentas, se o painel pedir subcategoria)

**Idioma:** Português (Brasil)

**Imagens:**

| Campo | Arquivo |
| --- | --- |
| Ícone da loja (128×128) | `icons/icon128.png` |
| Capturas de tela (1280×800) | `store/screenshot-1.jpg` a `store/screenshot-5.jpg`, nessa ordem |
| Bloco promocional pequeno (440×280) | `store/promo-small-440x280.jpg` |
| Bloco promocional de destaque (1400×560) | `store/promo-marquee-1400x560.jpg` |

**Site oficial:** https://github.com/igor-gregori/ampulheta

**URL de suporte:** https://github.com/igor-gregori/ampulheta/issues

## Privacidade

**Finalidade única:**

```
Ajudar a pessoa a controlar o tempo gasto em sites: mede o tempo em cada site, aplica limites diários escolhidos por ela e mostra um resumo semanal desse uso.
```

**Justificativa das permissões:**

| Permissão | Justificativa |
| --- | --- |
| `tabs` | Ler o endereço da aba ativa para saber em qual site o tempo está sendo gasto e redirecionar a aba para a tela de bloqueio da própria extensão quando o limite diário acaba. |
| `storage` | Guardar localmente o tempo por site, os limites escolhidos e o histórico usado no resumo semanal. |
| `idle` | Parar a contagem quando a pessoa está longe do computador ou com a tela bloqueada, para não contar tempo que não foi usado. |
| `alarms` | Gravar o tempo a cada minuto (o service worker pode ser encerrado), agendar o aviso de 5 minutos e o bloqueio, e disparar o resumo de sábado. |
| `notifications` | Avisar quando faltam 5 minutos para o limite e quando o resumo da semana está pronto. |

**Usa código remoto?** Não. Todo o JavaScript está no pacote.

**Uso de dados:** marque **Histórico da Web** (a extensão registra o domínio e o tempo em cada site). Os dados nunca saem do navegador, mas declarar é o caminho mais seguro na revisão. Marque também as três declarações:

- Não vendo nem transfiro dados de usuários a terceiros, fora dos casos de uso aprovados.
- Não uso nem transfiro dados de usuários para fins não relacionados à finalidade única do item.
- Não uso nem transfiro dados de usuários para determinar capacidade de crédito ou para fins de empréstimo.

**URL da política de privacidade:** https://github.com/igor-gregori/ampulheta/blob/main/PRIVACY.md

## Distribuição

- **Pagamento:** gratuito
- **Visibilidade:** público
- **Regiões:** todas
