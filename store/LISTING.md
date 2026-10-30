# Chrome Web Store: textos e respostas

Tudo o que o painel do desenvolvedor pede, na ordem das abas. É só copiar e colar.

## Pacote

Envie `dist/ampulheta-<versão>.zip` (gerado por `npm run package`).

## Página na loja

**Nome** (vem do manifest): Ampulheta

**Resumo** (vem do manifest, até 132 caracteres):

> Limita o tempo em sites escolhidos, com limites por dia da semana, e mostra um resumo semanal todo sábado.

**Descrição:**

```
Passou "só um minutinho" no YouTube e já foi uma hora? A Ampulheta ajuda você a decidir quanto tempo quer gastar em cada site e avisa com calma quando esse tempo acaba.

LIMITES DIÁRIOS
• Escolha um limite em minutos para cada site. O YouTube já vem com 60 minutos.
• Dê mais ou menos tempo em dias específicos, como no sábado e no domingo.
• Um aviso chega quando faltam 5 minutos.
• Quando o limite acaba, o site fica pausado até o dia seguinte. Se precisar mesmo, dá para pedir mais 5 ou 10 minutos uma vez por dia, com uma mensagem sua para pensar duas vezes antes.
• Subdomínios contam juntos: www.youtube.com, m.youtube.com e music.youtube.com entram na conta do youtube.com.

SEMPRE À VISTA
• O ícone da extensão mostra quanto tempo você já passou no site aberto e muda de cor quando faltam 5 minutos.
• Cada site aparece com o próprio ícone, e você escolhe o tema claro, escuro ou o do sistema.

CONTAGEM JUSTA
• Conta só quando a aba está aberta na frente, a janela do Chrome está em foco e você está no computador.
• Vídeo tocando continua contando, mesmo sem mexer no mouse.

RESUMO DA SEMANA
Todo sábado de manhã chega o seu resumo:
• tempo total da semana;
• comparação com a semana anterior;
• em quantos dias você respeitou os limites;
• todos os sites onde você passou tempo, do mais usado ao menos usado;
• gráfico por dia da semana, dividido por site: clique em um dia para ver só os sites dele.
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
| Ícone da loja (128×128) | `public/icons/icon128.png` |
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
| `favicon` | Mostrar o ícone de cada site na lista de sites e nos limites, lendo o cache do próprio Chrome, sem nenhuma requisição de rede. |

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
