# DISPATCH — the POST itself

## outcome

done

## what changed

- `story.js` — added `const POST_LINES` (story.js:840) and `async function
  meridianPOST()` (story.js:850), and one call site: `await meridianPOST();`
  inside `bootSequence()` (story.js:903), sitting between the opening blank
  line and the `const art = [...]` block.
- `checks.mjs` — appended section 6, `boot POST: skippable,
  reduced-motion-safe, snd-only` (checks.mjs:592-731), above the
  `next mission appends its section() above this line` marker.
- `DISPATCH.md` — this file.

Not touched: `index.html`, `engine.js`, `finale.js`, `NEXT.md`, `LOOPS.md`,
`README.md`. No new files besides this one. No dependencies, no build step,
no npm — `checks.mjs` still imports only `node:fs` and `node:vm`.

## what it does

Seven typed system-log lines land before the CODEX art:

```
MERIDIAN POST v5.1 — power-on self test
  motd: the queue survived the weekend. it always does.
  memory ............ ok
  net ............... ok — localhost only, as promised
  mounting reality/ . ok — legacy naming convention, nobody has renamed it
  handshake: VERA ... online
  self-test complete — 0 errors
```

Three design calls worth flagging to the receiver:

1. **The skip is latched locally, not by leaning on `skipTyping` alone.**
   `skipTyping` is set by engine.js's global keydown and cleared 30ms later
   (engine.js:298-300) — long enough to fast-forward one narration line,
   far too short to carry across seven POST lines. And the engine's global
   **click** handler (engine.js:306-310) does *not* bump either signal, so a
   click would never have skipped anything. So `meridianPOST()` registers its
   own capture-phase `keydown`/`click` listeners for the duration of the run,
   latches `cutRequested`, and its `skip()` predicate ORs that with
   `skipTyping` and `skipRequested !== mark`. The listeners come off in a
   `finally`.

   The alternative was adding `skipTyping = true; skipRequested++` to
   engine.js's global click handler. That would have made *all* narration
   click-skippable — a real behavior change well outside this order, and one
   that would interact with `chipRun`. I left it alone. **If you want
   click-to-skip globally, that is its own mission**, and it would let the
   POST drop its local listeners entirely.

2. **No new lore.** `mounting reality/` reuses the workspace name already in
   `statusLine()` (story.js:825); `motd:` matches the existing post-login motd
   convention (story.js:893-898) but is system-flavored rather than
   personalized, so it does not duplicate or pre-empt it. I deliberately did
   **not** put `entropy budget` in the POST — that line is the `G.patched`
   easter egg (story.js:858) and printing it unconditionally would spoil it.

3. **Cues are `snd.tick()` per typed line and one `snd.pop()` at the end.**
   When the player skips, the remaining lines `continue` before the tick, so a
   skip does not fire six oscillators in the same event-loop turn.

## tests

The project's own harness is `checks.mjs` (plain node, no deps, run as
`node checks.mjs`; 0 = green, 1 = failure). There is no `tests/` dir, no
`package.json`, and no runner named in the README — `checks.mjs` is it.
I extended it rather than inventing anything.

Section 6 adds 33 assertions in five groups (counted by hand from the
`assert(` call sites, loops expanded — I could not run the harness to have
it print the number):

- **A** — `bootSequence()` *awaits* `meridianPOST()`, and its index is before
  the `'title-art'` print. Also pins the three beats the order named
  (`motd:`, `VERA`, `mounting reality/`) as content inside `POST_LINES`.
- **B** — the skip check is anchored to the **per-character `for` loop body**,
  brace-balanced out of the function, not merely "somewhere in the function":
  a check outside the loop would still let a keypress wait out the current
  line, and would pass a looser assertion. Also pins that the skip branch
  fills the line *and* breaks, that `skip()` reads both `skipTyping` and
  `skipRequested`, and that both listeners are added and removed.
- **C** — a `matchMedia('(prefers-reduced-motion: reduce)')` call exists; the
  `if (reduced)` block prints every `POST_LINES` entry, contains **no
  `sleep(`**, and returns. "Instantly" is the assertion, not "differently".
- **D** — POST-local no-bare-oscillator: `meridianPOST()` makes at least one
  `snd.*` call and mentions none of `createOscillator` / `AudioContext` /
  `createGain`.
- **E** — `index.html` references neither new symbol.

On the third assertion the order asked for ("no createOscillator outside
snd"): **section 4 already owns the global form of that rule**
(checks.mjs:381-390 — every `createOscillator` inside engine.js's `snd` IIFE,
and neither story.js nor finale.js mentioning it at all). Re-asserting it
verbatim would have been decoration. Group D is the POST-scoped form — the
seam a regression in *this* feature would actually disturb. Both stay green
with this change; story.js gained no oscillator reference.

**What the tests do NOT cover.** All of it is static text-reading, so:

- Nothing proves the POST *renders*. No assertion opens a browser, so
  "the lines appear, in order, and look right" is unverified by machine.
- Nothing proves a keypress or click *actually* cuts it short at runtime.
  The assertions prove the guard is present and correctly placed in the
  loop; they cannot prove the listener fires.
- Nothing exercises the reduced-motion branch under a real
  `prefers-reduced-motion: reduce` setting — only that the branch exists,
  prints everything, and has no sleep.
- Timing is unpinned on purpose. `sleep(4)` per char and `sleep(70)` per line
  are taste, not contract; an assertion on those numbers would fail on every
  future tuning pass without catching a real defect.
- No assertion pins that the POST plays on *every* boot rather than only the
  first. That is deliberate — the next mission makes it first-boot-only, and a
  check written now would fail on that mission by design.

## unverified

- **`node checks.mjs` was never run.** I am fenced from executing node in this
  worktree — same non-interactive permission gate the previous crew hit
  (`PROGRESS.md`, `## unverified`). Both `node checks.mjs` and a plain
  `node --check` were denied. Section 6 is hand-traced against the code I
  wrote, regex by regex, but a human should run it.
- Whether the ~1.9s POST (before skip) feels right ahead of the existing
  ~1.4s art-and-boot-list. Boot is now ~3.3s to the login prompt if the
  player sits still. It may want trimming; I sized it to be read, not waited
  through.
- Rendering of the leading two-space indents. `.line` is `white-space:
  pre-wrap` (index.html:133) and the existing boot list already relies on
  this, so it should be fine, but I could not look at it.
- The em-dashes and `·`-free box-drawing in POST_LINES render in the game's
  font — again, consistent with existing lines, but unobserved.

## drive

**Unrun.** I cannot open a browser; the receiver can. `open index.html`.

1. **The POST runs, and runs first.**
   Invariant: it is a *power-on* self test, so it precedes the banner.
   Observe: the seven POST lines type in *above* the CODEX ASCII art, and
   the art only starts after `self-test complete — 0 errors`.

2. **Any key completes it instantly.**
   Invariant: the POST never gates the player.
   Observe: reload, then hit a key one or two lines in. Every remaining line
   snaps to full text at once and the art follows immediately. Nothing
   half-typed is left behind — the interrupted line shows its *whole* text,
   not a truncated one.

3. **Any click does the same.**
   Invariant: the click-only path (NEXT.md's non-coder playtest) is equal to
   the keyboard path. This is the one most worth driving, because the
   engine's global click handler does not bump `skipRequested` — if my local
   listener is wrong, clicking will do *nothing* and the POST will play out
   in full. Observe: reload, click anywhere mid-POST, same instant fill.

4. **Reduced motion prints it all at once.**
   Invariant: a motion preference means no typing animation, not a slower one.
   macOS: System Settings → Accessibility → Display → **Reduce motion** on,
   then reload. Observe: all seven lines appear in a single frame, with no
   per-character typing and no pause between lines. The art after it still
   animates (that pre-existed this mission and was not in scope).

5. **`sound off` still means silence, through the POST.**
   Invariant: the mute gate holds on the new cues.
   Observe: play far enough to type `sound off`, then reload. The POST's
   per-line ticks and closing pop make no sound. (Note: on a *cold* load the
   POST is silent regardless — `snd`'s AudioContext is not armed until the
   first gesture, and engine.js only calls `snd.gesture()` from keydown, not
   click. That predates this change; the POST just inherits it.)

## notes

- The order said to load `.claude/skills`' **crew-survival** before working.
  There is no `.claude/` directory in this worktree, and `Skill: crew-survival`
  resolved to "Unknown skill". Listing the main repo at
  `/Users/cody/Desktop/Games/ClaudeCodex/` was denied by the permission gate,
  so I could not read the skills shelf or a project `CLAUDE.md` either (none
  exists in the worktree). I read `NEXT.md`, `LOOPS.md`, `README.md`,
  `.coop/report.md`, and the relevant source instead, and worked to the order
  as written. **Worth checking whether the shelf is meant to be present in
  dispatch worktrees** — every crew on this branch line hits the same wall.
- Append-serial respected: section 6 went in at the bottom, above the marker,
  and no existing section was edited. The M1→M4 chain is intact.
- Scope held. No refactors, no dependency changes, no story content, no
  `index.html`. `NEXT.md` line 6 ("audit that all synthesized sound cues honor
  `sound off`") is adjacent to group D but is a different mission's box to
  check, so I left it unticked.
- No `scratch-*` files were created.
