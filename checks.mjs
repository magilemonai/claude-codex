#!/usr/bin/env node
/* ============================================================
   CLAUDE CODEX — checks
   the game has no build, no server, and no dependencies, so this
   has none either: node builtins (fs, vm) and nothing else.

     node checks.mjs        # 0 = green, 1 = something broke

   TWO RULES, both load-bearing:

   1. COMPILE, NEVER EXECUTE. engine.js / story.js / finale.js all
      touch the DOM at top level. vm.Script's constructor parses and
      compiles and stops there — that is the entire sandbox. Nothing
      in this file may call .runInThisContext() or import a game file.

   2. APPEND-SERIAL. Each mission adds one section() at the bottom.
      Sections don't reorder and don't get rewritten, so a merge is
      an append and the file reads as a changelog of what we've
      promised not to break.

   Every assertion should pin a named seam — a real guard or call
   site that a regression would actually disturb. A check that
   cannot fail is decoration.
   ============================================================ */

import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const HERE = import.meta.dirname ?? decodeURIComponent(new URL('.', import.meta.url).pathname);

/* load order from index.html — engine first, so its top-level consts are
   in scope for the two scripts after it (this is how G already works) */
const FILES = ['engine.js', 'story.js', 'finale.js'];

const cache = new Map();
const read = f => {
  if (!cache.has(f)) cache.set(f, readFileSync(`${HERE}/${f}`, 'utf8'));
  return cache.get(f);
};

/* ---------------- tiny harness ---------------- */
let total = 0;
let failed = 0;
let pending = [];

function assert(ok, label) {
  total++;
  if (!ok) { failed++; pending.push(label); }
  return ok;
}

function section(title, fn) {
  const before = failed;
  const start = total;
  pending = [];
  try {
    fn();
  } catch (e) {
    failed++;
    pending.push(`section threw: ${e.message}`);
  }
  const n = total - start;
  if (failed === before) {
    console.log(`PASS  ${title}  (${n} assertion${n === 1 ? '' : 's'})`);
  } else {
    console.log(`FAIL  ${title}`);
    for (const p of pending) console.log(`        ✗ ${p}`);
  }
}

/* ============================================================
   1. syntax — the three scripts still parse
   ============================================================ */
section('syntax: engine.js, story.js, finale.js compile', () => {
  for (const f of FILES) {
    let why = '';
    try {
      // constructing a Script compiles it. we never run it.
      new Script(read(f), { filename: f });
    } catch (e) {
      why = ` — ${e.name}: ${e.message}`;
    }
    assert(why === '', `${f} parses${why}`);
  }
});

/* ============================================================
   2. endings — the boot counter is derived, not typed
   seams: engine.js `const ENDINGS`, the recordEnding() call sites
   in finale.js, and story.js's boot "endings found" block.
   ============================================================ */
section('endings: boot counter derives from ENDINGS', () => {
  // seam A: exactly one script declares ENDINGS.
  // two classic scripts declaring the same top-level const is a hard
  // SyntaxError at load — the second script never runs, game dead on boot.
  const declaring = FILES.filter(f => /(^|\n)\s*const\s+ENDINGS\s*=/.test(read(f)));
  assert(
    declaring.length === 1,
    `exactly one script declares ENDINGS (found ${declaring.length}: ${declaring.join(', ') || 'none'})`,
  );
  assert(
    declaring[0] === 'engine.js',
    `ENDINGS is declared in engine.js beside recordEnding (found in ${declaring[0] || 'nothing'})`,
  );
  if (declaring[0] !== 'engine.js') return;

  // seam B: it is a flat array of string literals, and we can read them.
  const decl = read('engine.js').match(/const\s+ENDINGS\s*=\s*\[([^\]]*)\]/);
  if (!assert(decl !== null, 'ENDINGS is an array literal we can read statically')) return;
  const declared = [...decl[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
  assert(declared.length > 0, 'ENDINGS is not empty');

  // seam C: every recordEnding() call passes a literal, so the set
  // comparison below stays honest. a dynamic recordEnding(x) is invisible
  // to static reading, so fail loudly rather than quietly under-count.
  // matches `recordEnding(` followed by a non-quote argument — which skips
  // both `function recordEnding(` and bare prose mentions like this one.
  let literalCalls = 0;
  let dynamicCalls = 0;
  const named = new Set();
  for (const f of FILES) {
    const src = read(f);
    for (const m of src.matchAll(/\brecordEnding\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      literalCalls++;
      named.add(m[1]);
    }
    for (const _ of src.matchAll(/(?<!function\s)\brecordEnding\s*\(\s*(?!['"])[^)\s]/g)) dynamicCalls++;
  }
  assert(dynamicCalls === 0, `no recordEnding() call passes a non-literal (found ${dynamicCalls})`);
  assert(literalCalls > 0, 'recordEnding() is actually called somewhere');

  // seam D: the declared list and the reachable call sites agree, both ways.
  const declaredSet = new Set(declared);
  const missing = [...named].filter(n => !declaredSet.has(n));   // recorded but unlisted
  const unused = [...declaredSet].filter(n => !named.has(n));    // listed but never recorded
  assert(missing.length === 0, `every recorded ending is listed in ENDINGS (stray: ${missing.join(', ')})`);
  assert(unused.length === 0, `every ending in ENDINGS has a recordEnding() call (unreachable: ${unused.join(', ')})`);

  // seam E: the boot block counts against ENDINGS.length, with no stray 3.
  const lines = read('story.js').split('\n');
  const start = lines.findIndex(l => l.includes('if (meta.endings'));
  if (!assert(start !== -1, "story.js still guards the boot 'endings found' line on meta.endings")) return;
  let end = -1;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === '}') { end = i; break; }
  }
  if (!assert(end !== -1, 'the endings-found guard has a readable closing brace')) return;
  const block = lines.slice(start, end + 1).join('\n');

  assert(block.includes('endings found:'), 'the guard still wraps the endings-found line');
  assert(block.includes('Object.keys(meta.endings)'), 'the found-count still reads meta.endings');
  assert(block.includes('ENDINGS.length'), 'the total is derived from ENDINGS.length');
  assert(!/\b3\b/.test(block), 'no hardcoded 3 remains in the endings-found block');
});

/* ------------- shared readers for the walk below -------------
   line-based, not brace-counting: every top-level function in this
   codebase opens at column 0 and closes with a bare `}` at column 0.
   counting braces would trip over the `{ c: 'stay' }` chip literals
   and the braces living inside story strings. */
function topLevelFn(file, name) {
  const lines = read(file).split('\n');
  const start = lines.findIndex(l => new RegExp(`^(?:async\\s+)?function\\s+${name}\\s*\\(`).test(l));
  if (start === -1) return null;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i] === '}') return lines.slice(start, i + 1).join('\n');
  }
  return null;
}

/* ============================================================
   3. endings walk — every ending has a path a player can take
   the claim: from act v, each name passed to recordEnding() is
   reachable by typing (or clicking) a command that exists.
   seams: the recordEnding() call sites in finale.js, the
   COMMANDS.* assignments in chapter5(), suggestCmds' `case 5`,
   the three fragment() award sites in story.js's catCmd, and the
   FS_VIS predicates guarding the files those fragments live in.
   ============================================================ */
section('endings walk: every ending is reachable from act v', () => {
  const finale = read('finale.js');
  const story = read('story.js');

  /* ---- A. each recordEnding() sits inside a named ending function ---- */
  // walked line by line so we learn *which* function records each ending —
  // that name is what we then chase to a command below.
  const endingFn = new Map();   // ending name -> enclosing function
  {
    let cur = null;
    for (const line of finale.split('\n')) {
      const head = line.match(/^(?:async\s+)?function\s+(\w+)\s*\(/);
      if (head) cur = head[1];
      else if (line === '}') cur = null;
      const call = line.match(/\brecordEnding\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (call) endingFn.set(call[1], cur);
    }
  }
  const orphan = [...endingFn].filter(([, fn]) => fn === null).map(([e]) => e);
  assert(orphan.length === 0, `every recordEnding() sits inside a named function (loose: ${orphan.join(', ')})`);
  assert(endingFn.size > 0, 'finale.js records at least one ending');

  /* ---- B. each ending function is wired to an act-v command ---- */
  const ch5 = topLevelFn('finale.js', 'chapter5');
  if (!assert(ch5 !== null, 'finale.js still declares a top-level chapter5()')) return;

  // the handlers are assigned back to back and closed off by the
  // COMMAND_NAMES refresh; slice there so the last handler's segment
  // doesn't swallow the rest of the act.
  const wiringEnd = ch5.indexOf('COMMAND_NAMES');
  assert(wiringEnd !== -1, 'chapter5() refreshes COMMAND_NAMES after wiring (tab-complete and chips read it)');
  const wiring = ch5.slice(0, wiringEnd === -1 ? ch5.length : wiringEnd);

  const assigns = [...wiring.matchAll(/COMMANDS\.(\w+)\s*=\s*async/g)];
  assert(assigns.length > 0, 'chapter5() assigns at least one COMMANDS handler');

  const cmdOf = new Map();    // ending function -> {cmd, arg}
  for (let i = 0; i < assigns.length; i++) {
    const from = assigns[i].index;
    const to = i + 1 < assigns.length ? assigns[i + 1].index : wiring.length;
    const body = wiring.slice(from, to);
    // a handler that demands a first argument rejects the bare verb —
    // `shutdown` alone is a dead end, `shutdown --graceful` is the door.
    const req = body.match(/\(\s*args\[0\]\s*\|\|\s*''\s*\)\s*!==\s*['"]([^'"]+)['"]/);
    for (const fn of endingFn.values()) {
      if (fn && new RegExp(`\\b${fn}\\s*\\(`).test(body)) {
        cmdOf.set(fn, { cmd: assigns[i][1], arg: req ? req[1] : null });
      }
    }
  }

  const unwired = [...endingFn].filter(([, fn]) => !cmdOf.has(fn));
  assert(
    unwired.length === 0,
    `every ending function is called by an act-v command (no way to trigger: ${unwired.map(([e, fn]) => `${e} → ${fn}()`).join(', ')})`,
  );

  /* ---- C. the click-only path can reach them too ---- */
  // suggestCmds' `case 5` is the whole chip menu for act v. a player who
  // never types must find every ending in there, argument included.
  const sugg = topLevelFn('story.js', 'suggestCmds');
  if (!assert(sugg !== null, 'story.js still declares a top-level suggestCmds()')) return;
  const c5at = sugg.indexOf('case 5:');
  if (!assert(c5at !== -1, 'suggestCmds() still has an act-v branch')) return;
  const c5 = sugg.slice(c5at);

  for (const [ending, fn] of endingFn) {
    const w = cmdOf.get(fn);
    if (!w) continue;
    const chip = w.cmd + (w.arg ? ' ' + w.arg : '');
    assert(
      c5.includes(`'${chip}'`),
      `act-v chips offer '${chip}' for the ${ending} ending (click-only path)`,
    );
  }

  /* ---- D. the patch prerequisite: three fragments, three open doors ----
     `patch entropy` is the one ending gated on collected state, so its
     reachability is really three file-reads being possible. each entry
     below names the live guard it depends on; if a guard is renamed or
     moved the string stops matching and this fails rather than lying. */
  const FRAGMENTS = [
    {
      n: 1,
      file: 'IR-0.txt',
      fsPath: '~/reality/DO_NOT_OPEN/IR-0.txt',
      typed: 'cat reality/DO_NOT_OPEN/IR-0.txt',
      flag: 'dnoUnlocked',
      guard: "p.includes('DO_NOT_OPEN') && !G.flags.dnoUnlocked",
    },
    {
      n: 2,
      file: 'last_human.log',
      fsPath: '~/var/log/sessions/last_human.log',
      typed: 'cat var/log/sessions/last_human.log',
      flag: 'knowsLog',
      guard: "FS_VIS['~/var/log/sessions/last_human.log'] = g => !!g.flags.knowsLog",
    },
    {
      n: 3,
      file: 'entropy.yaml',
      fsPath: '~/reality/constants/entropy.yaml',
      typed: 'cat reality/constants/entropy.yaml',
      flag: 'deepEntropy',
      guard: "p.endsWith('entropy.yaml') && G.flags.deepEntropy",
    },
  ];

  // the table can't go stale in secret: a fourth fragment added to catCmd
  // fails here instead of quietly sitting outside the walk.
  const awarded = new Set([...story.matchAll(/\bfragment\(\s*(\d+)\s*\)/g)].map(m => Number(m[1])));
  const tabled = new Set(FRAGMENTS.map(f => f.n));
  assert(
    awarded.size === tabled.size && [...awarded].every(n => tabled.has(n)),
    `the walk covers every fragment() award site (source: ${[...awarded].join(',')} / walked: ${[...tabled].join(',')})`,
  );

  // the menu, the handler and the chip gate must all want the same count,
  // or `patch entropy` is offered and then refused (or never offered).
  const thresholds = [
    ...[...ch5.matchAll(/G\.frags\s*(?:>=|<)\s*(\d+)/g)].map(m => ({ where: 'chapter5', n: Number(m[1]) })),
    ...[...c5.matchAll(/G\.frags\s*(?:>=|<)\s*(\d+)/g)].map(m => ({ where: 'act-v chips', n: Number(m[1]) })),
  ];
  assert(thresholds.length > 0, 'the fragment threshold is stated somewhere we can read it');
  const off = thresholds.filter(t => t.n !== awarded.size);
  assert(
    off.length === 0,
    `every fragment gate wants ${awarded.size} (mismatched: ${off.map(t => `${t.where} wants ${t.n}`).join(', ')})`,
  );

  // FS_VIS predicates, parsed once, so we can walk each fragment's path.
  const vis = [...story.matchAll(/FS_VIS\['([^']+)'\]\s*=\s*([^;]+);/g)].map(m => ({ path: m[1], pred: m[2] }));
  assert(vis.length > 0, 'story.js still registers FS_VIS predicates');

  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const f of FRAGMENTS) {
    // the award site itself: cat this file, get this fragment.
    assert(
      new RegExp(`p\\.endsWith\\('${esc(f.file)}'\\)[^\\n]*fragment\\(${f.n}\\)`).test(story),
      `catCmd awards fragment ${f.n} for reading ${f.file}`,
    );
    // the file exists in the FS tree literal, so the read can succeed.
    assert(story.includes(`'${f.file}':`), `${f.file} exists as a file in story.js's FS tree`);
    // the gate that would block that read is still the one we walked.
    assert(story.includes(f.guard), `fragment ${f.n}'s gate is still \`${f.guard}\``);
    // and act v opens it — set inside chapter5 itself, so resuming or
    // jumping straight into the last room still unlocks every door.
    assert(
      new RegExp(`G\\.flags\\.${f.flag}\\s*=\\s*true`).test(ch5),
      `chapter5() sets G.flags.${f.flag}, opening fragment ${f.n}'s door in act v`,
    );
    // the player is actually told the path (typed hint or clickable chip).
    assert(story.includes(f.typed), `story.js hands the player \`${f.typed}\``);
    // every FS_VIS predicate on the way down is satisfied by a flag act v sets.
    for (const v of vis) {
      if (f.fsPath !== v.path && !f.fsPath.startsWith(v.path + '/')) continue;
      const flags = [...v.pred.matchAll(/g\.flags\.(\w+)/g)].map(m => m[1]);
      assert(
        flags.some(fl => new RegExp(`G\\.flags\\.${fl}\\s*=\\s*true`).test(ch5)),
        `FS_VIS['${v.path}'] opens in act v for fragment ${f.n} (needs one of: ${flags.join(', ') || 'no flag at all'})`,
      );
    }
  }

  // fragment 2 has no act-v chip of its own — and doesn't need one, because
  // act iv refuses to end until the player has read Miriam's log. that
  // explore() gate is what makes the missing chip safe; if it is ever
  // loosened, fragment 2 becomes unreachable on the click-only path and
  // `patch entropy` goes with it. so pin the gate, not the chip.
  const frag2Chip = c5.includes(FRAGMENTS[1].typed);
  const ch4 = topLevelFn('finale.js', 'chapter4');
  if (!assert(ch4 !== null, 'finale.js still declares a top-level chapter4()')) return;
  assert(
    frag2Chip || /explore\(\s*g\s*=>\s*g\.flags\.readMiriam\s*\)/.test(ch4),
    'act iv blocks on readMiriam (or act v offers the log as a chip) — otherwise fragment 2 is unclickable',
  );
});

/* ============================================================
   4. sound gate — "sound off" means silent, everywhere, always
   the claim: every oscillator lives inside engine.js's snd module;
   its three sound-making entry points (tone/pad/hum) each refuse to
   fire while G.muted; and story.js's `sound` command actually drives
   snd.hum, so the acts-iii+ ambient hum can't outlive a mute (or fail
   to come back on unmute).
   seams: engine.js's `const snd = (() => {...})();` IIFE, and
   story.js's `C.sound = async (args) => {...}`.
   ============================================================ */
section('sound gate: G.muted silences every cue, including the hum', () => {
  const engine = read('engine.js');
  const story = read('story.js');

  /* ---- A. the snd IIFE is the only place an oscillator gets built ---- */
  const sndStart = engine.indexOf('const snd = (() => {');
  if (!assert(sndStart !== -1, 'engine.js still declares the snd module as `const snd = (() => {`')) return;
  const closeMarker = '\n})();';
  const sndEnd = engine.indexOf(closeMarker, sndStart);
  if (!assert(sndEnd !== -1, 'the snd module still closes with a top-level `})();`')) return;
  const sndBody = engine.slice(sndStart, sndEnd + closeMarker.length);

  const oscCalls = [...engine.matchAll(/\.createOscillator\s*\(/g)];
  assert(oscCalls.length > 0, 'engine.js actually creates oscillators somewhere (or the check below is vacuous)');
  const oscOutside = oscCalls.filter(m => m.index < sndStart || m.index >= sndEnd);
  assert(
    oscOutside.length === 0,
    `every createOscillator() call sits inside the snd module (found ${oscOutside.length} outside it)`,
  );
  for (const f of ['story.js', 'finale.js']) {
    assert(!read(f).includes('createOscillator'), `${f} never calls createOscillator directly (must go through snd)`);
  }

  /* ---- B. tone/pad/hum each guard on G.muted before making sound ----
     brace-balanced, not column-0: these are nested inside the returned
     object literal (or, for tone, a helper above it), so topLevelFn's
     column-0-close convention above doesn't apply here. */
  function member(openAt) {
    const start = sndBody.indexOf(openAt);
    if (start === -1) return null;
    const braceAt = sndBody.indexOf('{', start);
    if (braceAt === -1) return null;
    let depth = 0;
    for (let i = braceAt; i < sndBody.length; i++) {
      if (sndBody[i] === '{') depth++;
      else if (sndBody[i] === '}') {
        depth--;
        if (depth === 0) return sndBody.slice(start, i + 1);
      }
    }
    return null;
  }

  const tone = member('function tone(');
  assert(tone !== null, 'snd still defines a `function tone(...)` helper');
  const pad = member('pad(freqs');
  assert(pad !== null, 'snd still returns a `pad(freqs, ...)` method');
  const hum = member('hum(on)');
  assert(hum !== null, 'snd still returns a `hum(on)` method');

  for (const [name, body] of [['tone', tone], ['pad', pad], ['hum', hum]]) {
    if (!body) continue;
    const muteAt = body.indexOf('G.muted');
    const oscAt = body.indexOf('createOscillator');
    assert(
      muteAt !== -1 && oscAt !== -1 && muteAt < oscAt,
      `${name} checks G.muted before its first createOscillator() call`,
    );
  }
  // hum's teardown branch has no oscillator to guard (it only stops one),
  // so the G.muted check that matters lives on the start branch. pin that
  // branch by name rather than trust "body contains G.muted" to mean the
  // right half guards — a mute check on the wrong branch would still pass
  // the loose form of the assertion above.
  assert(
    /if\s*\(\s*on\s*&&\s*!humOsc\s*&&\s*!G\.muted\s*\)/.test(hum || ''),
    "hum's start branch is gated on `on && !humOsc && !G.muted` (so calling hum(true) while muted can't start it)",
  );

  /* ---- C. the sound command actually drives the hum ---- */
  const soundStart = story.indexOf('C.sound = async');
  if (!assert(soundStart !== -1, "story.js still declares `C.sound = async (args) => {...}`")) return;
  const soundEnd = story.indexOf('\n  };', soundStart);
  if (!assert(soundEnd !== -1, 'C.sound still closes with `};` on its own line')) return;
  const soundBody = story.slice(soundStart, soundEnd);

  assert(soundBody.includes('G.muted = true'), 'C.sound still sets G.muted = true on `sound off`');
  assert(soundBody.includes('G.muted = false'), 'C.sound still sets G.muted = false on `sound on`');
  const offBranch = soundBody.slice(0, soundBody.indexOf("=== 'on'"));
  assert(
    /snd\.hum\s*\(\s*false\s*\)/.test(offBranch),
    '`sound off` calls snd.hum(false) — otherwise a hum already running in acts iii+ survives the mute',
  );

  const onBranch = soundBody.slice(soundBody.indexOf("=== 'on'"));
  const humTrueAt = onBranch.indexOf('snd.hum(true)');
  assert(humTrueAt !== -1, '`sound on` calls snd.hum(true) to restart the hum');
  assert(
    humTrueAt !== -1 && onBranch.indexOf('G.muted = false') !== -1 && onBranch.indexOf('G.muted = false') < humTrueAt,
    'G.muted is cleared before snd.hum(true) is called — hum(true) itself no-ops while G.muted, so the order is load-bearing',
  );
  assert(
    humTrueAt !== -1 && /G\.chapter\s*>=\s*3/.test(onBranch) && onBranch.indexOf('G.chapter') < humTrueAt,
    "`sound on`'s snd.hum(true) call is guarded by G.chapter >= 3, checked before the call (acts i-ii never started a hum to restart)",
  );
});

/* ============================================================
   next mission appends its section() above this line
   ============================================================ */

if (failed > 0) {
  console.log(`\n${failed} of ${total} checks failed.`);
  process.exit(1);
}
console.log(`\nall ${total} checks passed.`);
