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
   5. save timing — progress persists at the moment of choice
   the claim: every completed command writes the save, so mid-act
   state (mercy, frags, purgedQNS/starsCut and friends) survives a
   closed tab; nothing relies on an unload handler to do it; and the
   session-ending paths await forever instead of falling back through
   handleLine's tail to write a second time.
   seams: engine.js's handleLine() tail, its save() payload,
   story.js's bootSequence() resume branch, explore()'s dispatch
   call, and every location.reload() call site in finale.js.

   `codex --jump <act>` (finale.js) took the forever-await rather
   than keeping its idempotent double-write — same idiom as the two
   endings that reload, and seam E below now covers all three at once.

   NOT pinned here, and worth knowing: resume replays an act from the
   top, and the explore() gates keyed on ticket state rather than on
   G.flags do not pass instantly, because G.tickets/G.closed are the
   two pieces of state save() has never persisted. See DISPATCH.md
   (## the hand-trace) for the two gates and the mercy miscount they
   allow. That is a live hazard, not a promise, so it gets no
   assertion that would pass today and fail on the fix.
   ============================================================ */
section('save timing: every command persists, no unload handler', () => {
  const engine = read('engine.js');

  /* ---- A. handleLine ends with tick() and then the save ----
     order is load-bearing both ways: tick() before save, so flags any
     gate flipped are in the payload; save last, so a command that ran
     to completion is on disk before the player can close anything. */
  const handleLine = topLevelFn('engine.js', 'handleLine');
  if (!assert(handleLine !== null, 'engine.js still declares a top-level handleLine()')) return;

  const stmts = handleLine
    .split('\n')
    .slice(1, -1)                                   // drop the signature and the closing brace
    .map(l => l.trim())
    .filter(l => l !== '' && !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith('*'));
  const tail = stmts.slice(-2);
  assert(
    tail[0] === 'tick();',
    `handleLine's second-to-last statement is tick() (found: ${tail[0] || 'nothing'})`,
  );
  assert(
    /^save\(\s*G\.chapter\s*\);$/.test(tail[1] || ''),
    `handleLine's last statement is save(G.chapter) (found: ${tail[1] || 'nothing'})`,
  );

  /* ---- B. that tail is on the live player path ----
     explore() is the only thing that dispatches a typed or clicked line;
     if it ever stopped routing through handleLine, section A would still
     pass while nothing on the player's path saved at all. */
  const explore = topLevelFn('engine.js', 'explore');
  if (!assert(explore !== null, 'engine.js still declares a top-level explore()')) return;
  assert(
    /await\s+handleLine\s*\(/.test(explore),
    'explore() still dispatches through handleLine (the tail save rides on this call)',
  );
  const dispatchers = [...engine.matchAll(/\bawait\s+handleLine\s*\(/g)].length;
  assert(dispatchers === 1, `handleLine has exactly one call site (found ${dispatchers})`);

  /* ---- C. the payload is worth saving, and boot reads all of it ----
     saving on every command only buys anything if the fields that move
     mid-act are in the blob AND the resume branch restores them. a key
     dropped from either side is a silent half-save. */
  const saveFn = topLevelFn('engine.js', 'save');
  if (!assert(saveFn !== null, 'engine.js still declares a top-level save()')) return;
  assert(saveFn.includes("localStorage.setItem('codex_save'"), "save() still writes the 'codex_save' key");

  const payload = saveFn.match(/JSON\.stringify\(\{([\s\S]*?)\}\)\)/);
  if (!assert(payload !== null, "save()'s payload is an object literal we can read statically")) return;
  const keys = payload[1]
    .split(',')
    .map(part => part.split(':')[0].trim())
    .filter(k => /^\w+$/.test(k));
  for (const k of ['ch', 'mercy', 'frags', 'flags']) {
    assert(keys.includes(k), `save() persists ${k} (mid-act state is the whole point of the tail save)`);
  }

  const boot = topLevelFn('story.js', 'bootSequence');
  if (!assert(boot !== null, 'story.js still declares a top-level bootSequence()')) return;
  const unread = keys.filter(k => !new RegExp(`\\bsv\\.${k}\\b`).test(boot));
  assert(
    unread.length === 0,
    `bootSequence() reads back every key save() writes (written but never restored: ${unread.join(', ')})`,
  );

  /* ---- D. nothing leans on an unload handler ----
     beforeunload is unreliable on mobile Safari and on any tab the OS
     discards, and it would paper over a missing save with something that
     works on the desk and not on the train. the tail save is the mechanism;
     there is no second one. */
  for (const f of FILES) {
    const hits = [...read(f).matchAll(/\b(?:beforeunload|onunload)\b/g)].length;
    assert(hits === 0, `${f} registers no unload handler (found ${hits})`);
  }

  /* ---- E. session-ending paths never return to the tail ----
     location.reload() does not stop the current task — it schedules a
     navigation and lets the rest of the function run. so any reload that
     isn't followed by a forever-await falls back out through handleLine
     and writes the save a second time. the two endings that reboot
     already used this idiom; `codex --jump` now does too. */
  const FOREVER = /^await\s+new\s+Promise\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)\s*;/;
  let reloads = 0;
  for (const f of FILES) {
    const lines = read(f).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!/\blocation\.reload\s*\(\s*\)/.test(lines[i])) continue;
      reloads++;
      let next = '';
      for (let j = i + 1; j < lines.length; j++) {
        const t = lines[j].trim();
        if (t === '' || t.startsWith('//')) continue;
        next = t;
        break;
      }
      assert(
        FOREVER.test(next),
        `${f}:${i + 1} awaits forever after location.reload() (found: ${next || 'end of file'})`,
      );
    }
  }
  assert(reloads > 0, 'there are reload call sites to check (or the rule above is vacuous)');
});

/* ============================================================
   6. boot POST — chrome that never holds the player up
   the claim: bootSequence() runs the power-on self test before the
   CODEX art; the player can cut it short at any moment from either
   input path; prefers-reduced-motion gets the whole block with no
   motion at all; and its cues go through snd.* rather than reaching
   for an oscillator of their own.
   seams: story.js's `const POST_LINES`, its `async function
   meridianPOST()`, the meridianPOST() call site in bootSequence(),
   and the `if (reduced)` branch inside the POST.

   Section 4 already owns the global "no oscillator outside snd" rule
   for all three files. Group D below is the POST-local form of it —
   the seam a regression in *this* feature would disturb — so the two
   are deliberately different scopes, not a duplicate.
   ============================================================ */
section('boot POST: skippable, reduced-motion-safe, snd-only', () => {
  const story = read('story.js');

  const post = topLevelFn('story.js', 'meridianPOST');
  if (!assert(post !== null, 'story.js still declares a top-level meridianPOST()')) return;

  /* brace-balanced slice from a marker. safe here (and only here)
     because nothing inside meridianPOST() puts a brace in a string —
     POST_LINES is flat text and the closures are balanced code. */
  function blockAt(src, marker) {
    const start = src.indexOf(marker);
    if (start === -1) return null;
    const braceAt = src.indexOf('{', start);
    if (braceAt === -1) return null;
    let depth = 0;
    for (let i = braceAt; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}' && --depth === 0) return src.slice(start, i + 1);
    }
    return null;
  }

  /* ---- A. the POST runs, and runs before the art ----
     ordering is the whole point: a POST printed after the CODEX banner
     is not a power-on self test, it is a footnote. */
  const boot = topLevelFn('story.js', 'bootSequence');
  if (!assert(boot !== null, 'story.js still declares a top-level bootSequence()')) return;
  const postAt = boot.indexOf('meridianPOST(');
  const artAt = boot.indexOf('title-art');
  assert(postAt !== -1, 'bootSequence() calls meridianPOST()');
  assert(/await\s+meridianPOST\s*\(\s*\)/.test(boot), 'bootSequence() awaits meridianPOST() (an un-awaited POST types over the art)');
  assert(artAt !== -1, "bootSequence() still prints the CODEX art as 'title-art' (or the ordering check below is vacuous)");
  assert(
    postAt !== -1 && artAt !== -1 && postAt < artAt,
    'meridianPOST() is called before the boot art',
  );

  // the three beats the POST was asked to hit, pinned as content.
  const linesDecl = story.match(/const\s+POST_LINES\s*=\s*\[([\s\S]*?)\n\];/);
  if (!assert(linesDecl !== null, 'story.js declares `const POST_LINES = [...]` we can read statically')) return;
  const postLines = linesDecl[1];
  assert([...postLines.matchAll(/\[\s*'/g)].length >= 3, 'POST_LINES has at least three log lines');
  for (const [beat, needle] of [['the motd', 'motd:'], ["VERA's handshake", 'VERA'], ['the mounting reality/ wink', 'mounting reality/']]) {
    assert(postLines.includes(needle), `POST_LINES still carries ${beat} (looked for "${needle}")`);
  }

  /* ---- B. a skip check lives inside the typing loop ----
     the per-character loop is the only place that can strand a player:
     without a check in the loop body, a keypress is swallowed until the
     current line finishes typing. so pin the check to the loop itself,
     not merely to the function containing one somewhere. */
  const typeLoop = blockAt(post, 'for (let i = 0');
  if (!assert(typeLoop !== null, 'meridianPOST() still types character-by-character in a `for (let i = 0; ...)` loop')) return;
  assert(
    /if\s*\(\s*skip\(\)\s*\)/.test(typeLoop),
    'the typing loop checks skip() on every character (otherwise a keypress waits out the current line)',
  );
  assert(
    /el\.textContent\s*=\s*text\s*;\s*break\s*;/.test(typeLoop),
    'the skip branch fills the rest of the line and breaks (a skip that only stops typing leaves the line truncated)',
  );

  // and skip() must actually be wired to the engine's two input signals.
  const skipFn = post.match(/const\s+skip\s*=\s*\(\)\s*=>([^;]+);/);
  if (!assert(skipFn !== null, 'meridianPOST() defines a `const skip = () => ...` predicate')) return;
  for (const sig of ['skipTyping', 'skipRequested']) {
    assert(skipFn[1].includes(sig), `skip() reads the engine's ${sig} (engine.js's global keydown drives both)`);
  }

  // click is the other half of "any key or click" — the engine's global
  // click handler does NOT bump skipRequested, so the POST must listen
  // for itself, and must clean both listeners up when it is done.
  for (const ev of ['keydown', 'click']) {
    assert(
      new RegExp(`addEventListener\\(\\s*'${ev}'`).test(post),
      `meridianPOST() listens for ${ev} to cut the POST short`,
    );
    assert(
      new RegExp(`removeEventListener\\(\\s*'${ev}'`).test(post),
      `meridianPOST() removes its ${ev} listener when done (a leaked listener outlives the boot)`,
    );
  }
  assert(post.includes('finally'), 'the listeners come off in a finally block (so a throw mid-POST cannot leak them)');

  /* ---- C. the reduced-motion branch prints instantly ----
     "instantly" is the assertion, not "differently": a branch that
     still awaits a sleep is just a second animation. */
  assert(
    /matchMedia\(\s*'\(prefers-reduced-motion:\s*reduce\)'\s*\)/.test(post),
    "meridianPOST() branches on matchMedia('(prefers-reduced-motion: reduce)')",
  );
  const reducedBranch = blockAt(post, 'if (reduced)');
  if (!assert(reducedBranch !== null, 'meridianPOST() has an `if (reduced) { ... }` branch')) return;
  assert(
    /for\s*\(.*of\s+POST_LINES\s*\)\s*print\(/.test(reducedBranch),
    'the reduced-motion branch prints every POST_LINES entry',
  );
  assert(
    !/sleep\s*\(/.test(reducedBranch),
    'the reduced-motion branch awaits no sleep() — the lines appear at once',
  );
  assert(
    /return\s*;/.test(reducedBranch),
    'the reduced-motion branch returns rather than falling through into the typing loop',
  );

  /* ---- D. every POST cue goes through snd.* ---- */
  const cues = [...post.matchAll(/\bsnd\.(\w+)\s*\(/g)].map(m => m[1]);
  assert(cues.length > 0, 'meridianPOST() makes at least one sound through snd.* (or the rule below is vacuous)');
  for (const bare of ['createOscillator', 'AudioContext', 'createGain']) {
    assert(
      !post.includes(bare),
      `meridianPOST() never touches ${bare} directly — all audio goes through snd.*, which is where the G.muted guard lives`,
    );
  }

  /* ---- E. index.html stays out of it ----
     the POST reads the reduced-motion preference in JS; the existing
     CSS @media block is not its mechanism, and this mission promised
     not to touch the page. */
  const html = read('index.html');
  assert(!html.includes('meridianPOST'), 'index.html does not reference meridianPOST (the POST is script-side only)');
  assert(!html.includes('POST_LINES'), 'index.html does not reference POST_LINES');
});

/* ============================================================
   7. boot dots + first-boot memory — the POST's other half
   the claim: the three titlebar dots are unlit from the very first
   paint (the class ships in the markup, not from script), they light
   r → y → g as the POST prints, they always end up lit no matter which
   POST path ran, and the CRT palette gained no new color to do it.
   Second claim: bootSequence() reads a codex_meta counter BEFORE the
   POST and uses it to shorten or skip the self test, so first boot is
   the show and the fourth boot is silent.
   seams: index.html's <body class>, its `body.booting … .dot:not(.lit)`
   rule and the prefers-reduced-motion block; story.js's lightBootDots(),
   bootDotsDone(), shortPOST(), and the loadMeta()/saveMeta() gate that
   sits above the meridianPOST() call site in bootSequence().

   Section 6 owns "the POST, once entered, never holds the player up."
   This one owns "whether it is entered at all, and what the titlebar
   does about it" — adjacent seams, deliberately separate sections.
   ============================================================ */
section('boot dots + first-boot memory: unlit at paint, lit at the end, gated by meta', () => {
  const html = read('index.html');
  const story = read('story.js');

  /* ---- A. the boot class is one name, agreed on in three places ----
     derived from the CSS rule rather than typed here twice, so a rename
     that misses index.html's <body> or story.js's cleanup fails loudly
     instead of quietly leaving the dots dark forever. */
  const bootClassM = html.match(/body\.(\w+)\s+#titlebar\s+\.dot:not\(\.lit\)/);
  if (!assert(bootClassM !== null, 'index.html has a `body.<class> #titlebar .dot:not(.lit)` rule holding the dots unlit')) return;
  const bootClass = bootClassM[1];

  const bodyTag = html.match(/<body([^>]*)>/);
  if (!assert(bodyTag !== null, 'index.html still has a <body> tag we can read')) return;
  assert(
    new RegExp(`class="[^"]*\\b${bootClass}\\b`).test(bodyTag[1]),
    `<body> ships with "${bootClass}" in the markup — a class added by script would let one frame paint with all three dots already lit`,
  );
  assert(
    !FILES.some(f => new RegExp(`classList\\.add\\(\\s*'${bootClass}'`).test(read(f))),
    `no script adds "${bootClass}" (it must arrive with the document, or the first-paint guarantee above is a lie)`,
  );
  assert(
    new RegExp(`classList\\.remove\\(\\s*'${bootClass}'\\s*\\)`).test(story),
    `story.js removes "${bootClass}" when the boot is done (a class nothing clears leaves the machine forever booting)`,
  );

  /* ---- B. the palette is untouched ----
     lighting a dot works by *stopping* the override, so the three dot
     colors are still declared exactly once each and the unlit rule
     reaches for an existing var instead of inventing a grey. */
  for (const hex of ['#b4544e', '#b99b4e', '#5f9e5f']) {
    assert(
      (html.match(new RegExp(hex, 'gi')) || []).length === 1,
      `${hex} is declared exactly once — a lit dot falls back to its own color, it does not restate it`,
    );
  }
  const unlitRule = html.match(/body\.\w+[^{}]*\.dot:not\(\.lit\)[^{}]*\{([^}]*)\}/);
  if (!assert(unlitRule !== null, 'the unlit rule has a readable declaration block')) return;
  assert(/var\(--faint\)/.test(unlitRule[1]), 'an unlit dot uses var(--faint) — the same value the base .dot rule already falls back to');
  assert(!/#[0-9a-fA-F]{3}/.test(unlitRule[1]), 'the unlit rule adds no hex color of its own');

  /* ---- C. r → y → g is a real order, and reduced motion is covered ---- */
  const order = [...html.matchAll(/class="dot (\w+)"/g)].map(m => m[1]);
  assert(
    order.join(',') === 'r,y,g',
    `the titlebar dots are still in r, y, g DOM order (found: ${order.join(',') || 'none'}) — lightBootDots() lights by index, so the order lives here`,
  );
  const rmBlock = html.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/);
  if (!assert(rmBlock !== null, 'index.html still has a prefers-reduced-motion block')) return;
  assert(
    new RegExp(`body\\.${bootClass}`).test(rmBlock[1]),
    'the reduced-motion block covers the boot dots (they arrive lit, with no fade to sit through)',
  );
  assert(!html.includes('lightBootDots'), 'index.html does not reference lightBootDots (the sequencing is script-side only)');

  /* ---- D. the dots light during the POST, and finish after it ---- */
  const light = topLevelFn('story.js', 'lightBootDots');
  if (!assert(light !== null, 'story.js declares a top-level lightBootDots()')) return;
  assert(/querySelectorAll\(\s*'#titlebar \.dot'\s*\)/.test(light), 'lightBootDots() reads the dots from the titlebar rather than assuming how many there are');
  assert(/classList\.add\(\s*'lit'\s*\)/.test(light), "lightBootDots() lights a dot by adding 'lit'");
  assert(!/classList\.remove/.test(light), 'lightBootDots() never un-lights a dot (the sequence only ever moves forward)');

  const done = topLevelFn('story.js', 'bootDotsDone');
  if (!assert(done !== null, 'story.js declares a top-level bootDotsDone()')) return;
  assert(/classList\.add\(\s*'lit'\s*\)/.test(done), 'bootDotsDone() lights every dot');
  assert(new RegExp(`classList\\.remove\\(\\s*'${bootClass}'`).test(done), 'bootDotsDone() takes the boot class off');

  const post = topLevelFn('story.js', 'meridianPOST');
  if (!assert(post !== null, 'story.js still declares a top-level meridianPOST()')) return;
  assert(
    /lightBootDots\s*\(/.test(post),
    'meridianPOST() lights the dots as it prints (otherwise all three pop at once at the end and the sequence is decoration)',
  );

  /* ---- E. the meta gate is read BEFORE the POST ---- */
  const boot = topLevelFn('story.js', 'bootSequence');
  if (!assert(boot !== null, 'story.js still declares a top-level bootSequence()')) return;
  const postAt = boot.indexOf('meridianPOST(');
  const artAt = boot.indexOf('title-art');
  if (!assert(postAt !== -1, 'bootSequence() still calls meridianPOST()')) return;

  // everything above the call site. bootSequence() reads loadMeta() a second
  // time further down for the endings counter — slicing here means only a
  // read that actually gates the POST can satisfy the assertions below.
  const gate = boot.slice(0, postAt);
  const metaVar = gate.match(/(?:const|let)\s+(\w+)\s*=\s*loadMeta\(\s*\)/);
  if (!assert(metaVar !== null, 'bootSequence() calls loadMeta() before the POST (the later endings-counter read does not count)')) return;
  const v = metaVar[1];

  const readField = gate.match(new RegExp(`${v}\\.(\\w+)\\s*\\|\\|`));
  const writeField = gate.match(new RegExp(`${v}\\.(\\w+)\\s*=\\s*[^=]`));
  if (!assert(readField !== null, `bootSequence() reads a defaulted field off ${v} (e.g. \`${v}.x || 0\`)`)) return;
  if (!assert(writeField !== null, `bootSequence() writes the field back on ${v}`)) return;
  assert(
    readField[1] === writeField[1],
    `the boot counter is read and written under one name (read "${readField[1]}", wrote "${writeField[1]}" — a typo here means the POST plays forever)`,
  );
  assert(
    new RegExp(`saveMeta\\(\\s*${v}\\s*\\)`).test(gate),
    'the incremented counter is persisted with saveMeta() before the POST (a read that never writes back never advances)',
  );
  assert(
    !/localStorage/.test(boot + post),
    'the gate goes through loadMeta()/saveMeta() — engine.js is where the try/catch around storage lives, so a private-window player never eats an exception mid-boot',
  );

  /* ---- F. the gate actually shortens and skips ----
     a counter that is read, incremented, saved, and then ignored is the
     easy regression here: the POST would play in full every time and
     every assertion above would still pass. */
  const postLine = boot.slice(boot.lastIndexOf('\n', postAt) + 1, boot.indexOf('\n', postAt));
  assert(/^\s*if\s*\(/.test(postLine), 'the full POST is behind an `if` — first boot is the show, later boots are not');
  assert(/await\s+meridianPOST\s*\(\s*\)\s*;/.test(postLine), 'the guarded call still awaits meridianPOST()');
  // chase the local the counter was bound to, so "the guard tests the
  // counter" is an identity check rather than a substring coincidence.
  const counterVar = gate.match(new RegExp(`(?:const|let)\\s+(\\w+)\\s*=\\s*${v}\\.${readField[1]}\\b`));
  if (!assert(counterVar !== null, `bootSequence() binds the counter to a local (\`const x = ${v}.${readField[1]} || 0\`)`)) return;
  assert(
    new RegExp(`\\b${counterVar[1]}\\b`).test(postLine),
    `the guard tests the boot counter itself (${counterVar[1]}), not some unrelated condition`,
  );
  assert(
    new RegExp(`else\\s+if\\s*\\([^)]*\\b${counterVar[1]}\\b[^)]*\\)\\s*shortPOST\\s*\\(\\s*\\)`).test(boot),
    `a middle branch runs shortPOST() off the same counter (${counterVar[1]}) — it shortens before it skips`,
  );

  const short = topLevelFn('story.js', 'shortPOST');
  if (!assert(short !== null, 'story.js declares a top-level shortPOST()')) return;
  assert(short.includes('POST_LINES'), 'shortPOST() reads its lines out of POST_LINES');
  assert(!short.includes('MERIDIAN POST'), 'shortPOST() does not hardcode a copy of the header (a new POST line would leave the copy stale)');
  assert(!/sleep\s*\(/.test(short), 'shortPOST() awaits nothing — the abbreviated form is instant, which is the whole point of it');
  assert(/\bsnd\.\w+\s*\(/.test(short), 'shortPOST() cues through snd.* like the full POST, so `sound off` still silences it');

  const doneAt = boot.indexOf('bootDotsDone(');
  assert(doneAt !== -1, 'bootSequence() calls bootDotsDone()');
  assert(
    doneAt > postAt,
    'bootDotsDone() runs after the POST branch — a shortened or skipped POST still ends with all three dots up and the boot class off',
  );
  assert(
    artAt !== -1 && doneAt < artAt,
    'the dots finish before the CODEX art (the titlebar is done booting when the banner lands, not four seconds later)',
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
