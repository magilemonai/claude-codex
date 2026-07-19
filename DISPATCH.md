# DISPATCH — THE DOTS AND THE MEMORY (the split's other half)

## outcome

done

## what changed

- `index.html` — added `booting` to the `<body>` class list (markup, not script);
  added two CSS rules under the existing `#titlebar .dot` block
  (`body.booting #titlebar .dot:not(.lit)` → `var(--faint)`, plus a
  `background-color .25s` transition); added
  `body.booting #titlebar .dot { transition: none; }` inside the existing
  `@media (prefers-reduced-motion: reduce)` block.
- `story.js` — added three top-level functions above `meridianPOST()`:
  `lightBootDots(printed, of)`, `bootDotsDone()`, `shortPOST()`.
  `meridianPOST()`'s outer loop now counts printed lines and calls
  `lightBootDots()` (both the typed path and the already-cut `continue` path).
  `bootSequence()` now reads/increments/persists a `boots` counter on
  `codex_meta` before the POST, and branches:
  first boot → `await meridianPOST()`, boots 2–3 → `shortPOST()`, 4+ → neither;
  then `bootDotsDone()` unconditionally. Also corrected the stale
  "runs on every boot for now" line in the POST's header comment.
- `checks.mjs` — appended section 7,
  `boot dots + first-boot memory: unlit at paint, lit at the end, gated by meta`.
  Sections 1–6 are untouched (see **notes**).
- `DISPATCH.md` — this file.

No changes to `engine.js` (`loadMeta`/`saveMeta` were already the right shape and
already global), `finale.js`, `README.md`, `NEXT.md`, or `LOOPS.md`.

## tests

`checks.mjs` is this repo's own harness — plain node, builtins only, compile-never-execute,
append-serial. There is no `tests/` dir, no `package.json`, and the README names no
runner, so section 7 is the matching setup rather than a new one.

Section 7 adds 24 assertions in six groups:

- **A — one boot class, agreed in three places.** The class name is *derived* from
  index.html's `body.<class> … .dot:not(.lit)` rule, then chased into the `<body>`
  tag and into story.js's `classList.remove(...)`. A rename that misses either end
  fails. Also asserts no script ever *adds* the class — that's the first-paint
  guarantee, and adding it from JS would silently void it.
- **B — the palette is untouched.** Each of `#b4544e` / `#b99b4e` / `#5f9e5f`
  appears exactly once; the unlit rule uses `var(--faint)` and contains no hex.
  This is the assertion that would have caught the obvious wrong implementation
  (restating the three colors under a `.lit` selector).
- **C — order and reduced motion.** Dots are still `r,y,g` in DOM order (that's
  where the sequence lives, since `lightBootDots()` lights by index), and the
  existing prefers-reduced-motion block covers the boot class.
- **D — the dots light during the POST and finish after it.** `lightBootDots()`
  reads its count from the DOM, only ever adds `lit`, never removes; `bootDotsDone()`
  lights all and clears the class; `meridianPOST()` actually calls the sequencer
  (without this, all three would pop at once and the sequence is decoration).
- **E — the meta gate is read before the POST.** Everything is derived off
  `bootSequence()`'s source *sliced above* the `meridianPOST(` call site, so the
  second `loadMeta()` further down (the endings counter) cannot satisfy it. Pins
  that the field is read and written under one name, persisted with `saveMeta()`,
  and that the whole path goes through engine.js's wrappers rather than raw
  `localStorage`.
- **F — the gate actually shortens and skips.** The failure this exists for: a
  counter read, incremented, saved, then ignored would pass all of E. So it pins
  that the `meridianPOST()` call sits behind an `if` testing *that same local*, that
  an `else if` on the same local runs `shortPOST()`, and that `shortPOST()` derives
  its two lines from `POST_LINES`, awaits nothing, and cues through `snd.*`.

**What section 7 does NOT cover:**

- Anything rendered. Every assertion is static text analysis of the source. It
  cannot see a dot change color, cannot prove CSS specificity actually resolves
  the way I reasoned it does, and cannot prove the transition is visible.
- The *spacing* of the dot sequence. It pins that `lightBootDots()` is called from
  the POST, not that `Math.round(printed * 3 / 7)` produces a pleasing r-at-line-2,
  y-at-4, g-at-6 rhythm. That's a taste call for a human.
- The thresholds `0` / `< 3`. It pins that a full branch and a short branch exist
  off the counter; it does not pin "three boots" as the number. Deliberate — the
  number is a feel decision, and pinning it would make tuning it a test edit.
- localStorage behaving. A private window where `setItem` throws means the counter
  never advances and every boot is a first boot — the full POST plays every time.
  That degrades gracefully (you get the show, not a crash) and matches how the rest
  of the game already treats storage, but no check can see it.
- Sound. Section 4 owns the global `sound off` rule; section 7 only pins that
  `shortPOST()`'s cue goes through `snd.*` so it inherits that guard.

## unverified

I could not run anything. `node checks.mjs` was not executed (crews are fenced from
node here, per the standing note in PROGRESS.md), and I could not open a browser.
Specifically worth a human's eyes:

1. **`node checks.mjs` exits 0.** I hand-traced every new regex against the actual
   file bytes, including the two that nearly bit me: `writeField` had to skip
   `bootMeta.boots || 0` before matching `bootMeta.boots =`, and the
   "guard tests the counter" assertion originally did a substring test that would
   have failed on `boots` vs `priorBoots` (fixed to an identifier-identity check).
   Hand-tracing is not running it.
2. **Sections 1–6 still pass.** My change touches `meridianPOST()`'s outer loop and
   `bootSequence()`'s POST call site, both of which section 6 pins. I traced each
   section-6 assertion against the new source and believe all survive — in
   particular `blockAt(post, 'for (let i = 0')` still finds the inner typing loop
   (my counter uses `printed`, my helper loop uses `d`), the reduced-motion branch
   is byte-identical, and `await meridianPOST()` is still argument-free. Confirm.
3. **CSS specificity.** `body.booting #titlebar .dot:not(.lit)` is (1,3,1) against
   `#titlebar .dot.r` at (1,2,0), so unlit should win and a `lit` dot should stop
   matching entirely and fall back to its color. Reasoned, not observed.
4. **First paint.** The claim that no frame shows lit dots rests on the class being
   in the markup. Worth watching once on a cold load.

## drive

Unrun. Open `index.html` in a browser; devtools console for the storage steps.

**Invariant 1 — the dots are unlit at first paint and lit before the banner.**
Clear the memory and cold-load: `localStorage.removeItem('codex_meta')`, then reload.
Observable: at the first painted frame all three titlebar dots are the same dark
grey as the panel border (`--faint`, `#3a3f4a`) — no red, no yellow, no green.
As the POST types, red comes up around log line 2, yellow around line 4, green
around line 6. All three are lit and steady before the `CODEX` ASCII banner draws.
Failure looks like: dots already colored on load, or still grey when the banner lands.

**Invariant 2 — the boot class does not outlive the boot.**
After the banner, in the console: `document.body.classList.contains('booting')`
→ `false`. Should hold on every path below, not just this one.

**Invariant 3 — first boot is the show; later boots are not.**
Reload (2nd boot). Observable: no typing. Two lines appear at once —
`MERIDIAN POST v5.1 — power-on self test` and
`  self-test complete — 0 errors (cached)` — one soft pop, dots snap lit, banner.
Reload again (3rd): same short form. Reload again (4th boot): **no POST at all**,
straight from the blank line to the banner, dots lit. Check the counter with
`JSON.parse(localStorage.codex_meta).boots` — it should read 4 at that point.
Failure looks like: the full typed POST replaying on boot 2, or the short form
never giving way to silence.

**Invariant 4 — never gate the player.**
Clear `codex_meta`, reload, and hit a key (then, separately, click) partway through
the typed POST. Observable: the remaining lines dump instantly and the dots keep
pace with them rather than freezing where the cut happened. All three still end lit.

**Invariant 5 — reduced motion is not a second animation.**
macOS: System Settings → Accessibility → Display → Reduce motion, on. Clear
`codex_meta`, reload. Observable: the whole POST block appears in one frame and the
dots are lit with no visible fade. Nothing to sit through, nothing to skip.

**Invariant 6 — `sound off` still means silence.**
Type `sound off`, then clear `codex_meta` and reload. Observable: the POST's ticks
and the closing pop are silent — including the short form's pop on the reload after
that. (Section 4 owns this rule globally; this just confirms the new `shortPOST()`
cue inherited it.)

## notes

- **Sections 1–6 of `checks.mjs` are untouched**, and that was a design constraint,
  not luck. My first sketch had the meta gate select a *subset* of `POST_LINES`
  inside `meridianPOST()` and pass it around — which would have broken two of
  section 6's pins (`/for (… of POST_LINES) print(/` in the reduced-motion branch,
  and `await meridianPOST()` being argument-free). Rather than amend a prior
  mission's section, I moved the gate up into `bootSequence()` (which the acceptance
  named anyway) and expressed "shorten" as a separate two-line `shortPOST()` that
  reads its text out of `POST_LINES`. The append-serial rule survives intact.
- **No new colors.** Lighting a dot works by *removing* an override, so the CRT
  palette gained nothing. Section 7's "each hex appears exactly once" assertion is
  what holds that line.
- **Why `codex_meta` and not `codex_save`.** A returning player is exactly the one
  whose save may be gone — an ending, `restart`, and `wipeSave()` all clear the save
  and none of them clear meta. Putting the counter in the save file would replay the
  full POST after every ending, which is the opposite of "first boot is the show."
- **Known wrinkle:** the hidden `codex --jump <act>` debug does a `location.reload()`,
  so it advances the boot counter. Harmless, and I left it alone rather than
  special-case a debug path.
- **Skills I was told to load were not reachable from this worktree.** There is no
  `.claude/` directory here (`crew-survival`, `coroner-culture`, and the CLAUDE.md
  skills-shelf are all outside the fence, and reads of the parent repo were denied).
  I worked from `NEXT.md`, `LOOPS.md`, `.coop/report.md`, `.coop/safety.json`,
  `README.md`, and the source. Flagging it so the deck can decide whether crews
  should get the skills dir copied into the worktree.
- Nothing in `NEXT.md` is checked off by this — the open boxes there are playtest
  and QA items that need a human at a browser, which is exactly what the `## drive`
  section above is for.
</content>
</invoke>
