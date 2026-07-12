#!/bin/bash
# ============================================================
#  CLAUDE CODEX — one-click launcher (macOS)
#  Double-click this file to open the game in your browser.
#  It just opens the local web page next to it — no install,
#  no server, no network. Same game, same look and sound.
#
#  Safe to click more than once: `open` hands the page to your
#  existing browser and brings it to the front — it does not
#  launch a second copy of the browser.
# ============================================================
cd "$(dirname "$0")" || exit 1
open "index.html"
