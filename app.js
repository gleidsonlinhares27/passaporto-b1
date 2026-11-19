'use strict';
/* Passaporto B1 — app de italiano para a prova B1 Cittadinanza.
   Tudo roda no navegador; o progresso fica salvo no aparelho (localStorage). */

const C = window.CURSO;
const TOTAL_DAYS = 182;
const KEY = 'passaporto-b1:v1';
const $ = (s, el = document) => el.querySelector(s);

/* ================= utilidades ================= */
function h(tag, a, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(a || {})) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(c));
  }
  return e;
}
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
const pick = a => a[Math.floor(Math.random() * a.length)];
const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };

// Normaliza para comparar respostas: sem acento, sem pontuação, minúsculas.
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’`´]/g, "'").replace(/[.,!?;:¿¡"«»()…]/g, ' ').replace(/'\s*/g, "' ").replace(/\s+/g, ' ').trim();
const stripPunct = s => s.replace(/[.,!?;:]+$/g, '');

function lev(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
// 'ok' exato, 'typo' quase certo (aceita com aviso), false errado.
function compare(given, target) {
  const g = norm(given), t = norm(target);
  if (!g) return false;
  if (g === t) return given.trim().toLowerCase().replace(/[.!?]$/, '') === target.toLowerCase().replace(/[.!?]$/, '') || !/[àèéìòù]/i.test(target) ? 'ok' : 'accent';
  return lev(g, t) <= Math.max(1, Math.floor(t.length * 0.06)) ? 'typo' : false;
}

/* ================= estado ================= */
const blank = () => ({ done: {}, xp: 0, streak: 0, best: 0, last: null, mistakes: {}, log: {}, exam: '', unlockAll: false, sound: true });
let st = load();
function load() { try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return blank(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* modo privado */ } }
const liveStreak = () => (st.last === ymd() || st.last === daysAgo(1)) ? st.streak : 0;
const doneToday = () => !!st.log[ymd()];

/* ================= conteúdo ================= */
const DAYS = C.days;
const byDay = Object.fromEntries(DAYS.map(x => [x.d, x]));
const unitOf = id => C.units.find(u => u.id === id);
const wordsOf = x => (x.w || []).map(([it, pt]) => ({ it, pt, d: x.d }));
const sentsOf = x => (x.s || []).map(([it, pt]) => ({ it, pt, d: x.d }));
const ALL_W = DAYS.flatMap(wordsOf);
const ALL_S = DAYS.flatMap(sentsOf);
const nextDay = () => { for (const x of DAYS) if (!st.done[x.d]) return x.d; return null; };
const isOpen = d => !!byDay[d] && (st.unlockAll || d === DAYS[0].d || !!st.done[d - 1] || !!st.done[d]);
const phaseOf = d => d <= 56 ? 1 : d <= 112 ? 2 : d <= 147 ? 3 : 4;

/* ================= áudio ================= */
let itVoice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const v = speechSynthesis.getVoices().filter(x => /^it/i.test(x.lang));
  itVoice = v.find(x => /Alice|Federica|Luca|Paola|Google|Elsa/i.test(x.name)) || v[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text, slow) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'it-IT'; if (itVoice) u.voice = itVoice;
  u.rate = slow ? 0.6 : 0.92;
  speechSynthesis.speak(u);
}
let actx = null;
function beep(good) {
  if (!st.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = good ? [660, 880] : [220, 180];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.11;
      o.type = good ? 'sine' : 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(good ? 0.18 : 0.06, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.18);
    });
  } catch (e) { /* sem áudio */ }
}
const spk = (text, cls = '') => h('button', { class: 'spk ' + cls, 'aria-label': 'Ouvir', onclick: e => { e.stopPropagation(); say(text, cls.includes('slow')); } }, cls.includes('slow') ? '🐢' : '🔊');

/* ================= montagem da lição ================= */
function wordEx(w, kind) {
  const pool = ALL_W.filter(o => o.it !== w.it && o.pt !== w.pt);
  const near = pool.filter(o => o.d <= w.d && o.d >= w.d - 14); // só palavras já vistas
  const others = sample(near.length >= 3 ? near : pool, 3);
  if (kind === 'listen') return { type: 'listen', key: w.it, it: w.it, answer: w.it, options: shuffle([w.it, ...others.map(o => o.it)]) };
  if (kind === 'mc_pt') return { type: 'mc', key: w.it, title: 'Como se diz em italiano?', q: w.pt, answer: w.it, speakAnswer: true, options: shuffle([w.it, ...others.map(o => o.it)]) };
  return { type: 'mc', key: w.it, title: 'O que significa?', q: w.it, qIt: true, answer: w.pt, options: shuffle([w.pt, ...others.map(o => o.pt)]) };
}
function sentEx(s, kind) {
  if (kind === 'build') {
    const toks = s.it.split(' ').map(stripPunct);
    const have = new Set(toks.map(norm));
    const seen = o => !s.d || o.d <= s.d; // distratores só do que já foi ensinado
    const pool = [...ALL_S.filter(o => o.it !== s.it && seen(o)).flatMap(o => o.it.split(' ')), ...ALL_W.filter(seen).map(o => o.it)]
      .map(stripPunct).filter(t => t && !t.includes('?') && !have.has(norm(t)));
    const extra = sample([...new Set(pool)], 3);
    return { type: 'build', key: s.it, it: s.it, pt: s.pt, bank: shuffle([...toks, ...extra]) };
  }
  if (kind === 'dictation') return { type: 'dictation', key: s.it, it: s.it, pt: s.pt };
  return { type: 'type', key: s.it, it: s.it, pt: s.pt };
}
function reviewItems(x, n) {
  const exclude = new Set(wordsOf(x).map(w => w.it));
  const out = [];
  // 1) erros anteriores, os mais frequentes primeiro
  const errs = Object.entries(st.mistakes).filter(([k]) => !exclude.has(k)).sort((a, b) => b[1].n - a[1].n).slice(0, n);
  for (const [k, m] of errs) out.push(m.s ? sentEx({ it: k, pt: m.pt }, 'type') : wordEx({ it: k, pt: m.pt, d: m.d || x.d }, pick(['mc_it', 'mc_pt', 'listen'])));
  // 2) revisão espaçada: ontem, 3 e 7 dias antes
  for (const back of [1, 3, 7, 14, 21, 30, 45, 60, 90]) {
    if (out.length >= n) break;
    const y = byDay[x.d - back];
    if (!y || y.r || !y.w) continue;
    const w = pick(wordsOf(y).filter(w => !exclude.has(w.it)));
    if (w) out.push(wordEx(w, pick(['mc_it', 'mc_pt', 'listen'])));
  }
  return out.slice(0, n).map(i => ({ ...i, review: true }));
}
function buildLesson(x) {
  const items = [];
  let W, S;
  if (x.r) {
    const prev = DAYS.filter(y => !y.r && y.d < x.d);
    const from = x.all ? prev : x.cp ? prev.filter(y => y.d > x.d - 28) : prev.filter(y => y.u === x.u);
    const nw = x.cp || x.all ? 10 : 8, ns = x.cp || x.all ? 6 : 4;
    W = sample(from.flatMap(wordsOf), nw);
    S = sample(from.flatMap(sentsOf), ns);
    // unidades de simulado têm poucas palavras: completa com o resto do curso
    if (W.length < nw) W.push(...sample(prev.flatMap(wordsOf).filter(w => !W.includes(w)), nw - W.length));
    if (S.length < ns) S.push(...sample(prev.flatMap(sentsOf).filter(s => !S.includes(s)), ns - S.length));
    items.push({ type: 'tip', title: x.cp ? '🏆 Checkpoint' : '⭐ Revisão', text: x.tip });
    if (x.all) items.push(...reviewItems(x, 6));
  } else {
    W = wordsOf(x); S = sentsOf(x);
    items.push({ type: 'tip', title: W.length ? 'Regra do dia' : '🎓 Treino de prova', text: x.tip });
    if (W.length) items.push({ type: 'words', words: W });
  }
  const kinds = ['mc_it', 'listen', 'mc_pt'];
  const wex = shuffle(W.map((w, i) => wordEx(w, kinds[i % 3])));
  items.push(...wex.slice(0, Math.ceil(wex.length / 2)));
  if (W.length >= 3) items.push({ type: 'match', pairs: sample(W, Math.min(5, W.length)) });
  items.push(...wex.slice(Math.ceil(wex.length / 2)));
  if (!x.r) items.push(...reviewItems(x, 3));
  const sk = x.dict ? ['dictation', 'dictation', 'dictation', 'dictation'] : ['build', 'dictation', 'type', 'build', 'dictation', 'type'];
  S.forEach((s, i) => items.push(sentEx(s, sk[i])));
  if (x.cp && W.length >= 3) items.push({ type: 'match', pairs: sample(W, Math.min(5, W.length)) });
  items.push(...examItems(x));
  if (S.length) items.push({ type: 'speak', key: S[0].it, it: S[0].it, pt: S[0].pt });
  return items;
}
// Exercícios no formato da prova: ascolto, lettura, strutture, scrittura, orale.
function examItems(x) {
  const out = [];
  const passage = (p, audio) => p.q.forEach(([q, opts, a], i) =>
    out.push({ type: 'reading', audio, title: p.title, text: p.text, q, options: shuffle(opts), answer: opts[a], first: i === 0 }));
  (x.listen || []).forEach(p => passage(p, true));
  (x.read || []).forEach(p => passage(p, false));
  for (const [q, opts, a] of x.cloze || [])
    out.push({ type: 'mc', title: q.includes('___') ? 'Complete a frase' : 'Escolha a opção correta', q, options: shuffle(opts), answer: opts[a], full: q.includes('___') ? q.replace('___', opts[a]).replace(/\s*\(.*\)$/, '') : null });
  [].concat(x.write || []).forEach(w => out.push({ type: 'write', ...w }));
  [].concat(x.oral || []).forEach(o => out.push({ type: 'oral', ...o }));
  return out;
}
const graded = i => !['tip', 'words'].includes(i.type);

/* ================= navegação ================= */
let view = 'home';
let L = null; // lição em andamento
const app = $('#app');
function go(v) { view = v; L = null; render(); window.scrollTo(0, 0); }
function render() {
  app.replaceChildren();
  if (view === 'lesson') return renderLesson();
  if (view === 'end') return renderEnd();
  app.append(topBar());
  const m = h('main');
  if (view === 'home') renderHome(m);
  if (view === 'prova') renderProva(m);
  if (view === 'perfil') renderPerfil(m);
  app.append(m, navBar());
  if (view === 'home') { const cur = $('.node.current'); if (cur) cur.scrollIntoView({ block: 'center' }); }
}
function topBar() {
  const s = liveStreak(), nd = nextDay();
  return h('header', { class: 'top' },
    h('div', { class: 'logo' }, h('span', { class: 'flag' }, h('i'), h('i'), h('i')), 'Passaporto'),
    h('div', { class: 'stat', title: 'Dia do curso' }, '📅 ', nd ? `${nd}/${TOTAL_DAYS}` : '✓'),
    h('div', { class: 'stat fire' + (doneToday() ? '' : ' off'), title: 'Dias seguidos' }, '🔥 ', String(s)),
    h('div', { class: 'stat xp', title: 'Pontos de experiência' }, '⚡ ', String(st.xp)));
}
function navBar() {
  const b = (id, ico, label) => h('button', { class: view === id ? 'on' : '', onclick: () => go(id) }, h('span', {}, ico), label);
  return h('nav', { class: 'nav' }, b('home', '🏠', 'Aprender'), b('prova', '🎓', 'Prova'), b('perfil', '👤', 'Perfil'));
}
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = h('div', { class: 'toast' }, msg); document.body.append(t); setTimeout(() => t.remove(), 2600);
}
function sheet(...content) {
  const v = h('div', { class: 'veil', onclick: e => { if (e.target === v) v.remove(); } }, h('div', { class: 'sheet' }, ...content));
  document.body.append(v); return v;
}

/* ================= tela: trilha ================= */
function renderHome(m) {
  const nd = nextDay();
  m.append(h('div', { class: 'goal' + (doneToday() ? ' ok' : '') },
    h('div', { class: 'ico' }, doneToday() ? '✅' : '🎯'),
    h('div', {}, h('b', {}, doneToday() ? 'Meta de hoje cumprida!' : 'Meta de hoje: 1 lição'),
      h('small', {}, doneToday() ? 'Volte amanhã para manter a sequência 🔥' : 'Cerca de 10 minutos. Comece pelo círculo que está pulando.'))));

  for (const u of C.units) {
    const ud = DAYS.filter(x => x.u === u.id);
    const sec = h('section', { class: 'unit' + (ud.length ? '' : ' locked'), style: `--c:${u.color}` });
    sec.append(h('div', { class: 'unit-banner' },
      h('div', {}, h('small', {}, `FASE ${u.phase} · UNIDADE ${u.id}`), h('h2', {}, u.title)),
      h('span', { class: 'cnt' }, ud.length ? `${ud.filter(x => st.done[x.d]).length}/${ud.length}` : '🔒 em breve')));
    if (!ud.length) { sec.append(h('p', { class: 'desc' }, u.desc || '')); m.append(sec); continue; }
    const lane = h('div', { class: 'lane' });
    ud.forEach((x, i) => {
      const done = !!st.done[x.d], open = isOpen(x.d), cur = x.d === nd;
      const cls = 'node' + (done ? ' done' : '') + (!open ? ' locked' : '') + (cur ? ' current' : '');
      const icon = !open ? '🔒' : x.cp ? '🏆' : x.r ? '★' : done ? '✓' : String(x.d);
      const off = Math.round(Math.sin(i * 0.95) * 70);
      lane.append(h('div', { class: 'node-wrap', style: `transform:translateX(${off}px)` },
        cur ? h('div', { class: 'bubble' }, 'COMEÇAR') : null,
        h('button', { class: cls, 'aria-label': `Dia ${x.d}: ${x.t}`, onclick: () => openDay(x) }, icon),
        h('div', { class: 'node-label' }, `Dia ${x.d}`)));
    });
    sec.append(lane); m.append(sec);
  }
  const lastD = DAYS[DAYS.length - 1].d;
  m.append(h('p', { class: 'note', style: 'text-align:center;margin:10px 0 30px' }, lastD >= TOTAL_DAYS
    ? `Fim da trilha: ${TOTAL_DAYS} lições até a prova. In bocca al lupo! 🍀`
    : `Lições prontas: dias 1 a ${lastD} de ${TOTAL_DAYS}. As próximas unidades serão liberadas em atualizações.`));
}
function openDay(x) {
  if (!isOpen(x.d)) return toast(`Conclua o dia ${x.d - 1} primeiro.`);
  const done = st.done[x.d];
  const v = sheet(
    h('span', { class: 'tag' + (x.r ? ' rev' : '') }, `Dia ${x.d} · ${unitOf(x.u).title}`),
    h('h3', {}, x.t),
    h('p', {}, done ? `Concluído em ${done.date.split('-').reverse().join('/')} · precisão ${done.acc}%` : x.r ? 'Lição de revisão com as palavras e frases das últimas aulas.'
      : [x.w && `${x.w.length} palavras novas`, x.s && `${x.s.length} frases`, x.listen && '🎧 escuta', x.read && '📖 leitura',
        x.cloze && '🧩 gramática', x.write && '✍️ redação', x.oral && '🗣️ prova oral'].filter(Boolean).join(' · ') + '.'),
    h('button', { class: 'btn', onclick: () => { v.remove(); startLesson(x.d); } }, done ? 'Refazer (+5 XP)' : 'Começar (+10 XP)'));
}

/* ================= tela: lição ================= */
function startLesson(d) {
  const items = buildLesson(byDay[d]);
  L = { d, queue: items, i: 0, total: items.filter(graded).length, ok: 0, errors: 0, start: Date.now(), phase: 'answer' };
  view = 'lesson'; render();
  clearInterval(startLesson.t);
  startLesson.t = setInterval(() => { const t = $('.timer'); if (!t || view !== 'lesson') return clearInterval(startLesson.t); t.textContent = fmtTime(Date.now() - L.start); }, 1000);
}
const fmtTime = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function renderLesson() {
  const item = L.queue[L.i];
  const wrap = h('div', { class: 'lesson' });
  wrap.append(h('div', { class: 'lesson-top' },
    h('button', { class: 'x', 'aria-label': 'Sair', onclick: () => { if (confirm('Sair da lição? O progresso desta lição será perdido.')) go('home'); } }, '✕'),
    h('div', { class: 'bar' }, h('i', { style: `width:${Math.round(100 * L.ok / Math.max(1, L.total))}%` })),
    h('div', { class: 'timer' }, fmtTime(Date.now() - L.start))));
  const stage = h('div', { class: 'stage' });
  const foot = h('div', { class: 'foot' });
  const btn = h('button', { class: 'btn', disabled: true }, 'Verificar');
  foot.append(btn);
  wrap.append(stage, foot);
  app.append(wrap);

  const ctl = EX[item.type](item, stage, {
    ready: on => { btn.disabled = !on; },
    finish: (ok, extra) => result(ok, extra),
  });
  if (item.review) stage.prepend(h('span', { class: 'tag rev' }, '↺ Revisão'));

  if (!graded(item)) { btn.disabled = false; btn.textContent = 'Continuar'; btn.onclick = next; }
  else if (ctl.auto) foot.style.visibility = 'hidden'; // pares e fala terminam sozinhos
  else btn.onclick = () => { const r = ctl.check(); if (r) result(r.ok, r); };
  app.onkeydown = null;
  document.onkeydown = e => {
    if (e.key !== 'Enter' || view !== 'lesson') return;
    if (e.target.dataset?.multi) return; // redação: Enter quebra linha
    if (e.target.tagName === 'TEXTAREA') e.preventDefault();
    const b = $('.foot .btn'); if (b && !b.disabled) b.click();
  };

  function result(ok, r = {}) {
    if (L.phase !== 'answer') return;
    L.phase = 'feedback';
    beep(ok);
    stage.querySelectorAll('button, textarea').forEach(el => { if (!el.classList.contains('spk')) el.disabled = true; });
    if (ok) {
      L.ok++;
      if (item.key && item.review && st.mistakes[item.key]) { if (--st.mistakes[item.key].n <= 0) delete st.mistakes[item.key]; }
    } else {
      L.errors++;
      L.queue.push({ ...item, retry: true, options: item.options && shuffle(item.options), bank: item.bank && shuffle(item.bank) });
      if (item.key) {
        const s = ALL_S.find(o => o.it === item.key), w = ALL_W.find(o => o.it === item.key);
        const src = s || w;
        if (src) st.mistakes[item.key] = { pt: src.pt, s: !!s, d: src.d, n: (st.mistakes[item.key]?.n || 0) + 1 };
      }
      save();
    }
    $('.bar i').style.width = `${Math.round(100 * L.ok / Math.max(1, L.total))}%`;
    const msgOk = r.note || pick(['Muito bem!', 'Perfetto!', 'Bravo!', 'Ottimo!', 'Isso aí!']);
    foot.className = 'foot ' + (ok ? 'ok' : 'bad');
    foot.style.visibility = '';
    foot.replaceChildren(
      h('div', { class: 'fb' }, h('div', { class: 'big' }, ok ? '✅' : '❌'),
        h('div', {}, h('b', {}, ok ? msgOk : 'Resposta correta:'),
          !ok || r.note ? h('div', { class: 'sol' }, r.solution || item.answer || item.it) : null,
          item.pt && item.type !== 'mc' ? h('div', { class: 'sub' }, item.pt) : null)),
      h('button', { class: 'btn' + (ok ? '' : ' red'), onclick: next }, 'Continuar'));
    const audio = r.audio || (item.it && item.type !== 'listen' ? item.it : null) || (item.speakAnswer ? item.answer : null);
    if (audio) say(audio);
  }
}
function next() {
  L.i++; L.phase = 'answer';
  if (L.i >= L.queue.length) return finishLesson();
  app.replaceChildren(); renderLesson();
}
function finishLesson() {
  const d = L.d, first = !st.done[d], acc = Math.round(100 * L.total / (L.total + L.errors));
  const xp = (first ? 10 : 5) + (L.errors === 0 ? 5 : 0);
  const today = ymd();
  if (st.last !== today) { st.streak = st.last === daysAgo(1) ? st.streak + 1 : 1; st.last = today; }
  st.best = Math.max(st.best, st.streak);
  st.xp += xp; st.log[today] = (st.log[today] || 0) + xp;
  st.done[d] = { date: today, acc: Math.max(acc, st.done[d]?.acc || 0) };
  save();
  L.summary = { xp, acc, time: Date.now() - L.start, d };
  view = 'end'; render();
}

/* ================= tipos de exercício ================= */
const EX = {
  tip(item, el) {
    el.append(h('span', { class: 'tag' }, item.title), h('h2', {}, byDay[L.d].t),
      h('div', { class: 'card tip-card' }, item.text));
    return {};
  },
  words(item, el) {
    el.append(h('span', { class: 'tag' }, 'Palavras novas'), h('h2', {}, 'Toque para ouvir e repita em voz alta'),
      h('ul', { class: 'words card' }, item.words.map(w =>
        h('li', { onclick: () => say(w.it) }, spk(w.it), h('div', {}, h('div', { class: 'it' }, w.it), h('div', { class: 'pt' }, w.pt))))));
    if (item.words[0]) setTimeout(() => say(item.words[0].it), 300);
    return {};
  },
  mc(item, el, api) {
    let sel = null;
    el.append(h('h2', {}, item.title),
      h('div', { class: 'prompt' }, item.qIt ? spk(item.q) : null, h('div', { class: 'txt' }, item.q)));
    const opts = h('div', { class: 'opts' }, item.options.map(o => h('button', {
      class: 'opt', onclick: e => {
        sel = o; opts.querySelectorAll('.opt').forEach(b => b.classList.remove('sel')); e.currentTarget.classList.add('sel');
        if (item.speakAnswer) say(o);
        api.ready(true);
      }
    }, o)));
    el.append(opts);
    if (item.qIt) setTimeout(() => say(item.q), 300);
    return { check: () => ({ ok: sel === item.answer, solution: item.full || item.answer, audio: item.full }) };
  },
  reading(item, el, api) {
    let sel = null;
    el.append(h('span', { class: 'tag' }, item.audio ? '🎧 Ascolto' : '📖 Lettura'));
    if (item.audio) {
      el.append(h('p', { class: 'note' }, item.first ? 'Leia a pergunta, depois ouça (pode ouvir 2 vezes).' : 'Mesmo áudio. Ouça de novo se precisar.'),
        h('div', { class: 'listen-row' }, spk(item.text, 'big'), spk(item.text, 'slow')));
    } else {
      el.append(h('div', { class: 'card passage' }, item.title ? h('b', {}, item.title) : null, h('p', {}, item.text)));
    }
    el.append(h('h2', {}, item.q));
    const opts = h('div', { class: 'opts' }, item.options.map(o => h('button', {
      class: 'opt', onclick: e => { sel = o; opts.querySelectorAll('.opt').forEach(b => b.classList.remove('sel')); e.currentTarget.classList.add('sel'); api.ready(true); }
    }, o)));
    el.append(opts);
    return {
      check: () => {
        if (item.audio) el.append(h('div', { class: 'card passage', style: 'margin-top:16px' }, h('b', {}, 'Transcrição'), h('p', {}, item.text)));
        return { ok: sel === item.answer, solution: item.answer };
      }
    };
  },
  write(item, el, api) {
    const words = () => ta.value.trim().split(/\s+/).filter(Boolean).length;
    el.append(h('span', { class: 'tag' }, '✍️ Scrittura'), h('h2', {}, 'Escreva em italiano'),
      h('div', { class: 'card tip-card' }, item.task),
      h('p', { class: 'note' }, `Escreva pelo menos ${item.min} palavras. Depois compare com a resposta-modelo.`));
    const count = h('div', { class: 'note', style: 'text-align:right;margin-top:6px' }, '0 palavras');
    const ta = h('textarea', { 'data-multi': '1', style: 'min-height:200px', placeholder: 'Scrivi qui…', spellcheck: 'false',
      oninput: () => { const n = words(); count.textContent = `${n} palavras`; api.ready(n >= Math.ceil(item.min * 0.6)); } });
    el.append(ta, count);
    return {
      check: () => {
        const n = words();
        const model = h('div', { class: 'card', style: 'margin-top:16px' }, h('span', { class: 'tag' }, 'Resposta-modelo'),
          h('div', { style: 'white-space:pre-line;font-size:16px' }, item.model),
          h('p', { class: 'note' }, 'Compare: estrutura, conectivos, tempos verbais. Para uma correção detalhada, copie seu texto e peça ao professor no Claude: "corrigir: …"'));
        el.append(model); setTimeout(() => model.scrollIntoView({ behavior: 'smooth' }), 60);
        return { ok: true, note: n >= item.min ? 'Texto entregue!' : `Entregue com ${n} palavras. Na prova, escreva pelo menos ${item.min}.`, solution: 'Compare com a resposta-modelo acima.' };
      }
    };
  },
  oral(item, el, api) {
    el.append(h('span', { class: 'tag' }, '🗣️ Orale'), h('h2', {}, 'Responda em voz alta'),
      h('div', { class: 'card tip-card' }, item.task),
      h('p', { class: 'note' }, 'Fale por cerca de 1 minuto, como na prova. Se puder, grave no celular e ouça depois.'));
    const model = h('div', { class: 'card', style: 'display:none;margin-top:16px' }, h('span', { class: 'tag' }, 'Resposta-modelo'),
      h('div', { class: 'prompt', style: 'margin:6px 0 0;align-items:flex-start' }, spk(item.model), h('div', { style: 'white-space:pre-line;font-size:16px;line-height:1.5' }, item.model)));
    const done = h('button', { class: 'btn', style: 'margin-top:16px', onclick: () => api.finish(true, { note: 'Ótimo treino!', solution: 'Repita a resposta-modelo em voz alta mais uma vez.' }) }, 'Pronto, terminei');
    const show = h('button', { class: 'btn blue', style: 'margin-top:16px', onclick: () => { model.style.display = ''; show.replaceWith(done); say(item.model); setTimeout(() => model.scrollIntoView({ behavior: 'smooth' }), 60); } }, 'Já falei — ver modelo');
    el.append(show, model);
    return { auto: true };
  },
  listen(item, el, api) {
    let sel = null;
    el.append(h('h2', {}, 'Toque no que você ouviu'),
      h('div', { class: 'listen-row' }, spk(item.it, 'big'), spk(item.it, 'slow')));
    const opts = h('div', { class: 'opts' }, item.options.map(o => h('button', {
      class: 'opt', onclick: e => { sel = o; opts.querySelectorAll('.opt').forEach(b => b.classList.remove('sel')); e.currentTarget.classList.add('sel'); api.ready(true); }
    }, o)));
    el.append(opts);
    setTimeout(() => say(item.it), 300);
    const w = ALL_W.find(o => o.it === item.it);
    return { check: () => ({ ok: sel === item.answer, solution: item.answer + (w ? ` — ${w.pt}` : ''), audio: item.it }) };
  },
  match(item, el, api) {
    el.append(h('h2', {}, 'Toque nos pares'));
    const left = h('div', { class: 'col' }), right = h('div', { class: 'col' });
    let a = null, b = null, left_n = item.pairs.length, mistakes = 0;
    const tryPair = () => {
      if (!a || !b) return;
      const A = a, B = b; a = b = null;
      if (A.dataset.k === B.dataset.k) {
        [A, B].forEach(x => { x.classList.remove('sel'); x.classList.add('gone'); });
        if (--left_n === 0) setTimeout(() => api.finish(true, { note: mistakes ? 'Pares completos!' : 'Perfetto!', solution: ' ' }), 250);
      } else {
        mistakes++; beep(false);
        [A, B].forEach(x => { x.classList.remove('sel'); x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 400); });
      }
    };
    const mk = (txt, k, side) => h('button', {
      class: 'opt', 'data-k': k, onclick: e => {
        const t = e.currentTarget;
        if (side === 'L') { a?.classList.remove('sel'); a = t; say(txt); } else { b?.classList.remove('sel'); b = t; }
        t.classList.add('sel'); tryPair();
      }
    }, txt);
    shuffle(item.pairs).forEach((p, i) => left.append(mk(p.it, p.it, 'L')));
    shuffle(item.pairs).forEach(p => right.append(mk(p.pt, p.it, 'R')));
    el.append(h('div', { class: 'match' }, left, right));
    return { auto: true };
  },
  build(item, el, api) {
    el.append(h('h2', {}, 'Traduza para o italiano'), h('div', { class: 'prompt' }, h('div', { class: 'txt' }, item.pt)));
    const ans = h('div', { class: 'answer' }), bank = h('div', { class: 'bank' });
    const chosen = [];
    const refresh = () => {
      ans.replaceChildren(...chosen.map((c, idx) => h('button', { class: 'tok', onclick: () => { c.src.classList.remove('used'); chosen.splice(idx, 1); refresh(); } }, c.t)));
      api.ready(chosen.length > 0);
    };
    item.bank.forEach(t => {
      const b = h('button', { class: 'tok', onclick: () => { if (b.classList.contains('used')) return; b.classList.add('used'); chosen.push({ t, src: b }); say(t); refresh(); } }, t);
      bank.append(b);
    });
    el.append(ans, bank);
    return { check: () => { const r = compare(chosen.map(c => c.t).join(' '), item.it); return { ok: !!r, solution: item.it, note: r === 'accent' ? 'Certo! Atenção aos acentos.' : null }; } };
  },
  type(item, el, api) {
    el.append(h('h2', {}, 'Escreva em italiano'), h('div', { class: 'prompt' }, h('div', { class: 'txt' }, item.pt)));
    const ta = h('textarea', { placeholder: 'Digite em italiano…', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false', oninput: () => api.ready(ta.value.trim().length > 0) });
    el.append(ta); setTimeout(() => ta.focus(), 200);
    return { check: () => checkText(ta.value, item) };
  },
  dictation(item, el, api) {
    el.append(h('h2', {}, 'Escreva o que você ouvir'), h('div', { class: 'listen-row' }, spk(item.it, 'big'), spk(item.it, 'slow')));
    const ta = h('textarea', { placeholder: 'Digite em italiano…', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false', oninput: () => api.ready(ta.value.trim().length > 0) });
    el.append(ta); setTimeout(() => say(item.it), 300);
    return { check: () => checkText(ta.value, item) };
  },
  speak(item, el, api) {
    el.append(h('span', { class: 'tag' }, 'Prova oral'), h('h2', {}, 'Leia em voz alta'),
      h('div', { class: 'prompt' }, spk(item.it), h('div', { class: 'txt' }, item.it)),
      h('p', { class: 'note' }, item.pt));
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const heard = h('div', { class: 'heard' });
    const mic = h('button', { class: 'mic', 'aria-label': 'Falar' }, '🎤');
    el.append(mic, heard);
    if (SR) {
      let rec = null;
      mic.onclick = () => {
        if (rec) { rec.stop(); return; }
        rec = new SR(); rec.lang = 'it-IT'; rec.interimResults = true; rec.maxAlternatives = 3;
        mic.classList.add('on'); heard.textContent = 'Ouvindo…';
        let best = '';
        rec.onresult = e => { best = Array.from(e.results).map(r => r[0].transcript).join(' '); heard.textContent = '“' + best + '”'; };
        rec.onerror = () => { heard.textContent = 'Não consegui ouvir. Tente de novo ou use o botão abaixo.'; };
        rec.onend = () => {
          mic.classList.remove('on'); rec = null;
          if (!best) return;
          const t = norm(item.it).split(' '), g = new Set(norm(best).split(' '));
          const score = t.filter(w => g.has(w)).length / t.length;
          if (score >= 0.6) api.finish(true, { note: score === 1 ? 'Pronúncia perfeita!' : 'Muito bem!', solution: item.it });
          else heard.textContent = `Entendi “${best}”. Tente de novo, mais devagar.`;
        };
        rec.start();
      };
    } else heard.textContent = 'Seu navegador não reconhece voz. Leia em voz alta e toque abaixo.';
    el.append(h('button', { class: 'linkbtn', onclick: () => api.finish(true, { note: 'Ótimo, continue praticando!', solution: item.it }) }, 'Li em voz alta ✓'));
    el.append(h('button', { class: 'linkbtn', style: 'color:var(--mudo)', onclick: () => api.finish(true, { note: 'Tudo bem, fica para a próxima.', solution: item.it }) }, 'Não posso falar agora'));
    return { auto: true };
  },
};
function checkText(val, item) {
  const r = compare(val, item.it);
  return { ok: !!r, solution: item.it, note: r === 'typo' ? 'Quase! Cuidado com a digitação:' : r === 'accent' ? 'Certo! Atenção aos acentos:' : null };
}

/* ================= tela: fim da lição ================= */
const MISSOES = {
  1: ['Ouça 2 músicas italianas com a letra na tela.', 'Assista 15 min de um desenho infantil em italiano.', 'Ouça um podcast de italiano para iniciantes no trânsito.', 'Diga 3 frases em italiano para alguém da família.', 'Narre em italiano o que você faz enquanto cozinha.'],
  2: ['Assista um episódio de série com áudio e legenda em italiano.', 'Converse 10 min em italiano com alguém da família.', 'Ouça um podcast de italiano lento no trânsito.'],
  3: ['Leia uma notícia curta em italiano simples.', 'Fale só em italiano no almoço com a família.', 'Assista uma série sem legenda em português.'],
  4: ['Grave 1 min falando de você em italiano e ouça depois.', 'Ouça notícias em italiano no trânsito.', 'Escreva um e-mail curto em italiano para um parente.'],
};
function renderEnd() {
  const s = L ? L.summary : null; if (!s) return go('home');
  const box = h('div', { class: 'lesson' });
  box.append(h('div', { class: 'end' },
    h('div', { class: 'trophy' }, s.acc === 100 ? '🏆' : '🎉'),
    h('h1', {}, s.acc === 100 ? 'Lição perfeita!' : 'Lição concluída!'),
    h('div', { class: 'tiles' },
      h('div', { class: 'tile', style: '--c:var(--ouro)' }, h('small', {}, 'XP'), h('b', {}, `+${s.xp}`)),
      h('div', { class: 'tile', style: '--c:var(--verde)' }, h('small', {}, 'Precisão'), h('b', {}, `${s.acc}%`)),
      h('div', { class: 'tile', style: '--c:var(--azul)' }, h('small', {}, 'Tempo'), h('b', {}, fmtTime(s.time)))),
    h('div', { class: 'card mission' }, h('span', { class: 'tag' }, st.streak === 1 ? '🔥 Sequência iniciada!' : `🔥 ${st.streak} dias seguidos`),
      h('div', {}, h('b', {}, '🎧 Missão de hoje (sem sentar para estudar): '), pick(MISSOES[phaseOf(s.d)]))),
    h('button', { class: 'btn', onclick: () => go('home') }, 'Continuar')));
  app.append(box);
}

/* ================= tela: prova ================= */
function renderProva(m) {
  const sec = h('div', { class: 'sec' });
  sec.append(h('h2', {}, '🎓 CILS UNO B1 — Fundação Torino'));
  const left = st.exam ? Math.ceil((new Date(st.exam + 'T09:00') - new Date()) / 864e5) : null;
  const nd = nextDay() || TOTAL_DAYS;
  sec.append(h('div', { class: 'count' },
    left != null && left >= 0 ? [h('div', { class: 'n' }, String(left)), h('div', {}, left === 1 ? 'dia para a prova' : 'dias para a prova'),
      h('p', { class: 'note' }, left >= TOTAL_DAYS - nd + 1 ? `No ritmo de 1 lição por dia você termina o curso a tempo. 💪` : `Faltam ${TOTAL_DAYS - nd + 1} lições. Faça 2 por dia em alguns dias para chegar a tempo.`)]
      : h('div', { class: 'note' }, 'Quando a Fundação Torino divulgar a data, coloque aqui para ver a contagem regressiva.'),
    h('input', { type: 'date', value: st.exam, onchange: e => { st.exam = e.target.value; save(); render(); } })));

  sec.append(h('h3', {}, 'As 5 partes da prova'), h('p', { class: 'note' }, 'É preciso passar em cada uma delas.'));
  const parts = [['🎧', 'Ascolto', 'Ouvir diálogos e avisos e responder perguntas.'], ['📖', 'Lettura', 'Ler textos do dia a dia, avisos e e-mails.'],
    ['🧩', 'Strutture', 'Gramática por escrito: completar textos com artigos, preposições, verbos.'], ['✍️', 'Scrittura', 'Escrever e-mails formais e informais (50–100 palavras).'],
    ['🗣️', 'Orale', 'Cerca de 10 min com o examinador: conversa + falar de você ou de um tema.']];
  sec.append(h('div', { class: 'parts' }, parts.map(([i, t, d]) => h('div', { class: 'part' }, h('div', { class: 'ico' }, i), h('div', {}, h('b', {}, t), h('span', {}, d))))));

  sec.append(h('h3', {}, 'Informações (consultadas em 30/10/2026)'), h('ul', {},
    h('li', {}, 'Provas semestrais. A de 03/12/2026 já teve inscrições encerradas; as datas de 2027 ainda não saíram.'),
    h('li', {}, 'Local: Universidade FUMEC — R. Cobre, 200, Cruzeiro, BH.'),
    h('li', {}, 'Valor do B1: R$ 620 a R$ 670 (confirme antes de pagar).'),
    h('li', {}, 'Resultado em 2 a 4 meses.'),
    h('li', {}, 'Contato: cl@fundacaotorino.com.br · (31) 3289-4239 · WhatsApp (31) 99275-2796.')));

  sec.append(h('h3', {}, 'Frases-curinga para a prova oral'), h('div', { class: 'card' }, h('ul', { class: 'words' },
    [['Può ripetere, per favore?', 'Pode repetir, por favor?'], ['Non ho capito bene.', 'Não entendi bem.'], ['Secondo me…', 'Na minha opinião…'],
      ['Non sono sicuro, ma…', 'Não tenho certeza, mas…'], ['Mi scusi, come si dice…?', 'Desculpe, como se diz…?']]
      .map(([it, pt]) => h('li', { onclick: () => say(it) }, spk(it), h('div', {}, h('div', { class: 'it' }, it), h('div', { class: 'pt' }, pt)))))));
  m.append(sec);
}

/* ================= tela: perfil ================= */
function renderPerfil(m) {
  const sec = h('div', { class: 'sec' });
  const nDone = Object.keys(st.done).length;
  sec.append(h('h2', {}, '👤 Seu progresso'), h('div', { class: 'grid2' },
    h('div', { class: 'box' }, h('div', { class: 'ico' }, '🔥'), h('div', {}, h('b', {}, String(liveStreak())), h('small', {}, 'dias seguidos'))),
    h('div', { class: 'box' }, h('div', { class: 'ico' }, '⚡'), h('div', {}, h('b', {}, String(st.xp)), h('small', {}, 'XP total'))),
    h('div', { class: 'box' }, h('div', { class: 'ico' }, '📅'), h('div', {}, h('b', {}, `${nDone}/${TOTAL_DAYS}`), h('small', {}, 'lições feitas'))),
    h('div', { class: 'box' }, h('div', { class: 'ico' }, '🏅'), h('div', {}, h('b', {}, String(st.best)), h('small', {}, 'recorde de dias')))));

  const week = h('div', { class: 'week' });
  const max = Math.max(15, ...Array.from({ length: 7 }, (_, i) => st.log[daysAgo(6 - i)] || 0));
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); const v = st.log[ymd(d)] || 0;
    week.append(h('div', {}, h('span', {}, v ? String(v) : ''), h('i', { style: `height:${Math.round(70 * v / max)}%` }), 'DSTQQSS'[d.getDay()]));
  }
  sec.append(h('h3', {}, 'XP da semana'), week);

  const errs = Object.entries(st.mistakes).sort((a, b) => b[1].n - a[1].n).slice(0, 8);
  if (errs.length) sec.append(h('h3', {}, 'Para reforçar'), h('div', { class: 'card' }, h('ul', { class: 'words' },
    errs.map(([it, e]) => h('li', { onclick: () => say(it) }, spk(it), h('div', {}, h('div', { class: 'it' }, it), h('div', { class: 'pt' }, `${e.pt} · errou ${e.n}×`)))))),
    h('p', { class: 'note' }, 'Elas voltam automaticamente nas próximas lições até você acertar.'));

  sec.append(h('h3', {}, 'Levar o progresso para outro aparelho'),
    h('p', { class: 'note' }, 'O progresso fica salvo neste aparelho. Para continuar no celular ou no computador, copie o código aqui e cole no outro aparelho.'),
    h('button', { class: 'btn blue', onclick: exportCode }, 'Copiar meu código'),
    h('button', { class: 'btn ghost', onclick: importCode }, 'Colar código de outro aparelho'));

  const sw = (label, key) => h('div', { class: 'row' }, label,
    h('button', { class: 'switch' + (st[key] ? ' on' : ''), role: 'switch', 'aria-checked': String(!!st[key]), onclick: () => { st[key] = !st[key]; save(); render(); } }));
  sec.append(h('h3', {}, 'Ajustes'), sw('Sons de acerto/erro', 'sound'), sw('Liberar todos os dias (pular lições)', 'unlockAll'),
    h('div', { class: 'row' }, h('span', {}, 'Voz em italiano', h('br'), h('small', { class: 'note' }, itVoice ? itVoice.name : 'Voz padrão do aparelho')),
      h('button', { class: 'spk', onclick: () => say('Ciao! Benvenuto al corso di italiano.') }, '🔊')),
    h('p', { class: 'note' }, 'Dica: no iPhone, vá em Ajustes › Acessibilidade › Conteúdo Falado › Vozes › Italiano e baixe uma voz "Aprimorada" para um som mais natural.'),
    h('button', { class: 'linkbtn', style: 'color:var(--rosso)', onclick: () => { if (confirm('Apagar todo o progresso deste aparelho? Não dá para desfazer.')) { st = blank(); save(); render(); } } }, 'Apagar progresso'));
  m.append(sec);
}
function exportCode() {
  const code = 'PB1:' + btoa(unescape(encodeURIComponent(JSON.stringify(st))));
  const done = () => toast('Código copiado! Cole no outro aparelho em Perfil › Colar código.');
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(done, () => prompt('Copie o código:', code));
  else prompt('Copie o código:', code);
}
function importCode() {
  const raw = (prompt('Cole aqui o código do outro aparelho:') || '').trim();
  if (!raw) return;
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(raw.replace(/^PB1:/, '')))));
    if (typeof data !== 'object' || !data.done) throw new Error('inválido');
    if (!confirm(`Substituir o progresso deste aparelho por ${Object.keys(data.done).length} lições feitas e ${data.xp || 0} XP?`)) return;
    st = Object.assign(blank(), data); save(); render(); toast('Progresso importado!');
  } catch (e) { toast('Código inválido. Copie de novo no outro aparelho.'); }
}

/* ================= início ================= */
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
