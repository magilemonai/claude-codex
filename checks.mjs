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

/* ============================================================
   next mission appends its section() above this line
   ============================================================ */

if (failed > 0) {
  console.log(`\n${failed} of ${total} checks failed.`);
  process.exit(1);
}
console.log(`\nall ${total} checks passed.`);
