# Passaporto B1 🇮🇹

App de italiano para a prova **CILS UNO B1** (cidadania italiana), no estilo de lições curtas diárias: **10 minutos por dia**, do zero ao B1 em 6 meses (182 lições).

## Como usar

**Computador:** abra o link do app no navegador.

**iPhone:** abra o link no **Safari** → botão Compartilhar → **Adicionar à Tela de Início**.
**Android:** abra o link no **Chrome** → menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial").

Depois de instalado, ele abre como aplicativo e funciona sem internet.

## O que tem

- Trilha de lições por unidade, com sequência de dias (🔥), XP (⚡) e meta diária.
- Cada lição: regra do dia, palavras novas com áudio em italiano, múltipla escolha, "toque no que ouviu", pares, montar frases, ditado, escrever em italiano e ler em voz alta (com reconhecimento de voz quando o navegador permite).
- Erros voltam automaticamente nas próximas lições (revisão espaçada).
- Aba **Prova**: as 5 partes do CILS B1, contagem regressiva para a data da prova, contatos da Fundação Torino e frases-curinga para a prova oral.
- Aba **Perfil**: estatísticas, XP da semana, palavras para reforçar e **código de progresso** para passar do computador para o celular (e vice-versa).

## Conteúdo

- **Prontas:** dias 1–112 (Fase 1, nível A1, e Fase 2, nível A2: passado, viagens, trabalho, saúde, pronomes, serviços públicos, imperativo).
- **Próximas:** dias 113–182 (Fases 3 e 4: futuro, condicional, opinião, escrita, Itália e cidadania, simulados).

As lições ficam em `data.js`. Para adicionar dias, siga o mesmo formato:

```js
{ d: 57, u: 9, t: 'Título', tip: 'Regra do dia',
  w: [['italiano', 'português'], ...],   // palavras
  s: [['Frase em italiano.', 'Tradução.'], ...] }  // frases
```

Ao publicar uma atualização, mude `VERSION` em `sw.js` para os aparelhos baixarem a versão nova.

## Tecnologia

HTML, CSS e JavaScript puros, sem dependências. Progresso salvo no navegador (`localStorage`). Áudio pela voz italiana do próprio aparelho.
