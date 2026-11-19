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

Curso completo, 182 lições:

| Fase | Dias | Nível | Conteúdo |
|---|---|---|---|
| 1 | 1–56 | A1 | Pronúncia, apresentação, família, casa, cidade, rotina, comida |
| 2 | 57–112 | A2 | Passado, viagens, trabalho, saúde, pronomes, serviços públicos, imperativo |
| 3 | 113–147 | B1 | Futuro, condicional, conectivos, opinião, e-mails, Itália e cidadania |
| 4 | 148–182 | Prova | Simulados de Ascolto, Lettura, Strutture, Scrittura e Orale |

As lições ficam em `data.js`. Formato de um dia:

```js
{ d: 57, u: 9, t: 'Título', tip: 'Regra do dia',
  w: [['italiano', 'português'], ...],                 // palavras
  s: [['Frase em italiano.', 'Tradução.'], ...],       // frases
  listen: [{ title, text, q: [[pergunta, [opções], índiceCerto]] }],  // escuta
  read:   [{ title, text, q: [...] }],                 // leitura
  cloze:  [['Frase com ___', [opções], índiceCerto]],  // gramática
  write:  { task, min, model },                        // redação
  oral:   { task, model } }                            // prova oral
```

Ao publicar uma atualização, mude `VERSION` em `sw.js` para os aparelhos baixarem a versão nova.

## Tecnologia

HTML, CSS e JavaScript puros, sem dependências. Progresso salvo no navegador (`localStorage`). Áudio pela voz italiana do próprio aparelho.
