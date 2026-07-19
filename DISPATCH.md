## outcome
done

## what changed
- `story.js` (C.sound, ~402-410): `sound off` now also calls `snd.hum(false)`;
  `sound on` calls `snd.hum(true)` when `G.chapter >= 3`.
- `checks.mjs`: appended section 4, "sound gate: G.muted silences every cue,
  including the hum" (~359-464).

## the bug and the fix
`applyAmbient(3)` (finale.js:537) starts a 55Hz hum via `snd.hum(true)` on
entering act iii. `C.sound`'s `off` branch set `G.muted = true` but never
touched the hum oscillator — `hum()`'s own `G.muted` guard only gates the
*start* branch (`if (on && !humOsc && !G.muted)`), not the stop branch, so a
hum already running kept running straight through a mute. `on` had the mirror
problem: `hum(true)` no-ops while `G.muted` is still true, so simply flipping
`G.muted = false` on unmute would not resume a hum that had been silenced.

Fix, in order (order is load-bearing):
- `off`: `G.muted = true` then `snd.hum(false)` (order doesn't matter here —
  `hum(false)` doesn't check `G.muted`, it just tears down if a hum exists).
- `on`: `G.muted = false` **before** `snd.hum(true)`, and only when
  `G.chapter >= 3` (acts i-ii never started a hum, so unconditionally calling
  `hum(true)` there would be a silent no-op today but a landmine if `hum()`'s
  guard is ever loosened — gating on chapter reads as intentional instead of
  incidental).

## audit performed (per the order)
- `createOscillator` appears at engine.js:566, 590, 607 — all three inside
  the `snd` IIFE (engine.js:549-619). Zero occurrences in story.js/finale.js.
- `tone` (engine.js:564), `pad` (585), `hum`'s start branch (606) each check
  `G.muted` before their first `createOscillator()` call. `hum`'s teardown
  branch doesn't need the check — it only stops an oscillator that could only
  exist if it was started while unmuted.
- No other sound cue in engine.js/finale.js bypasses `snd.*` — grepped every
  `snd\.` call site in all three files; the only raw `ctx`/`AudioContext`
  usage is inside the `snd` IIFE itself.

## tests
Added `checks.mjs` section 4 (this project's only test harness — no
package.json, no `tests/` dir, by design). It statically asserts, by reading
source as text (never executing — same compile-only discipline as sections
1-3):
- every `createOscillator()` call sits inside `engine.js`'s `snd` IIFE
  (brace-balanced boundary check from `const snd = (() => {` to its closing
  `})();`), and neither story.js nor finale.js contains the string at all
- `tone`/`pad`/`hum` (extracted with a brace-balanced reader, since they're
  nested in the IIFE's returned object rather than top-level declarations)
  each check `G.muted` before their first oscillator
- `hum`'s start branch is pinned by exact text (`on && !humOsc && !G.muted`),
  not just "the function contains G.muted somewhere" — a guard on the wrong
  branch would pass the loose check but not this one
- `C.sound`'s `off` branch calls `snd.hum(false)`; its `on` branch calls
  `snd.hum(true)`, with `G.muted = false` proven to come before that call
  (textual ordering) and the call itself proven gated on `G.chapter >= 3`

**What it does NOT cover:**
- Static only. It cannot prove the hum is *actually* silent in a browser —
  only that the wiring (guard order, call sites) is in place. It doesn't
  execute AudioContext or observe an actual audio graph.
- It doesn't check the other four ambient/theme side effects in
  `applyAmbient` (fx.theme/crt/flicker/swapped, setTitle) — out of scope,
  those aren't sound.
- It doesn't re-verify sections 1-3's endings/syntax claims; those are
  untouched and still cached-read from the same three files.

## unverified
- **`node checks.mjs` was never run** — blocked by the same non-interactive
  permission gate the last crew hit (confirmed again this session: both
  `node checks.mjs` and even a `python3` sanity heredoc for brace-counting
  were blocked pending approval that never comes in this context). I
  hand-verified every anchor string this section depends on by grepping the
  live source (see below) and re-read the section twice for balanced
  braces/parens/backticks.
  - `const snd = (() => {` — engine.js:549, unique.
  - `^})();` — engine.js:619, unique, matches the section's `\n})();`
    closeMarker search starting from :549.
  - `function tone(` — engine.js:564, unique.
  - `pad(freqs` — engine.js:585, unique.
  - `hum(on)` — engine.js:604, unique.
  - `C.sound = async` — story.js:402, unique.
  - `\n  };` (2-space indent) after story.js:402 — first match is story.js:410,
    the true end of `C.sound`; confirmed no earlier 2-space-indented `};`
    inside the body (the nested `else if` block closes with 4-space `}` at
    story.js:407, which doesn't match).
- The exit code and PASS/FAIL line text for section 4 are unproven, same as
  every other section in this file.

## notes
No `.claude/` directory and no project `CLAUDE.md` exist in this worktree —
same as the prior crew found — so `crew-survival` and `coroner-culture`
couldn't be loaded from a local skills shelf. I read `NEXT.md`, `LOOPS.md`,
`.coop/report.md`, and `PROGRESS.md`'s tail for context instead. No failure
or flake occurred this session, so `coroner-culture` (available globally,
just not as a local project skill) was never triggered.

This closes the sound half of NEXT.md's "audit that all synthesized sound
cues honor `sound off` across five acts." I did not check that box — same
call as the M2 crew made for the endings box — because its acceptance is a
green `node checks.mjs`, which I couldn't run.

## drive
Unrun. I cannot execute node or open a browser; the receiver runs these.

**1. The check itself.**

    node checks.mjs

*Invariant:* every oscillator lives in `snd`, `tone`/`pad`/`hum` guard on
`G.muted`, and the sound command drives the hum both ways.

*Expect:* four `PASS` lines (syntax, endings-counter, endings-walk, sound
gate), then `all N checks passed.`, exit 0.

**2. Prove the check can fail — the leak itself.** In story.js, remove
`snd.hum(false);` from the `off` branch (revert to the pre-fix line).

*Invariant:* muting must stop an already-running hum, not just silence future
cues.

*Expect:* `FAIL  sound gate` with
`✗ \`sound off\` calls snd.hum(false) — otherwise a hum already running in
acts iii+ survives the mute`, exit 1. Revert.

**3. The real thing, in a browser.** Open `index.html`, click once (arms
audio), play or `codex --jump 3` into act iii so the hum starts, then type
`sound off`.

*Invariant:* the 55Hz hum stops audibly (it has a 1.5s fade, per
`hum()`'s ramp-down — not an instant cut).

*Expect:* silence within ~2 seconds of `sound off`. Type `sound on`: the hum
should resume (it fades back in as a fresh oscillator, no ramp on start).
Before this fix, the hum would have kept droning through `sound off`.
