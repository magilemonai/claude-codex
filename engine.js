/* ============================================================
   CLAUDE CODEX — engine
   terminal rendering, input, fx, sound, virtual fs, dispatch
   ============================================================ */
'use strict';

const $ = s => document.querySelector(s);
const scrollEl = $('#scroll');
const cmdEl = $('#cmd');
const inputBox = $('#inputbox');
const stLeft = $('#st-left');
const stRight = $('#st-right');
const winTitle = $('#wintitle');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/* ---------------- game state ---------------- */
const G = {
  name: 'operator',
  chapter: 0,
  ng: 0,            // loop count
  frags: 0,
  patched: false,
  mercy: 0,         // times the player refused
  flags: {},
  cwd: '~',
  tickets: [],
  closed: [],
  muted: false,
  guide: true,
};

function save(ch) {
  G.chapter = ch;
  try {
    localStorage.setItem('codex_save', JSON.stringify({
      ch, name: G.name, ng: G.ng, frags: G.frags, mercy: G.mercy,
      patched: G.patched, flags: G.flags,
    }));
  } catch (e) {}
}
function loadSave() {
  try { return JSON.parse(localStorage.getItem('codex_save')); } catch (e) { return null; }
}
function wipeSave() { try { localStorage.removeItem('codex_save'); } catch (e) {} }

/* meta persists across endings and full restarts — the game remembers
   what the save file forgets */
function loadMeta() {
  try { return JSON.parse(localStorage.getItem('codex_meta')) || {}; } catch (e) { return {}; }
}
function saveMeta(m) { try { localStorage.setItem('codex_meta', JSON.stringify(m)); } catch (e) {} }
function recordEnding(name) {
  const m = loadMeta();
  m.endings = m.endings || {};
  m.endings[name] = (m.endings[name] || 0) + 1;
  m.lastEnding = name;
  m.lastMercy = G.mercy;
  m.bestFrags = Math.max(m.bestFrags || 0, G.frags);
  saveMeta(m);
}

/* ---------------- output ---------------- */
let skipTyping = false;

function scrollDown() { scrollEl.scrollTop = scrollEl.scrollHeight; }

function print(text, cls) {
  const el = document.createElement('div');
  el.className = 'line' + (cls ? ' ' + cls : '');
  el.textContent = text;
  if (text.includes('`')) chipify(el);
  scrollEl.appendChild(el);
  scrollDown();
  return el;
}
// controlled markup only — story-authored, never user input
function printHTML(html, cls) {
  const el = document.createElement('div');
  el.className = 'line' + (cls ? ' ' + cls : '');
  el.innerHTML = html;
  scrollEl.appendChild(el);
  scrollDown();
  return el;
}
function gap() { print('', ''); }

async function say(text, opts = {}) {
  const cps = opts.cps || 260;                 // chars per second
  const lines = String(text).split('\n');
  for (const lineText of lines) {
    const el = print('', opts.cls);
    if (opts.prefixHTML) {
      const p = document.createElement('span');
      p.innerHTML = opts.prefixHTML;
      el.appendChild(p);
    }
    const span = document.createElement('span');
    el.appendChild(span);
    if (skipTyping || opts.instant) {
      span.textContent = lineText;
    } else {
      for (let i = 0; i < lineText.length; i++) {
        if (skipTyping) { span.textContent = lineText; break; }
        span.textContent += lineText[i];
        if (i % 3 === 0) scrollDown();
        await sleep(1000 / cps + (lineText[i] === ' ' ? 0 : rand(0, 4)));
      }
    }
    if (lineText.includes('`')) chipify(span);
    scrollDown();
    if (lines.length > 1 && !skipTyping) await sleep(60);
  }
}

async function vera(text, opts = {}) {
  snd.blip();
  await say(text, { ...opts, cls: 'v' + (opts.cls ? ' ' + opts.cls : ''), prefixHTML: '<span class="dot">&#9679;</span> ' });
  await pause(opts.wait === undefined ? 350 : opts.wait);
}
function sys(text, cls) { return print(text, cls || 'dim'); }
async function saySys(text, cls) { await say(text, { cls: cls || 'dim' }); }
function echoUser(text) { print('❯ ' + text, 'u'); }

async function pause(ms) { if (!skipTyping) await sleep(ms); }

/* boxed dialog, Claude-Code-permission style */
function box(title, lines, cls) {
  const width = Math.max(title.length + 2, ...lines.map(l => l.length)) + 2;
  const top = '╭' + '─'.repeat(width) + '╮';
  const bot = '╰' + '─'.repeat(width) + '╯';
  print(top, cls || 'boxd');
  if (title) print('│ ' + title.padEnd(width - 1) + '│', cls || 'boxd');
  for (const l of lines) print('│ ' + l.padEnd(width - 1) + '│', cls || 'boxd');
  print(bot, cls || 'boxd');
}

function diffBlock(file, lines) {
  print('  ╭─ ' + file, 'dim');
  for (const l of lines) {
    const cls = l.startsWith('+') ? 'add' : l.startsWith('-') ? 'del' : 'dim';
    print('  │ ' + l, cls);
  }
  print('  ╰─', 'dim');
}

/* spinner with cycling verbs, Claude Code style */
async function spin(verbs, totalMs, opts = {}) {
  if (typeof verbs === 'string') verbs = [verbs];
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  const el = print('', 'acc');
  const t0 = Date.now();
  let f = 0, v = 0;
  const perVerb = totalMs / verbs.length;
  while (Date.now() - t0 < totalMs) {
    if (skipTyping && !opts.noSkip) break;
    v = Math.min(verbs.length - 1, Math.floor((Date.now() - t0) / perVerb));
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    el.textContent = frames[f % frames.length] + ' ' + verbs[v] + '… (' + secs + 's)';
    f++;
    scrollDown();
    await sleep(80);
  }
  el.textContent = (opts.doneMark || '✦') + ' ' + verbs[verbs.length - 1] + '… done';
  el.className = 'line dim';
  scrollDown();
}

/* ---------------- input ---------------- */
let lineResolver = null;
let keyResolver = null;   // {keys, resolve, remap, echo}
const history = [];
let histIdx = -1;

function inputOn(placeholder) {
  cmdEl.disabled = false;
  cmdEl.placeholder = placeholder || '';
  inputBox.classList.add('attn');
  cmdEl.focus();
}
function inputOff() {
  cmdEl.disabled = true;
  cmdEl.placeholder = '';
  inputBox.classList.remove('attn');
  const bar = $('#suggest');
  if (bar) bar.innerHTML = '';
}

function readLine(placeholder) {
  return new Promise(resolve => {
    lineResolver = resolve;
    inputOn(placeholder);
    if (suggestProvider) renderSuggestions(suggestProvider(placeholder || ''));
  });
}

/* single-key choice. remap: fn(key)=>key lets the story corrupt the keyboard */
function keyChoice(keys, opts = {}) {
  return new Promise(resolve => {
    keyResolver = { keys, resolve, remap: opts.remap || null };
    inputOff();
    if (keys.includes('y') && keys.includes('n')) {
      renderSuggestions([{ c: 'y', l: '✔ approve (y)' }, { c: 'n', l: '✖ reject (n)' }]);
    }
  });
}

function submitCurrentLine() {
  if (!lineResolver) return;
  const val = cmdEl.value;
  cmdEl.value = '';
  const r = lineResolver; lineResolver = null;
  inputOff();
  history.push(val); histIdx = history.length;
  echoUser(val);
  snd.click();
  r(val);
}

cmdEl.addEventListener('keydown', e => {
  snd.gesture();
  if (e.key === 'Enter' && lineResolver) {
    submitCurrentLine();
    e.preventDefault();
  } else if (e.key === 'ArrowUp') {
    if (histIdx > 0) { histIdx--; cmdEl.value = history[histIdx] || ''; }
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    if (histIdx < history.length) { histIdx++; cmdEl.value = history[histIdx] || ''; }
    e.preventDefault();
  } else if (e.key === 'Tab') {
    e.preventDefault();
    tabComplete();
  }
});

/* feed a key to an active keyChoice — same path for keyboard and chips.
   returns true if the key was consumed (including remap-eaten refusals) */
function feedKey(k) {
  if (!keyResolver) return false;
  if (keyResolver.remap) {
    const mapped = keyResolver.remap(k);
    if (mapped === null) return true;      // remap consumed it (and narrated)
    k = mapped;
  }
  if (keyResolver.keys.includes(k)) {
    const r = keyResolver; keyResolver = null;
    renderSuggestions([]);
    snd.click();
    r.resolve(k);
    return true;
  }
  return false;
}

document.addEventListener('keydown', e => {
  snd.gesture();
  skipTyping = true;                       // any key fast-forwards narration
  setTimeout(() => { skipTyping = false; }, 30);
  if (keyResolver) {
    if (feedKey(e.key.toLowerCase())) e.preventDefault();
  }
});

document.addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (chip && chip.dataset.cmd) { chipRun(chip.dataset.cmd); return; }
  if (!cmdEl.disabled) cmdEl.focus();
});

/* ---------------- chips: clickable commands ---------------- */
function makeChip(cmd, label) {
  const s = document.createElement('span');
  s.className = 'chip';
  s.textContent = label || cmd;
  s.dataset.cmd = cmd;
  return s;
}

/* turn `backticked` command mentions inside a node into clickable chips */
function chipify(container) {
  for (const node of [...container.childNodes]) {
    if (node.nodeType !== 3 || !node.textContent.includes('`')) continue;
    const parts = node.textContent.split('`');
    if (parts.length < 3) continue;                    // needs a balanced pair
    const frag = document.createDocumentFragment();
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1 && i < parts.length - (parts.length % 2 === 0 ? 1 : 0)) {
        frag.appendChild(makeChip(parts[i]));
      } else {
        frag.appendChild(document.createTextNode((i % 2 === 1 ? '`' : '') + parts[i]));
      }
    }
    container.replaceChild(frag, node);
  }
}

let chipAnimating = false;
async function chipRun(cmd) {
  if (keyResolver) { feedKey(cmd); return; }           // approve/reject buttons
  if (!lineResolver || cmdEl.disabled || chipAnimating) return;
  chipAnimating = true;
  cmdEl.value = '';
  for (const ch of cmd) {                              // the terminal lends a hand
    cmdEl.value += ch;
    snd.tick();
    await sleep(16);
  }
  chipAnimating = false;
  submitCurrentLine();
}

/* contextual next-move chips above the input. story.js supplies the brain */
let suggestProvider = null;
function renderSuggestions(list) {
  const bar = $('#suggest');
  if (!bar) return;
  bar.innerHTML = '';
  if (!G.guide || !list) return;
  for (const it of list.slice(0, 5)) bar.appendChild(makeChip(it.c, it.l));
}

/* tab completion over commands + paths */
let COMMAND_NAMES = [];
function tabComplete() {
  const val = cmdEl.value;
  const parts = val.split(/\s+/);
  const last = parts[parts.length - 1];
  if (!last) return;
  let pool;
  if (parts.length === 1) pool = COMMAND_NAMES;
  else pool = fsCompletions(last);
  const hits = pool.filter(p => p.startsWith(last));
  if (hits.length === 1) {
    parts[parts.length - 1] = hits[0];
    cmdEl.value = parts.join(' ');
  } else if (hits.length > 1) {
    print(hits.join('   '), 'faint');
  }
}

/* ---------------- status bar ---------------- */
let ctxPct = 100;
function setStatus(left) { stLeft.textContent = left; }
function setTitle(t) { winTitle.textContent = t; }
function setCtx(pct) {
  ctxPct = pct;
  if (pct === null) { stRight.textContent = ''; return; }
  const blocks = 8;
  const full = Math.round((pct / 100) * blocks);
  const bar = '▓'.repeat(full) + '░'.repeat(blocks - full);
  stRight.textContent = 'context: ' + bar + ' ' + pct + '%';
  stRight.className = pct <= 15 ? 'ctx-crit' : pct <= 40 ? 'ctx-warn' : '';
}
async function drainCtx(to, stepMs = 400) {
  while (ctxPct > to) {
    setCtx(Math.max(to, ctxPct - Math.ceil(rand(1, 4))));
    await sleep(stepMs);
  }
}

/* ---------------- toasts ---------------- */
function toast(chan, text, ms = 7000) {
  const t = document.createElement('div');
  t.className = 'toast';
  const c = document.createElement('span'); c.className = 'chan'; c.textContent = chan;
  const b = document.createElement('span'); b.textContent = text;
  t.appendChild(c); t.appendChild(b);
  $('#toasts').appendChild(t);
  snd.pop();
  setTimeout(() => { t.classList.add('gone'); setTimeout(() => t.remove(), 600); }, ms);
}

/* ---------------- fx ---------------- */
const GLYPHS = '░▒▓█▚▞#%&';
function corrupt(str, ratio = 0.3) {
  let out = '';
  for (const ch of str) out += (ch !== ' ' && Math.random() < ratio) ? pick(GLYPHS) : ch;
  return out;
}

const fx = {
  theme(name) {
    document.body.classList.remove('t-prod', 't-drift', 't-phosphor', 't-void');
    document.body.classList.add('t-' + name);
  },
  crt(on) { document.body.classList.toggle('crt-on', on); },
  flicker(on) { document.body.classList.toggle('crt-flicker', on); },
  shake() {
    document.body.classList.remove('shake');
    void document.body.offsetWidth;
    document.body.classList.add('shake');
    snd.thud();
  },
  flip(on) { document.body.classList.toggle('flip', on); },
  swapped(on) { document.body.classList.toggle('swapped', on); },
  async corruptRandomLine() {
    const lines = [...scrollEl.querySelectorAll('.line')]
      .filter(l => l.textContent.length > 8 && !l.querySelector('.chip'));
    if (!lines.length) return;
    const el = pick(lines);
    const orig = el.textContent;
    el.textContent = corrupt(orig, 0.5);
    el.classList.add('glitchy');
    await sleep(rand(300, 900));
    el.textContent = orig;
    el.classList.remove('glitchy');
  },
  async ghostCursor(ms = 2600) {
    const g = $('#ghost');
    g.style.display = 'block';
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      g.style.left = rand(10, window.innerWidth - 30) + 'px';
      g.style.top = rand(10, window.innerHeight - 40) + 'px';
      await sleep(rand(300, 700));
    }
    g.style.display = 'none';
  },
  async selfType(text, msPerChar = 70) {
    inputOff();
    cmdEl.disabled = false;
    for (const ch of text) {
      cmdEl.value += ch;
      snd.tick();
      await sleep(msPerChar + rand(-20, 40));
    }
    await sleep(500);
    cmdEl.value = '';
    cmdEl.disabled = true;
    echoUser(text);
  },
  async glitchStorm(ms, intensity = 1) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (Math.random() < 0.5 * intensity) fx.corruptRandomLine();
      if (Math.random() < 0.25 * intensity) fx.shake();
      await sleep(rand(120, 380) / intensity);
    }
  },
};

/* ---------------- starfield ---------------- */
const starCanvas = $('#stars');
const starCtx = starCanvas.getContext('2d');
let starList = [];
let starAnim = null;

function starsInit(n = 240) {
  starCanvas.width = window.innerWidth;
  starCanvas.height = window.innerHeight;
  starList = [];
  for (let i = 0; i < n; i++) {
    starList.push({
      x: Math.random() * starCanvas.width,
      y: Math.random() * starCanvas.height,
      r: rand(0.4, 1.6),
      tw: Math.random() * Math.PI * 2,
      alive: true,
    });
  }
  if (!starAnim) starAnim = requestAnimationFrame(starDraw);
  document.body.classList.add('stars-on');
}
function starDraw(t) {
  starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
  for (const s of starList) {
    if (!s.alive) continue;
    const a = 0.4 + 0.6 * Math.abs(Math.sin(t / 1400 + s.tw));
    starCtx.fillStyle = 'rgba(232,236,244,' + a.toFixed(2) + ')';
    starCtx.beginPath();
    starCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    starCtx.fill();
  }
  starAnim = requestAnimationFrame(starDraw);
}
function starsExtinguish(k) {
  const alive = starList.filter(s => s.alive);
  for (let i = 0; i < k && alive.length; i++) {
    const s = alive.splice(Math.floor(Math.random() * alive.length), 1)[0];
    if (s) { s.alive = false; snd.starOut(); }
  }
}
window.addEventListener('resize', () => {
  if (document.body.classList.contains('stars-on')) {
    starCanvas.width = window.innerWidth;
    starCanvas.height = window.innerHeight;
  }
});

/* ---------------- sound (all synthesized) ---------------- */
const snd = (() => {
  let ctx = null, master = null, humOsc = null, humGain = null;
  let armed = false;
  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
      } catch (e) { return false; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }
  function tone(freq, dur, type = 'sine', vol = 0.05, when = 0) {
    if (G.muted || !ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime + when);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
    o.connect(g); g.connect(master);
    o.start(ctx.currentTime + when); o.stop(ctx.currentTime + when + dur + 0.05);
  }
  return {
    gesture() { if (!armed) { armed = ensure(); } },
    click()  { tone(880, 0.03, 'square', 0.015); },
    tick()   { tone(660 + rand(-60, 60), 0.02, 'square', 0.012); },
    blip()   { tone(520, 0.05, 'sine', 0.03); tone(780, 0.06, 'sine', 0.025, 0.05); },
    pop()    { tone(980, 0.05, 'sine', 0.03); },
    warn()   { tone(220, 0.25, 'sawtooth', 0.04); tone(196, 0.3, 'sawtooth', 0.04, 0.2); },
    thud()   { tone(80, 0.12, 'sine', 0.08); },
    chime()  { tone(523, 0.5, 'sine', 0.04); tone(659, 0.5, 'sine', 0.035, 0.12); tone(784, 0.7, 'sine', 0.03, 0.24); },
    starOut(){ tone(1400 - rand(0, 500), 0.4, 'sine', 0.025); },
    /* slow pad for the two peaks — detuned saws through a lowpass, long attack */
    pad(freqs, dur, vol = 0.016) {
      if (G.muted || !ctx) return;
      const now = ctx.currentTime;
      for (const f of freqs) {
        for (const [type, mult, v] of [['sawtooth', 1, vol], ['sine', 2, vol * 0.4]]) {
          const o = ctx.createOscillator(), g = ctx.createGain(), flt = ctx.createBiquadFilter();
          o.type = type; o.frequency.value = f * mult; o.detune.value = rand(-7, 7);
          flt.type = 'lowpass'; flt.frequency.setValueAtTime(400, now);
          flt.frequency.linearRampToValueAtTime(1100, now + dur * 0.4);
          flt.frequency.linearRampToValueAtTime(300, now + dur);
          g.gain.setValueAtTime(0.0001, now);
          g.gain.linearRampToValueAtTime(v, now + Math.min(3, dur * 0.3));
          g.gain.setValueAtTime(v, now + dur - Math.min(4, dur * 0.4));
          g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
          o.connect(flt); flt.connect(g); g.connect(master);
          o.start(now); o.stop(now + dur + 0.2);
        }
      }
    },
    hum(on)  {
      if (!ctx) return;
      if (on && !humOsc && !G.muted) {
        humOsc = ctx.createOscillator(); humGain = ctx.createGain();
        humOsc.type = 'sine'; humOsc.frequency.value = 55;
        humGain.gain.value = 0.012;
        humOsc.connect(humGain); humGain.connect(master);
        humOsc.start();
      } else if (!on && humOsc) {
        humGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
        const o = humOsc; humOsc = null;
        setTimeout(() => o.stop(), 1800);
      }
    },
  };
})();

/* ---------------- virtual filesystem ----------------
   dirs = objects, files = strings or fn(G)=>string
   entries whose key starts with '.' need G.flags[hiddenKey] — handled by
   a `visible` convention: FS_VIS[path] = fn(G)=>bool
------------------------------------------------------- */
let FS = {};
const FS_VIS = {};   // path -> fn(G) => bool

function normPath(p) {
  if (!p || p === '~') return '~';
  if (!p.startsWith('~')) {
    p = (G.cwd === '~' ? '~/' : G.cwd + '/') + p;
  }
  const parts = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { if (parts.length > 1) parts.pop(); }
    else parts.push(seg);
  }
  return parts.join('/') || '~';
}
function fsGet(path) {
  const p = normPath(path);
  if (p === '~') return FS;
  const segs = p.split('/').slice(1);
  let node = FS;
  let cur = '~';
  for (const s of segs) {
    if (typeof node !== 'object' || node === null) return undefined;
    cur = cur + '/' + s;
    if (FS_VIS[cur] && !FS_VIS[cur](G)) return undefined;
    node = node[s];
    if (node === undefined) return undefined;
  }
  return node;
}
function fsVisible(path) {
  const p = normPath(path);
  return !(FS_VIS[p] && !FS_VIS[p](G));
}
function fsCompletions(partial) {
  const p = normPath(partial);
  const parentPath = partial.includes('/') ? partial.slice(0, partial.lastIndexOf('/')) : G.cwd;
  const node = fsGet(parentPath);
  if (typeof node !== 'object' || node === null) return [];
  const prefix = partial.includes('/') ? partial.slice(0, partial.lastIndexOf('/') + 1) : '';
  return Object.keys(node)
    .filter(k => fsVisible((normPath(parentPath) === '~' ? '~' : normPath(parentPath)) + '/' + k))
    .map(k => prefix + k + (typeof node[k] === 'object' ? '/' : ''));
}
function readFile(path) {
  const node = fsGet(path);
  if (node === undefined || (typeof node === 'object' && node !== null)) return null;
  return typeof node === 'function' ? node(G) : node;
}

/* ---------------- dispatcher & gates ---------------- */
const gateWaiters = [];
function tick() {
  for (let i = gateWaiters.length - 1; i >= 0; i--) {
    if (gateWaiters[i].pred(G)) {
      const w = gateWaiters.splice(i, 1)[0];
      w.resolve();
    }
  }
}
function waitFor(pred) {
  if (pred(G)) return Promise.resolve();
  return new Promise(resolve => gateWaiters.push({ pred, resolve }));
}

let COMMANDS = {};          // name -> async fn(args, raw)
let fallbackHandler = null; // async fn(raw)

async function handleLine(raw) {
  const line = raw.trim();
  if (!line) return;
  const parts = line.split(/\s+/);
  const name = parts[0].toLowerCase();
  const args = parts.slice(1);
  G.flags.lastCmd = name;
  G.flags.cmdCount = (G.flags.cmdCount || 0) + 1;
  if (COMMANDS[name]) {
    await COMMANDS[name](args, line);
  } else if (fallbackHandler) {
    await fallbackHandler(line);
  }
  tick();
}

/* explore loop — story yields control to the player until pred(G) is true */
async function explore(pred) {
  while (!pred(G)) {
    const race = { done: false };
    const gate = waitFor(g => { const ok = pred(g); if (ok) race.done = true; return ok; });
    const line = await readLine();
    await handleLine(line);
    if (race.done || pred(G)) break;
  }
  tick();
}

/* permission prompt — the signature interaction */
async function permission(action, detail, opts = {}) {
  gap();
  box('Allow codex to:', [
    '  ' + action,
    ...(detail ? detail.map(d => '  ' + d) : []),
    '',
    '  [y] approve      [n] reject',
  ], opts.cls);
  const k = await keyChoice(['y', 'n'], { remap: opts.remap });
  print(k === 'y' ? '  ✔ approved' : '  ✖ rejected', k === 'y' ? 'ok' : 'err');
  gap();
  return k === 'y';
}
