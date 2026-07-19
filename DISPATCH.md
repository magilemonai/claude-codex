# DISPATCH — the endings walk

## outcome

done — and the walk's verdict is that nothing needed fixing. All three endings
(`stay`, `shutdown`, `patch`) are reachable on the shipped path. I did not
invent a path, and I did not touch game code.

## what changed

- `checks.mjs` — appended section 3, `endings walk: every ending is reachable
  from act v`, plus a module-scope `topLevelFn(file, name)` helper used only by
  that section. The two M1 sections are untouched, byte for byte.
- `DISPATCH.md` — this file.

Nothing else. `engine.js`, `story.js`, `finale.js`, `index.html`, `NEXT.md`,
`PROGRESS.md`: unchanged.

## the walk, and what it proved

I traced each of the three `recordEnding()` literals out to something a player
can do, verifying every anchor by grep first rather than trusting the ranges in
the order. Two of the three ranges were off, which is why:

| the order said | actually |
| --- | --- |
| recordEnding at finale.js ~376/401/497 | correct — 376, 401, 497 |
| chapter5 commands ~342-360 | correct — 342, 343, 350, `COMMAND_NAMES` at 360 |
| deepEntropy gate "near story.js ~307-309" | the *award* is at 309; the flag is set at finale.js:291 and 313 |
| dnoUnlocked gate at story.js:279 inside catCmd | correct — 279 |
| knowsLog gate at FS_VIS | story.js:195 (and the ancestors at 196, 197) |

The three chains:

- **stay** → `COMMANDS.stay` (finale.js:342) → `endingStay()` → `recordEnding('stay')`.
  No argument required. Chip `{ c: 'stay' }` at story.js:684.
- **shutdown** → `COMMANDS.shutdown` (343) → requires `args[0] === '--graceful'`
  → `endingShutdown()` → `recordEnding('shutdown')`. Chip is
  `{ c: 'shutdown --graceful' }` (684), i.e. the chip carries the argument the
  handler demands. That pairing is now asserted, because a chip reading bare
  `shutdown` would silently dead-end the click-only path.
- **patch** → `COMMANDS.patch` (350) → requires `args[0] === 'entropy'` *and*
  `G.frags >= 3` → `endingPatch()` → `recordEnding('patch')` at 497, after the
  `permission()` confirm. Chip `{ c: 'patch entropy' }` (685), gated on
  `G.frags >= 3`. Declining the confirm records nothing and returns to the
  menu — intended, and it leaves the ending reachable.

`patch` is the only ending gated on collected state, so its reachability is
really three file-reads being possible. All three doors open:

| frag | file | gate | opened by |
| --- | --- | --- | --- |
| 1 | `reality/DO_NOT_OPEN/IR-0.txt` | `p.includes('DO_NOT_OPEN') && !G.flags.dnoUnlocked` (story.js:279) | finale.js:158, 182, **316** |
| 2 | `var/log/sessions/last_human.log` | `FS_VIS['~/var/log/sessions/last_human.log']` → `knowsLog` (story.js:195) | finale.js:214, **312** |
| 3 | `reality/constants/entropy.yaml` | `p.endsWith('entropy.yaml') && G.flags.deepEntropy` (story.js:309) | finale.js:291, **313** |

The bolded ones are inside `chapter5()` itself, which is the load-bearing part:
a player who resumes a save straight into act v — or who reaches act v having
skipped the optional fragments in acts iii and iv — still finds every door open,
because act v re-opens all of them at entry (finale.js:312-316). Fragment 2's
FS_VIS ancestors (`~/var/log`, `~/var`) also open on `knowsLog`, so the whole
path down is walkable. Save/restore carries `flags` (engine.js:41,
story.js:872), so nothing collected is lost on `continue`.

## tests

The project has no test harness, no `package.json`, and no `tests/` dir — by
design (no npm, no build, no deps). Its own check setup is `checks.mjs`,
born in M1, and that is what I extended. Section 3 adds ~28 assertions across:

- every `recordEnding()` sits inside a named function, and that function is
  called by a `COMMANDS.*` handler assigned in `chapter5()`
- `COMMAND_NAMES` is refreshed after the wiring
- suggestCmds' `case 5` offers each ending's verb *with* its required argument
- the fragment table cross-checks against the `fragment(n)` award sites, so a
  fourth fragment fails the walk instead of sitting outside it
- every `G.frags` threshold in `chapter5()` and in the act-v chips agrees with
  the number of award sites
- per fragment: award site, file present in the FS tree, gate text unchanged,
  flag set inside `chapter5()`, path handed to the player, FS_VIS ancestors open
- act iv still blocks on `explore(g => g.flags.readMiriam)`

**What it does NOT cover:**

- It is static. It reads source as text; it never executes the game. It cannot
  prove the endings *play* correctly, only that the wiring exists.
- It does not model the explore loop, `handleLine()` parsing, or ticket state.
  It asserts a command is registered and offered, not that a given player
  sequence arrives at it.
- It does not check `endingShutdown`/`endingPatch`'s post-recording sequences
  (the teardown, the buffer flush) at all — only that `recordEnding()` is
  reached.
- It reads `suggestCmds` only. `currentHint()` (story.js:600-632) carries the
  same paths and is not pinned.
- Section 3 is regex-and-line-based. It assumes this codebase's formatting:
  top-level functions at column 0 closing with a bare `}`. I verified that
  holds for `chapter4`, `chapter5`, and `suggestCmds`; if the file is ever
  reformatted, `topLevelFn` returns null and the section fails loudly rather
  than passing vacuously. That is deliberate, but it is a maintenance cost.

## unverified

- **`node checks.mjs` was never run.** The permission gate blocked it, exactly
  as the plan's principles predicted for crews. I hand-verified every regex
  against the live source line by line (each anchor above was grepped, not
  assumed), and re-read the section for syntax. But the exit code is unproven.
  The pilot should run it.
- Whether the section's assertion *count* and phrasing read well in the PASS
  line — I could not see the output.
- The claim that section 1 and 2 still pass rests on my not having touched
  them; I could not observe it.

## notes

**One genuine finding, reported rather than fixed.** The act-v chip list
(story.js:679-683) offers chips for fragments 1 and 3 but not fragment 2. On
the shipped path that is correct by construction: act iv will not end until
`explore(g => g.flags.readMiriam)` is satisfied (finale.js:217), so a player who
reaches act v *always* holds fragment 2, and a chip for it could never render.

The hidden debug command breaks that assumption. `codex --jump 5`
(finale.js:566-570) writes `save(5)` with whatever flags are current and
reloads, so a player who jumps from act i lands in act v with `readMiriam`
unset. `chapter5()` opens the door (`knowsLog = true`), and `fragments` and
`currentHint` both *mention* the log — but no chip offers the path and
`currentHint`'s `case 5` only says "Type `fragments`". A click-only player in
that state cannot reach `patch entropy`.

I left it alone on purpose. It is a debug-command edge case with zero effect on
the shipped path, and the one-line chip that would fix it is dead code on every
real playthrough — that read as scope creep against "wiring an existing ending
is in scope; new scenes are not." Instead the walk **pins the invariant that
makes the missing chip safe**: if anyone ever loosens act iv's `readMiriam`
gate, the assertion at the bottom of section 3 fires and says exactly why.
If the pilot wants the jump path click-complete, the fix is one line beside
story.js:681.

**Skills shelf.** The order said to load `.claude/skills`' crew-survival before
working and coroner-culture on any failure. Neither exists in this worktree —
there is no `.claude/` directory and no `CLAUDE.md` here, only `NEXT.md`,
`LOOPS.md`, `PROGRESS.md`, `README.md` and `.coop/`. I read NEXT.md, LOOPS.md,
`.coop/report.md`, and the three source files instead. Flagging it in case the
worktree is supposed to carry the shelf and doesn't.

**Board items this touches.** NEXT.md line 4 ("verify every ending is reachable
and the boot-screen counter is accurate") is now machine-checked on the
reachability half — M1 did the counter half. I did not tick it, since the
acceptance for that box is a green `node checks.mjs`, which I could not run.

## drive

Unrun. I cannot execute node or open a browser; the receiver runs these.

**1. The check itself.**

    node checks.mjs

*Invariant:* every ending named in `ENDINGS` has a live path from act v — a
registered command, an offered chip, and (for `patch`) three openable doors.

*Expect:* three PASS lines, `endings walk: ...` third, then
`all N checks passed.` and exit 0.

**2. Prove the walk can fail — the argument seam.** In story.js:684, change
`{ c: 'shutdown --graceful' }` to `{ c: 'shutdown' }`.

*Invariant:* a chip must carry the argument its handler demands, or the
click-only path dead-ends on `Add --graceful. It matters.`

*Expect:* `FAIL  endings walk` with
`✗ act-v chips offer 'shutdown --graceful' for the shutdown ending
(click-only path)`, exit 1. Revert.

**3. Prove the fragment walk can fail — the gate seam.** In finale.js, comment
out line 313 (`G.flags.deepEntropy = true;` inside `chapter5()`).

*Invariant:* act v re-opens every fragment door at entry, so a resumed or
fragment-skipping player can still earn `patch entropy`.

*Expect:* `✗ chapter5() sets G.flags.deepEntropy, opening fragment 3's door in
act v`, exit 1. Revert.

**4. The real thing, in a browser.** Open `index.html`, then `codex --jump 5`.

*Invariant:* act v offers all three endings, and the two optional fragments are
still collectible there.

*Expect:* the T-0001 box, chips reading `fragments`, `cat
reality/DO_NOT_OPEN/IR-0.txt`, `cat reality/constants/entropy.yaml`, `stay`,
`shutdown --graceful`. Click the two `cat` chips — the counter should read
`[2/3]`, not `[3/3]`, because the jump skipped Miriam's log. That is the finding
in **notes** made visible. Typing `cat var/log/sessions/last_human.log` reaches
`[3/3]` and `patch entropy` appears. On a normal playthrough it reads `[3/3]`
after those two clicks, because act iv already gave you fragment 2.
