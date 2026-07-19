# DISPATCH — M4, instant saves

## outcome
partial

The ordered change shipped and the checks section is in. The hand-trace the
order asked for came back with a finding that contradicts the acceptance
line's premise: two `explore()` gates do **not** pass instantly on resume,
and one consequence of that is a `G.mercy` miscount that this change
introduces. I did not fix it — see `## the hand-trace` for why, and for the
exact call sites. Calling this partial rather than done because the pilot
should decide on that, not inherit it.

## what changed
- `engine.js` — `handleLine()` (now ~695-717) ends with `tick();` then
  `save(G.chapter);`, plus the comment explaining the ordering.
- `finale.js` — `COMMANDS.codex` (~566-576) gained `await new Promise(() => {})`
  after `location.reload()`, the same idiom `endingStay` and `endingPatch`
  already use.
- `checks.mjs` — appended section 5, `save timing: every command persists,
  no unload handler`, above the append marker.
- `DISPATCH.md` — this file.

Nothing else was touched. No story content, no new flags, no save-schema
change, no `README.md` edit (its line 45, "Progress saves at each act.
Closing the tab is safe.", got *more* true, not less — nothing to correct).

## the hand-trace

Re-entry is: `main()` restores flags, then runs `chapterN()` from the top for
every N ≥ the saved chapter. So each act replays its narration with mid-act
flags already true, and the question for every `explore()` gate is whether it
passes instantly for work the player already did.

**Act I** — not resumable at all, so nothing to trace. `bootSequence`
(story.js:868) only offers `continue` when `sv.ch > 1`. A mid-act-1 save
writes `ch:1`, the next boot skips the prompt, runs login, and leaves
`G.flags` at `{}` — it is never assigned from `sv` on that path. `chapter1()`
then re-runs and `save(1)` writes over the top. Mid-act-1 saves are inert.
Pre-existing boot behavior; my change neither helps nor harms here.

**Act II** — four of five gates pass instantly.

| gate | keyed on | resume |
|---|---|---|
| story.js:1057 | `flags.readC` | ✓ instant |
| story.js:1106 | `ticketOpen('T-2107')` / `G.closed` | ✗ **blocks** |
| story.js:1111 | `flags.readSelf \|\| greppedSelf` | ✓ instant |
| story.js:1114 | `flags.readSelf` | ✓ instant |
| story.js:1123 | `flags.sawConstantsLog` | ✓ instant |

The 1106 gate blocks because `G.tickets` and `G.closed` are the two pieces of
state `save()` has never persisted. On a fresh page `G.tickets` is `[]`, so
`chapter2()`'s guard at 1045 re-adds T-1310, the 25s `setTimeout` at 1073
re-adds T-2107 open, `G.closed` is empty — both halves of the gate are false
and T-2107 replays in full.

**Act III** — same shape, one blocking gate.

| gate | keyed on | resume |
|---|---|---|
| finale.js:90 | `ticketOpen('T-3002')`, `ticketOpen('T-3044')` | ✗ **blocks** |
| finale.js:95 | `flags.sawSunsetLog` | ✓ instant |
| finale.js:103 | `flags.traceDone` | ✓ instant |
| finale.js:129 | `cmdCount >= c0+2 \|\| readNote` | wants 2 commands — by design, it's the breathe-and-snoop beat |
| finale.js:149 | `flags.readNote` | wants a re-read — correct, line 143 forces `readNote = false` at compaction and that `false` is what persists |
| finale.js:161 | `flags.frag1 \|\| cmdCount >= c1+4` | ✓ instant if frag1 held |

`chapter3()` re-adds T-3002 and T-3044 unconditionally at lines 24-25, both
open, so gate 90 always blocks and both SUNSET tickets replay.

**Act IV** — clean. Every gate is flag-keyed and passes instantly:
`sawPs` (197), `readMiriam` (217), `whoamiCascade` (227), `frag3 || cmdCount+4`
(295). No `G.mercy++` anywhere in the act. One non-gate replay worth knowing:
the `I AM STILL HERE` loop (276-281) is a bare `readLine` loop with no flag,
so it always re-runs. It never calls `handleLine`, so no save fires inside it,
and no state doubles — the player just retypes the line.

**Act V** — clean, and it's the model for the fix. `chapter5():319` recomputes
`G.frags` from the three fragment flags instead of trusting the counter, so it
is idempotent under replay by construction. That is exactly what the ticket
gates lack. Gate 371 is `explore(g => false)`; endings run as `COMMANDS`
inside `handleLine`.

**Endings never double-write.** Confirmed all four exits:

- `endingStay` — `save(1)` → `reload()` → forever-await (397). Never returns.
- `endingShutdown` — `wipeSave()` (470) → forever-await (474). This is the one
  that matters most: a tail save after `wipeSave()` would resurrect the save
  file the ending just deleted. The forever-await is what prevents it.
- `endingPatch`, approved — `save(1)` → `reload()` → forever-await (525).
- `endingPatch`, **refused** — `return` at 494. This one *does* fall through to
  the tail, and `save(G.chapter)` fires with `G.chapter === 5`. That is correct
  and wanted: the player declined the flush, they are still in act V, and their
  mercy and flags as of that moment persist. Flagging it because it's the one
  ending function that legitimately returns.

**`codex --jump`** — took the forever-await rather than keeping the double-write.
`location.reload()` schedules a navigation and lets the current task finish, so
`COMMANDS.codex` was returning into the new tail and writing a second time. The
write was genuinely idempotent (`save(n)` sets `G.chapter = n`, so
`save(G.chapter)` re-serializes an identical blob), but two ending paths in the
same file already solve this with one line, and matching them costs less than
documenting a subtlety. checks.mjs seam E now covers all three sites with a
single rule.

### the finding: mercy inflates on replay

The two blocking gates make the player redo a permission dialog whose outcome
was already saved. Three sites increment on refusal:

- `story.js:1097` — T-2107 spared
- `finale.js:48` — T-3002 refused
- `finale.js:82` — T-3044 refused

Before this change, `G.mercy` was only ever persisted at act entry, so a
replay recomputed it from a clean base and the count stayed honest. Now mercy
is persisted mid-act and then incremented again on replay. Resume mid-act-2
after sparing the cat, refuse again: mercy goes 1 → 2. Mid-act-3: up to +2.

`G.mercy >= 2` unlocks extra dialogue in `endingStay` (384) and
`endingShutdown` (435). So the failure is soft — it makes the ending *warmer*,
never blocks anything, never crashes, and nobody farms it because each
repetition costs a full act replay. But it is a regression this change
introduces, and it is real.

**Why I stopped instead of fixing it.** The fix is to make the two gates
flag-derived, the way `chapter5():319` derives `G.frags`. T-2107 already has
both outcome flags (`purgedQNS` / `sparedQNS`), so story.js:1106 could read
those today. finale.js:90 cannot — the SUNSET refusal branches set no flag at
all, only the approve branches do (`starsCut`, `dreamsCut`). So it needs two
new story flags across two story files, or the same two flags used to guard
the three `G.mercy++` sites. Either is more than "add a save call at the tail",
it touches story state the order fenced off, and I can't run a line of it. A
half-fix (guarding only the site that has a flag today) is worse than none — it
makes the invariant look handled while act III still miscounts. So: reported,
with the call sites, for the pilot to order as its own mission.

## tests
Appended `checks.mjs` section 5, `save timing: every command persists, no
unload handler`. Node builtins only, compile-never-execute, five seams:

- **A** — `handleLine`'s last two statements are `tick();` then
  `save(G.chapter);`, in that order. Both directions are load-bearing and both
  are asserted separately.
- **B** — `explore()` still dispatches through `handleLine`, and `handleLine`
  has exactly one call site. Without this, A could pass while nothing on the
  player's path saved at all.
- **C** — `save()`'s payload literal is parsed and asserted to carry `ch`,
  `mercy`, `frags`, `flags`; then every key it writes is asserted to be read
  back as `sv.<key>` in `bootSequence()`. A key dropped from either side is a
  silent half-save.
- **D** — zero `beforeunload` / `onunload` in all three JS files.
- **E** — every `location.reload()` call site is followed by the forever-await
  (endings + `codex --jump` in one rule), with a non-vacuity assert that call
  sites exist.

**What it does NOT cover.** It never executes anything, so it proves shape, not
behavior: no localStorage write is exercised, no resume is simulated, no act is
replayed. It does not pin the replay hazard above — deliberately. An assertion
for that would pass on today's buggy code and fail once someone fixes it, which
is backwards; the section header carries it as prose instead and points here.
It also doesn't cover act I's non-resumability, or the `I AM STILL HERE` loop.

## unverified
- **`node checks.mjs` was never run.** Same gate the M2 and M3 crews hit — the
  non-interactive permission layer blocked both `node checks.mjs` and a
  compound variant. Exit code, PASS/FAIL text, and the new total are unproven.
- I hand-verified every regex against the exact bytes instead, by reading the
  parse targets back after editing:
  - `topLevelFn('engine.js', 'handleLine')` — opens at engine.js:695, closes at
    the column-0 `}` on :717; no column-0 `}` inside.
  - `topLevelFn('engine.js', 'save')` — matches :36 and not `saveMeta` (:55),
    because the pattern requires `save` followed by optional space then `(`.
  - the statement filter drops blank lines and `//` lines, leaving
    `['tick();', 'save(G.chapter);']` as the last two — the `}` closing the
    if/else is retained as a statement and sits third-from-last, which is why
    the tail slice is `-2` and not `-3`.
  - the payload regex `JSON.stringify\(\{([\s\S]*?)\}\)\)` terminates on
    engine.js:42's `    }))`; splitting on `,` yields exactly
    `ch, name, ng, frags, mercy, patched, flags` plus one empty tail that the
    `^\w+$` filter drops.
  - all seven keys appear as `sv.<key>` inside `bootSequence()` (story.js:833,
    835, 836, 868, 874, 875).
  - `beforeunload|onunload` — zero hits across the three files. finale.js's
    `'unloaded'` (446/449/453) contains neither substring.
  - `location.reload()` — three sites (finale.js:396, 524, 570); the next
    non-blank non-comment line after each is the forever-await. The FOREVER
    regex is unanchored at the end on purpose, so the `--jump` site's trailing
    comment on the same line still matches.
- **No other section should have moved.** Section 2 reads story.js (untouched),
  section 3 reads `chapter4`/`chapter5` in finale.js (my edit is inside
  `main()`), section 4 recomputes its `snd` indices from `indexOf` (my
  engine.js edit is 76 lines above the module and shifts nothing it resolves by
  name). No section asserts on the total assertion count, so growing it is safe.
  Worth a human's eye anyway.
- I did not check NEXT.md's "confirm progress-save survives a mid-act tab close
  on each act" — the trace above says act I still can't, and acts II/III resume
  with a miscount. It's closer, not closed.

## notes
No `.claude/` directory and no project `CLAUDE.md` in this worktree — third
crew in a row to find that — so `crew-survival` could not be loaded from a
local skills shelf, and it isn't in the global registry either (`Skill` returned
`Unknown skill: crew-survival`). I read `NEXT.md`, `LOOPS.md`, `README.md`,
`.coop/report.md` and `PROGRESS.md`'s tail instead. Nothing died or flaked this
session, so `coroner-culture` never triggered.

One thing the trace turned up that isn't a bug and is worth keeping: `G.frags`
is recomputed from flags at `chapter5():319` rather than trusted as a counter.
That's the pattern that makes act V replay-safe for free, and it's the shape any
fix to the ticket gates should copy.

## drive
Unrun. I can't execute node or open a browser; the receiver runs these.

**1. The check.**

    node checks.mjs

*Invariant:* the tail save is where the player's path actually goes, the save
payload round-trips through boot, and no reload path returns to write twice.

*Expect:* five `PASS` lines (syntax, endings-counter, endings-walk, sound gate,
save timing), then `all N checks passed.`, exit 0.

**2. Prove section 5 can fail.** Delete the `save(G.chapter);` line at the end
of `handleLine` (engine.js:716).

*Invariant:* the tail save is the only persistence mechanism; there is no
unload-handler fallback to quietly cover for it.

*Expect:* `FAIL  save timing` with
`✗ handleLine's last statement is save(G.chapter) (found: tick();)`, exit 1.
Restore it.

**3. Prove seam E can fail.** Delete the `await new Promise(() => {});` at
finale.js:571 (the `codex --jump` one).

*Expect:* `FAIL  save timing` with
`✗ finale.js:570 awaits forever after location.reload() (found: } else {)`,
exit 1. Restore it.

**4. The real thing — mid-act persistence.** Open `index.html`, play or
`codex --jump 2` into act II. Reach T-2107, **reject** the purge (that sets
`sparedQNS` and bumps mercy). Then, without finishing the act, close the tab.
Reopen `index.html`.

*Invariant:* a decision made mid-act is on disk the instant the command
finishes, not at the next act boundary.

*Expect:* the boot screen offers `continue` for act 2. Before this change, the
save would have read `ch:2` with act-2-entry flags and the refusal would be
gone. To see it directly: DevTools → Application → Local Storage →
`codex_save`. `flags.sparedQNS` should be `true` and `mercy` should be `1`
immediately after the dialog resolves — refresh the storage view after each
command and watch the blob change per command rather than per act.

**5. Watch the hazard, since it's shipped.** Continue that resumed act 2. VERA
replays her act-2 narration; the `readC` gate passes instantly (no re-reading
c.yaml). Then T-2107 arrives again ~25s in, because ticket state isn't in the
save.

*Invariant (currently violated):* work already done should not be redoable in a
way that double-counts.

*Expect:* refusing T-2107 a second time takes `mercy` to `2` in
`codex_save` — one refusal, two counted. That's the finding above, reproduced.
Approving instead leaves `sparedQNS: true` *and* sets `purgedQNS: true`, both
flags true at once, which nothing currently reads in a way that breaks — but
it's the same root cause.
