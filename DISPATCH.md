## outcome

done

The reverse (Windows → macOS) port. The craft runs natively on this Mac with
zero setup — double-click `index.html` or run `open index.html`, and that's also
what the tool's `.coop/launch.json` uses, so nothing on the native-run path
depends on anything I couldn't do from here. One convenience item (making the new
`.command` launcher double-clickable) needs a one-time permission flip I was
blocked from setting — see `## unverified`.

## what changed

The prior dispatch ported this craft mac → Windows and, correctly, left the game
logic byte-for-byte untouched — it is 100% cross-platform browser JavaScript. I
re-confirmed that (read-only SCAN): no network, no filesystem access outside the
folder (only browser `localStorage`), no hardcoded paths, no `require`/`import`/
`process`, no `.claude` hooks/statusline, no self-starting background jobs. Sound
is the standard Web Audio API; the starfield is `requestAnimationFrame`. So the
entire fix surface was the Windows-flavored launch layer, reversed to macOS:

- **`Play Claude Codex.command`** (new) — Mac double-click launcher. Does
  `cd "$(dirname "$0")"` then `open "index.html"`, so it opens the page next to
  it regardless of the working directory (the Mac parallel to the `.bat`'s
  `%~dp0`). Uses plain `open` (no `-n`), which hands the page to the *existing*
  browser and brings it to the front rather than launching a second browser
  instance — so it's single-window and safe to double-click repeatedly.
- **`README.md`** — the "## Play" section restored to the Mac idiom: lead with
  double-clicking `index.html` (zero setup) and `open index.html`, plus the new
  `.command`. Kept a one-line pointer that `Play Claude Codex.bat` is the Windows
  equivalent. Rest of the README untouched.
- **`Play Claude Codex.bat`** — left in place (harmless/ignored on Mac) so the
  craft still launches on both brothers' machines as it bounces between them.
- **`.coop/safety.json`** — re-verdicted `clear` for macOS (written first, before
  any edit — the trust gate). Wording updated PC → Mac.
- **`.coop/launch.json`** — command changed from `["cmd","/c","start","",
  "index.html"]` to `["open","index.html"]`; `cwd` `.`, `url` null (it's a
  `file://` page, no server), `wait_ms` 3000.
- **`.coop/report.md`** — rewritten in plain English for the Mac owner.

RETARGET: nothing to retarget. Every "meridian / VERA / reality / prod" string is
the game's own fiction, not a real name or folder path. No `/Users/...`, no
`C:\...`, no path points at either brother's machine. Player name defaults to
`operator` and is asked in-game.

Game logic (`engine.js`, `story.js`, `finale.js`, `index.html`) left byte-for-byte
untouched. The font stack `ui-monospace, SFMono-Regular, Menlo, Consolas,
monospace` renders natively on the Mac (SF Mono / Menlo) with no change.

## tests

None added — and none applicable. This project has **no test harness**: no
`tests/` dir, no `package.json`, no test script, no runner named in the README.
(LOOPS.md floats a *hypothetical* future harness that "stubs sleep()+DOM and
drives chapter1()", but it does not exist in the repo.) My changes are
non-behavioral — a launcher, docs, and Co-op metadata — and touch none of the
game's output-producing code, so there is no game-logic behavior to pin and no
byte-for-byte output assertion to break (there are none in the repo).

## unverified

- **The `.command`'s executable bit.** A macOS `.command` must be `+x` to be
  double-clickable; double-clicking a non-exec one opens it as text. I could not
  set it: `chmod` and `git update-index --chmod=+x` both require an approval that
  can't be granted in this non-interactive worktree, so the committed file is
  mode `100644`. To enable double-click, run once:
  `chmod +x "Play Claude Codex.command"` (or right-click it → **Open** the first
  time). This does **not** block play — double-clicking `index.html` and
  `open index.html` (what launch.json uses) need no exec bit and work as-is.
- **Live launch.** I could not open a browser to watch the game run: headless
  background worktree, and the standing rule is to never pop a browser window
  onto the desktop uninvited. Do the one observable check in `## drive`.
- **JSON parse of the two `.coop` files.** `node`/`python3` were gated by the
  permission mode, so I could not machine-validate `launch.json`/`safety.json`. I
  hand-authored both carefully (no trailing commas, properly quoted); a
  `node -e "require('./.coop/launch.json')"` will confirm if desired.
- **`.command` syntax.** `bash -n "Play Claude Codex.command"` was gated too. It's
  a two-line script (`cd` + `open`); trivially correct but unrun here.
- I could not read `share/CRAFT-EXCHANGE-FIELD-CONTEXT.md` (§A/§C/§E/§F): it lives
  outside this session's permission scope (the parent `.magi-dispatch` dir is
  denied). I worked from the two field-tested prompts quoted verbatim in the
  dispatch order plus direct inspection of the project.

## notes

- SCAN verdict: **clear**. Read-only pass (Read/Glob/Grep only) before any edit or
  run power, and `.coop/safety.json` was written *before* the first edit (BRIEFING
  = the trust gate). The "fetch / upstream / remote" strings are in-game git
  fiction; the README's GitHub Pages URL is never contacted by the game. Only disk
  I/O is `localStorage`, all wrapped in try/catch.
- No dependencies to install (no npm/pip) — a static page with three local
  scripts.
- Pipeline order held: SCAN (read-only) → BRIEFING (safety.json) → ADAPT
  (launcher, README, launch.json, report) → DEBRIEF. Commits are small and staged;
  `git add`/`git commit` only — nothing else touched git.

## drive

Runtime surface: the launcher and the game page.

Unrun steps (the receiver runs; I authored):
1. From the project root, run the launch command `open index.html` — or simply
   double-click `index.html` in Finder. (The `Play Claude Codex.command` launcher
   also works once its exec bit is set — see `## unverified`.)
2. Wait ~2 seconds.

Invariant this names: the game launches natively on macOS with its full experience
intact — terminal UI, VERA's greeting, sound, and animation — with no install, no
server, and no second browser instance stacked on a repeat launch.

Observable to expect: your default browser opens to a dark terminal titled
"CLAUDE CODEX". A boot sequence prints, then VERA greets you ("Morning, …") and an
input line with clickable suggestion chips appears. Your first click/keypress
quietly enables sound (browser autoplay policy). Typing `help` or `tickets`
responds. Launching a second time brings the same browser window to the front
rather than opening a new browser instance.
