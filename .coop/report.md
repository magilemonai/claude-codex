# what this is

Claude Codex is a little story game that runs in your web browser and pretends
to be an old-style coding terminal. You're a new hire at a made-up company, your
chat partner is called VERA, and over five chapters you type or click commands to
poke around and uncover a story. It's all one self-contained web page — no
install, no server, no internet, and it doesn't touch anything on your PC. Sound
and visual effects are built in and quiet by default.

# what I fixed

Good news first: the game itself needed no repair. It's built entirely from
standard web pieces that already work the same on Windows as on the Mac it was
made on — I checked every file and found no Mac-only code, no leftover Mac
folder paths, and nothing that reaches the internet. The only Mac-flavored thing
was the *instructions*, so that's what I adapted:

- Added a **`Play Claude Codex.bat`** file you can double-click to open the game
  in your browser. It's the Windows stand-in for the Mac `open index.html`
  command, and it opens the page sitting right next to it, so it works no matter
  where the folder lives.
- Updated the README so it tells you the Windows way to start (double-click the
  launcher, double-click `index.html`, or run `start index.html`) instead of the
  Mac-only `open index.html`.
- The screen font list mentioned two Mac fonts first; on Windows the browser
  simply skips past them to Consolas (a Windows monospace font), so the terminal
  looks right here with no change needed.

# how I know it works

I read through all four files (the page and its three scripts) and confirmed the
whole thing is ordinary browser code — the kind that behaves identically on
Windows and Mac. The save feature, the sound, the animations, and the starfield
all use standard browser features that Edge and Chrome on Windows support, and
every save/sound/settings call is already written to fail quietly rather than
crash if anything's unavailable. I also confirmed the launch command uses correct
Windows syntax.

What I could **not** do from here is pop open a browser to watch it run — this
was a background porting job with no screen, and I don't open windows on your
desktop uninvited. So the final "yep, it plays" is one click away for you: use
the launcher below.

# anything to know

- **To play:** double-click **`Play Claude Codex.bat`** (or `index.html`). The
  terminal should appear and VERA should greet you within a second or two.
- Your first click anywhere turns the (very quiet) sound on — that's normal;
  browsers require one click before they'll play audio. Type `sound off` if you'd
  rather have silence.
- The game saves your progress inside the browser's own private storage, not in
  files on your PC. In a normal browser this just works; if you ever open it in a
  locked-down or private/incognito window, progress may not stick between visits
  — that's a browser setting, not a bug, and it was the same on the Mac.
