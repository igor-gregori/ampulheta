# Política de privacidade da Ampulheta

_Última atualização: 23 de outubro de 2026_

A Ampulheta é uma extensão do Google Chrome que mede quanto tempo você passa em cada site, aplica os limites diários que você escolher e mostra um resumo semanal.

## O que a extensão guarda

Para funcionar, a Ampulheta guarda no armazenamento local do Chrome (`chrome.storage.local`), no seu computador:

- o domínio dos sites que você visitou (por exemplo, `youtube.com`, sem o endereço completo da página) e quantos segundos passou em cada um, por dia;
- os limites diários que você cadastrou;
- se o aviso de 5 minutos, o bloqueio e o "mais 5 min" já aconteceram em cada dia.

Os dados com mais de 90 dias são apagados automaticamente. Você pode apagar todo o histórico a qualquer momento em *Sites e limites → Apagar histórico*, ou removendo a extensão.

## O que a extensão não faz

- Não envia nenhum dado para servidores, nem da Ampulheta nem de terceiros. A extensão não faz nenhuma requisição de rede.
- Não usa contas, cookies de rastreamento, analytics ou publicidade.
- Não vende, compartilha ou transfere dados para ninguém.
- Não lê o conteúdo das páginas que você visita.

## Permissões

| Permissão | Para quê |
| --- | --- |
| `tabs` | Saber o endereço da aba ativa, para contar o tempo no site certo e levar a aba para a tela de bloqueio quando o limite acaba. |
| `storage` | Guardar o tempo por site e os limites no próprio navegador. |
| `idle` | Parar de contar quando você está longe do computador. |
| `alarms` | Gravar o tempo a cada minuto e agendar o aviso, o bloqueio e o resumo de sábado. |
| `notifications` | Mostrar o aviso de 5 minutos e o aviso do resumo semanal. |

## Contato

Dúvidas ou pedidos: abra uma issue em <https://github.com/igor-gregori/ampulheta/issues>.
