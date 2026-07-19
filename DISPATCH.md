# DISPATCH — birth checks.mjs (syntax + endings derivation)

## outcome

done

## what changed

- `checks.mjs` — **new file.** The project's first check harness. Plain node,
  `node:fs` + `node:vm` only, `process.exit(1)` on any failure, one `PASS`/`FAIL`
  line per section. Two sections:
  - **1. syntax** — compiles `engine.js`, `story.js`, `finale.js` via
    `new vm.Script(src, {filename})`. Compile only. Nothing in the file calls
    `.runInThisContext()` or imports a game file, because all three touch the DOM
    at top level — the Script constructor stopping at parse is the entire sandbox.
  - **2. endings** — pins the derivation seams (detail under `## tests`).
  Written append-serial: a `next mission appends its section() above this line`
  marker sits just above the exit block, so M2/M3/M4 append rather than rewrite.
- `engine.js` — added `const ENDINGS = ['stay', 'shutdown', 'patch'];` at line 61,
  directly above `recordEnding()` (now line 63), with a comment naming the
  contract. No behavior change; it is a new binding nothing else touched yet.
- `story.js` — the boot `endings found` block (lines 897–901) now takes
  `const total = ENDINGS.length` and uses `total` in all three places that were
  hardcoded `3` (the `○` padding, the `[n/3]` counter, the `found < 3` branch).

Not changed: `NEXT.md` (its "verify every ending is reachable and the boot-screen
counter is accurate" box stays open — the endings *walk* is the next mission by
the order's own split; this mission only did the derivation half).

## tests

`checks.mjs` **is** the test — the project had no harness at all before this.
Confirmed by reading: no `tests/` dir, no `package.json`, and the README's only
instruction is "Open `index.html` in a browser. That's it — no build, no server,
no network." So there was no existing setup to match; this is the setup.

17 assertions, all static-read, each pinned to a named seam:

| section | assertions | seam it would catch |
|---|---|---|
| syntax | 3 | any parse error in the three shipped scripts |
| endings A | 2 | ENDINGS declared in exactly one file, and that file is `engine.js` — two classic scripts declaring the same top-level `const` is a load-time `SyntaxError` that kills the second script outright |
| endings B | 2 | ENDINGS is still a readable flat array of string literals, and non-empty |
| endings C | 2 | no `recordEnding()` call passes a non-literal (a dynamic call would be invisible to static reading and silently under-count), and it is called at all |
| endings D | 2 | declared set == call-site set, checked **both** directions: a recorded-but-unlisted ending, and a listed-but-unreachable one |
| endings E | 6 | story.js's guard still exists, still reads `Object.keys(meta.endings)`, derives its total from `ENDINGS.length`, and has no `\b3\b` left in the block |

Expected green output:

```
PASS  syntax: engine.js, story.js, finale.js compile  (3 assertions)
PASS  endings: boot counter derives from ENDINGS  (14 assertions)

all 17 checks passed.
```

**What it does NOT cover:**

- **Reachability.** Nothing here proves a player can actually *reach* `stay`,
  `shutdown` or `patch`. It proves the three call sites exist in source and match
  the list. An ending behind an unreachable branch still passes. That is the
  next mission (the endings walk), by design.
- **Runtime.** Compile-only means zero execution. A file that parses and then
  throws on line 1 at runtime passes section 1.
- **Cross-script binding.** `checks.mjs` compiles each file in isolation, so it
  cannot verify that `ENDINGS` (declared in engine.js) actually resolves from
  story.js. That relies on classic scripts sharing one global lexical
  environment and on index.html's load order (engine → story → finale, lines
  275–277). It is the same mechanism `G` already depends on across all three
  files, so the precedent is load-bearing and long-standing — but it is
  inference from reading, not an observation.
- **Byte-pinned output.** I checked for exact-string assertions that my change
  could break: there are none in the repo (no test files existed). The rendered
  boot line is byte-identical anyway while ENDINGS has three entries.
- The `\b3\b` guard is scoped to the story.js endings block only. A hardcoded 3
  about endings anywhere else in the codebase is not caught.

## unverified

A human should check:

1. **`node checks.mjs` exits 0.** I could not run it — the non-interactive
   permission gate blocked `node checks.mjs` (same fence PROGRESS.md records for
   the previous crew's `node --check`). Everything below is hand-traced, not
   observed.
2. **One trap I caught by reading, worth re-checking.** My first draft counted
   "all `recordEnding(` occurrences" and compared against literal call sites, to
   catch dynamic calls. That regex also matched the prose `recordEnding()` in my
   own new engine.js comment (line 57) → 4 "calls" vs 3 literal → spurious FAIL
   on a green tree. Fixed by matching `recordEnding(` followed by a *non-quote,
   non-`)`* argument instead, which skips both `function recordEnding(` and bare
   prose mentions. If checks.mjs fails on seam C, this is the first place to look.
3. **`import.meta.dirname`** (checks.mjs:29) needs Node 20.11+. There is a
   fallback via `new URL('.', import.meta.url).pathname`, but the primary path is
   untested here.
4. **The boot line still renders identically.** Load the page with at least one
   ending recorded in `codex_meta` and confirm the `endings found: ●○○ [1/3]`
   line is unchanged.

I was also unable to load the ordered skills: there is no `.claude/skills` in the
worktree, and `/Users/cody/.claude` is outside my read fence. No `CLAUDE.md`
exists in the worktree either. Worked from NEXT.md, LOOPS.md and README.md.

## drive

I cannot run the app; the receiver runs this.

**Invariant:** the boot screen's endings total is *derived* from `ENDINGS`, so
the displayed denominator and the `○` padding can never disagree with the list
of endings the game can actually record.

**Steps (unrun):**

1. `node checks.mjs` at the worktree root.
   **Expect:** two `PASS` lines, `all 17 checks passed.`, exit 0.
2. Break it on purpose, to prove the check can fail — the whole point of the
   section. In `story.js:901`, change `found < total` back to `found < 3`.
   Re-run.
   **Expect:** `FAIL  endings: boot counter derives from ENDINGS` with
   `✗ no hardcoded 3 remains in the endings-found block`, exit 1. Revert.
3. Second failure proof, for the derivation half: add a 4th entry to `ENDINGS`
   in `engine.js:61` (e.g. `'ghost'`). Re-run.
   **Expect:** `✗ every ending in ENDINGS has a recordEnding() call
   (unreachable: ghost)`, exit 1. Revert.
4. Open `index.html`. If `codex_meta` is empty the endings line is correctly
   absent (it is guarded on `meta.endings`) — play to any ending, or seed it in
   devtools: `localStorage.setItem('codex_meta', JSON.stringify({endings:{stay:1}}))`,
   then reload.
   **Expect:** `endings found: ●○○  [1/3] — one of them has to be earned.`
   Byte-identical to before this change. A `[1/4]`, a fourth `○`, or a
   `ReferenceError: ENDINGS is not defined` in the console all mean the
   cross-script binding assumption in `## tests` is wrong.

## notes

- Kept strictly to the order: no refactors, no scope creep, zero dependencies
  added (there is no manifest to add one to).
- The two source edits are deliberately minimal. `ENDINGS` sits beside
  `recordEnding` rather than at the top of engine.js so the list and its only
  writer stay in one screenful, and so checks.mjs's "declared in engine.js"
  assertion means something.
- Section 2 checks the declared/called sets in **both** directions on purpose. A
  one-way check would let a listed-but-never-recorded ending inflate the boot
  denominator forever — exactly the bug the mission after this one goes hunting
  for, so it is worth failing fast here.
- Left the endings-walk hook alone. LOOPS.md's "Chip autoplay" loop (replay
  `suggestCmds()` into `handleLine()`) is the obvious spine for it, and
  section 2's `ENDINGS` list is the natural target for that walk to satisfy.
