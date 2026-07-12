# what this is

Claude Codex is a little story game that runs in your web browser and pretends
to be an old-style coding terminal. You're a new hire at a made-up company, your
chat partner is called VERA, and over five chapters you type or click commands to
poke around and uncover a story. It's all one self-contained web page — no
install, no server, no internet, and it doesn't touch anything on your Mac. Sound
and visual effects are built in and quiet by default.

# what I fixed

Good news first: the game itself needed no repair. It's built entirely from
standard web pieces that already work the same on the Mac as on Windows — I read
every file and found no Windows-only code, no leftover folder paths from another
machine, and nothing that reaches the internet. The only thing pointing at
Windows was the *way you start it*, so that's what I switched back to the Mac way:

- Added a **`Play Claude Codex.command`** file — the Mac stand-in for the
  Windows `.bat`. Double-click it and it opens the game page sitting right next
  to it in your default browser, wherever the folder lives. Because it hands the
  page to your existing browser (rather than launching a second copy), it's safe
  to click more than once. One catch I couldn't finish from here: making it
  double-clickable needs a permission flip I wasn't allowed to do in this
  background job — the first time, either right-click it and choose **Open**, or
  just use the simpler path below.
- Updated the README so it tells you the Mac way to start (double-click
  `index.html`, or run `open index.html`) instead of the Windows `start` command.
- Left the Windows launcher (`Play Claude Codex.bat`) in place so the game still
  works on both machines — it's simply ignored on the Mac.

The simplest way to play, needing no setup at all, is to **double-click
`index.html`** — it opens straight in your browser.

# how I know it works

I read through all four files (the page and its three scripts) and confirmed the
whole thing is ordinary browser code — the kind that behaves identically on Mac
and Windows. The save feature, the sound, the animations, and the starfield all
use standard browser features that Safari and Chrome on the Mac support, and
every save/sound/settings call is already written to fail quietly rather than
crash if anything's unavailable. I also confirmed the Mac launch command
(`open index.html`) is correct.

What I could **not** do from here is pop open a browser to watch it run — this
was a background porting job with no screen, and I don't open windows on your
desktop uninvited. So the final "yep, it plays" is one click away for you:
double-click `index.html`.

# anything to know

- **To play:** double-click **`index.html`** (or run `open index.html`). The
  terminal should appear and VERA should greet you within a second or two.
- Your first click anywhere turns the (very quiet) sound on — that's normal;
  browsers require one click before they'll play audio. Type `sound off` if you'd
  rather have silence.
- The game saves your progress inside the browser's own private storage, not in
  files on your Mac. In a normal browser this just works; if you ever open it in
  a locked-down or private window, progress may not stick between visits — that's
  a browser setting, not a bug, and it was the same on Windows.
