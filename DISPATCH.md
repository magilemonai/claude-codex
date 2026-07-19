# DISPATCH — M7, THE MERCY RULING

## outcome
done

The M4 crew's finding is closed. Acts II and III no longer re-queue a ticket
the player already answered, and a refusal counts once no matter how many
times the act replays around it. No save-schema change: the payload keys in
`save()` are byte-identical, and the two new flags ride inside the flag bag
that `save()` already writes whole.

I could not run `node checks.mjs` — same permission gate every crew since M2
has hit. See `## unverified` for the hand-verification I did instead.

## what changed

- `story.js`
  - **new, lines 21–50** — `TICKET_DECISION` (one row per answerable ticket,
    keyed on flags that persist), `ticketDecided(id, f)`, `mercyFromFlags(f)`.
  - **`C.ticket` (~:397)** — an id typed from memory that is decided-but-absent
    now gets VERA's existing "That one's closed" line instead of `no such
    ticket`. Reuses the line already two rows below it; no new copy.
  - **`suggestCmds()` case 2 (~:692)** — the "read your own file" chip was
    keyed on the T-2107 queue entry existing. Now keyed on its decision.
  - **`chapter2()` (~:1190)** — the resume guard also asks `ticketDecided('T-1310')`.
  - **`chapter2()` (~:1218)** — the 25s `setTimeout` also asks `ticketDecided('T-2107')`.
  - **`chapter2()` (~:1241)** — the T-2107 refusal sets `sparedQNS` first, then
    `G.mercy = mercyFromFlags()`. The in-place raise is gone.
  - **`chapter2()` (~:1250)** — the T-2107 gate reads the decision instead of
    `g.closed` / the queue entry's status.
- `finale.js`
  - **`chapter3()` (:24–44)** — both SUNSET re-adds sit behind their own
    decision; each `⚠ new ticket` banner moved inside its guard; the warn cue
    and VERA's `ticket t-3002` pointer now follow the same state (three
    branches: both open, one open, neither).
  - **`chapter3()` (:62–63, :97–98)** — both refusals set a flag
    (`starsKept`, `dreamsKept`) and then recompute the count. These two
    branches setting no flag at all is the exact reason M4 stopped.
  - **`chapter3()` (:106)** — the SUNSET gate reads both decisions.
- `checks.mjs`
  - **section 8 appended** (above the append marker) —
    `ticket idempotence: decided tickets do not re-queue or re-count on resume`.
  - **section 5's prose block (~:481)** corrected: it described the hazard as
    live and deliberately unpinned, which was true when it shipped and is not
    now. Its assertions are untouched — only the paragraph, and it still
    carries the history of why the gap sat there.
- `DISPATCH.md` — this file.

Nothing else. No save-schema change, no dependency change, no `README.md`
edit, no `NEXT.md` edit (see `## notes` on line 7 of that board).

## tests

`checks.mjs` section 8, appended per the file's APPEND-SERIAL rule. Node
builtins only, compile-never-execute. Four seams:

- **A — the table is real.** Parses `TICKET_DECISION` statically. Every flag a
  row reads must be set by some branch (`G.flags.<name> = true`) in the three
  scripts; every id a row names must be added somewhere. A row naming a flag
  nothing writes is a ticket that can never be decided, which behaves as
  "always re-queue" while every other assertion still passes. Also asserts
  `ticketDecided()` answers out of the table rather than keeping a second copy.
- **B — every re-add is guarded by *its own* decision.** For each
  `addTicket(...)` inside `chapter2()` and `chapter3()`, the nearest enclosing
  `if` must name that same id. "Its own" is load-bearing: guarding T-3044 on
  T-3002's flag would satisfy a laxer rule and still re-queue half the act.
  Non-vacuity: at least 4 sites (there are exactly 4).
- **C — no gate in those acts waits on the queue.** No `explore()` predicate in
  either body may mention `g.tickets`, `g.closed`, or `ticketOpen(`. This is
  the assertion section 5 said it could not write, and it is the one that
  catches the deadlock: once the re-adds are guarded, a queue-keyed gate can
  never pass on resume and the act silently stops there. Plus: at least two
  gates ask the decision (one per act).
- **D — the count is derived, never nudged.** Zero in-place raises of the
  refusal count in all three scripts. Every write to it goes through
  `mercyFromFlags()`. The nearest non-blank, non-comment line above each write
  must set a flag that `mercyFromFlags()` actually reads — ordering is
  load-bearing, since the recompute reads the flags, and setting the flag after
  would silently drop that refusal. Every flag the count reads must also appear
  in the decision table, so a refusal that counts but does not decide cannot
  drift back in.

**What it does NOT cover.**

- It never executes anything. It proves shape, not behavior: no `localStorage`
  round-trip, no resume simulated, no act replayed. **The invariant "resume
  twice and mercy is still 1" is not tested anywhere** — see `## drive` step 4,
  which is the only place it gets proven.
- It does not check `currentHint()` or `suggestCmds()` for dead click paths on
  a resumed act. I traced both by hand (below) and fixed the one break, but a
  future ticket guard could reopen that hole without failing a check.
- It does not cover act I or act V, deliberately. `chapter1()` has two
  queue-keyed gates (story.js:1133, :1165) that seam C would flag — they are
  correct, because act I is not resumable at all: `bootSequence()` only offers
  `continue` when `sv.ch > 1`, so `chapter1()` never runs against a restored
  flag bag. Act V's `T-0001` re-add is unconditional and harmless: the queue is
  empty on every act-V resume, so it adds exactly one and carries no count.
- It does not pin VERA's three-branch pointer in `chapter3()`. That is
  narration, and pinning dialogue makes the file brittle for no invariant.
- Seam B's guard scan is line-based (nearest preceding line containing `if (`).
  A guard written as a multi-line condition with the `if` on its own line still
  passes; a guard expressed some other way (a ternary, an early return) would
  fail even if correct. That is deliberate — it pins one shape.

## unverified

- **`node checks.mjs` was never run.** The non-interactive permission layer
  blocked `node --check` and `node checks.mjs`, as it did for M2/M3/M4/M5/M6.
  Exit code, PASS/FAIL text, and the new total are unproven. Everything below
  is hand-verification against the exact bytes.
  - `topLevelFn` termination: `chapter2` opens story.js:1184 and closes at the
    column-0 `}` on :1283, with no column-0 `}` between. `chapter3` opens
    finale.js:9, closes :190. `ticketDecided` :38–41, `mercyFromFlags` :47–50.
  - the table regex terminates on story.js:37's column-0 `};` — the only one in
    range. Row parse strips each `//` comment first, then
    `'(id)': f => (expr),` with `\s*$`; all four rows yield an id and an expr.
  - seam B finds exactly 4 add sites: story.js:1191 (nearest `if` :1190),
    story.js:1219 (:1218), finale.js:29 (:28), finale.js:33 (:32). The three
    comment lines above :1187 contain no `if (` — I reworded finale.js:25 from
    "only if its outcome" to "only when" for the same reason.
  - seam C sees 5 gates in `chapter2` (all single-line) and 6 in `chapter3`;
    the greedy `(.*)\);` capture terminates on each line's final `);`, including
    the two that end `));`. None of the 11 mention the queue.
  - seam D: `\bG\.mercy\s*=[^=]` matches exactly 3 lines (story.js:1242,
    finale.js:63, :98) and rejects `>= 2`, `=== 1`, `> 0`, `mercy: G.mercy,`
    and `m.lastMercy = G.mercy;`. `refusals` parses to
    `sparedQNS, starsKept, dreamsKept`; each has a setter and a table row.
  - **no existing section is poisoned.** I checked every whole-file first-match
    search against story.js (`if (meta.endings`, `C.sound = async`, the
    `POST_LINES` and `FS_VIS` regexes, `fragment(N)`) and finale.js (the
    `recordEnding` line-walk, which tracks column-0 braces — I added none). My
    edits add no `createOscillator`, no unload handler, no `location.reload()`,
    and touch `index.html` not at all. Nothing pins a story literal I changed.
- **Byte-for-byte pins.** No exact-string assertion in `checks.mjs` covers any
  string I altered — I grepped for the ticket ids, the banner text, VERA's
  SUNSET pointer, and `snd.warn`. Section 5's seam A pins `handleLine`'s tail
  statements, and I did not touch `engine.js` at all.
- **An in-flight save from the current build degrades.** A save written by HEAD
  where the player refused a SUNSET ticket carries `mercy` but no `starsKept` /
  `dreamsKept` (those flags did not exist), so on resume that ticket reads as
  undecided, re-queues once, and the recompute lands lower than the stored
  count. This only affects a save file created between M4 and this commit —
  there is no released version — and the game self-heals on the next decision.
  I did not add a migration: that is save-schema work the order fenced off, and
  clamping with a `max()` would preserve exactly the inflated counts this fix
  exists to remove. Worth a human's call.
- `G.closed` is now write-only. It was read in exactly one place (the old act-II
  gate) and nothing reads it now. It is still pushed to by `closeTicket()`. I
  left it — removing it is a refactor, and it is the natural place for a future
  ticket-history feature. `closeTicket('T-1310', 'wontfix')` in a resumed act II
  now pushes an id with no matching queue entry; harmless, the function already
  guards on finding one.
- `const t0` at story.js:1249 is unused. It was already unused before this
  change (the gate it sat above never referenced it) — I left it rather than
  widen scope, but it now sits directly above a line I rewrote and will look
  like mine.

## notes

- No `.claude/` directory and no project `CLAUDE.md` in this worktree — fourth
  crew in a row. `crew-survival` is not in the global registry either (`Skill`
  returned `Unknown skill: crew-survival`). I read `NEXT.md`, `LOOPS.md`,
  `README.md`, `.coop/report.md`, and M4's `DISPATCH.md` out of git history,
  which was the actual map for this order. Nothing died or flaked, so
  `coroner-culture` never triggered.
- **Why the gates changed too, when the order named the add-sites.** Guarding
  the re-adds alone would have deadlocked act II. Its T-2107 gate read
  `g.closed` and the queue entry's status — with the re-add correctly
  suppressed, neither is ever true on resume and the act stops forever at that
  `explore()`. The order's headline says "ticket gates idempotent," so this is
  on-order, but it is worth naming as the thing a half-fix would have shipped.
- **The one narration touch, and why.** VERA's `ticket t-3002` line in
  `chapter3()` became a pointer at a ticket that is no longer in the queue —
  a dead hint, which `LOOPS.md` line 1 calls out as the thing that should fail
  loudly. I split it three ways on live ticket state rather than leave her
  sending a resumed player after nothing. Same reasoning for moving the two
  banners inside their guards. I did not touch act II's "when something with
  fur shows up" line — it is a future-tense promise, not a command pointer.
- `NEXT.md` line 7, "confirm progress-save survives a mid-act tab close on each
  act", is closer to closed than M4 left it: acts II and III now resume without
  redoing or miscounting. Act I still cannot resume at all (`bootSequence` only
  offers `continue` when `sv.ch > 1`, and a mid-act-1 save leaves the flag bag
  unrestored). I did not check the line off — that is the pilot's call, and the
  act-I half is untouched.
- M4's hand-trace was accurate on every anchor except the line numbers, which
  M5 and M6 shifted by 30–46 lines. Every one re-grepped before editing.

## drive

Unrun. I cannot execute node or open a browser; the receiver runs these.

**1. The check.**

    node checks.mjs

*Invariant:* a decided ticket never re-queues, no gate in acts II/III waits on
state that does not survive a reload, and the refusal count is derived rather
than raised.

*Expect:* eight `PASS` lines, the last being
`PASS  ticket idempotence: decided tickets do not re-queue or re-count on resume`,
then `all N checks passed.`, exit 0. N grows by roughly 60.

**2. Prove seam B can fail.** In `finale.js`, change the T-3044 guard on :32 to
test T-3002's decision instead — `if (!ticketDecided('T-3002')) {` — so both
re-adds hide behind the same flag.

*Invariant:* each re-add is guarded on its own ticket, not a neighbour's.

*Expect:* `FAIL  ticket idempotence` with
`✗ chapter3()'s re-add of T-3044 sits behind a guard on T-3044's own decision
(nearest if: if (!ticketDecided('T-3002')) {)`, exit 1. Restore it.

**3. Prove seam D can fail.** In `finale.js`, swap the two lines at :62–63 so
the count is recomputed before `starsKept` is set.

*Invariant:* the decision is recorded before the count reads the flags.

*Expect:* `FAIL  ticket idempotence` with
`✗ finale.js:62 records its refusal flag on the line above, and the count reads
that flag (found above: } else {)`, exit 1. Restore it.

**4. The real thing — refuse the cat twice, count it once.** This is the
regression M4 reported and the only place it gets proven.

Open `index.html`. `codex --jump 2` into act II. Read `cat
reality/constants/c.yaml`, wait out the 25s for T-2107, open it, and **reject**
the purge. DevTools → Application → Local Storage → `codex_save`: `mercy` is
`1` and `flags.sparedQNS` is `true`. Now close the tab mid-act and reopen
`index.html`; type `continue`.

*Invariant:* work already answered is not re-served, and answering it once
counts once.

*Expect:* VERA replays her act-II narration, but **T-2107 never arrives** — no
warn cue, no `⚠ new ticket` line, and no second permission dialog at the 25s
mark. `tickets` shows an empty queue. `codex_save` still reads `mercy: 1`.
Before this change it re-queued and a second refusal took `mercy` to `2`.

Two click-path details to watch in the same run, both surfaces this change
would otherwise have broken: with guide mode on, the chip
`read your own file` must be offered (it used to be keyed on the T-2107 queue
entry existing, so a click-only player would have had no chip at all), and
typing `ticket t-2107` must get VERA's "That one's closed. It stays closed."
rather than `ticket: no such ticket: T-2107`.

**5. Act III, the same shape.** `codex --jump 3`. Refuse T-3002 (one keypress),
then — without touching T-3044 — close the tab and reopen. `continue`.

*Invariant:* a partially-answered act re-serves only the unanswered half.

*Expect:* exactly **one** `⚠ new ticket` banner, for T-3044. No banner and no
warn cue for T-3002. VERA says "You already did one with your own hands … The
other one is still open. `ticket t-3044`." (not the first-time line pointing at
t-3002). `tickets` lists T-3044 alone. Refuse T-3044: `codex_save` goes to
`mercy: 2` — one per refusal, and `flags.starsKept` and `flags.dreamsKept` are
both `true`.

Then resume act III once more. Neither ticket returns, VERA says "I'm not
asking you to do them twice," and `mercy` holds at `2`.

**6. Confirm a fresh run is unchanged.** `restart` at the boot prompt and play
act III straight through without closing the tab.

*Invariant:* the guards are invisible on the path that never resumes.

*Expect:* both banners, the warn cue, VERA's original `ticket t-3002` line,
both tickets in the queue — identical to before this change.
