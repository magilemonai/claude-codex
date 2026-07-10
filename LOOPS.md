# LOOPS

<!-- recursive self-improvement loops — scouted by magi lemon command, 2026-07-09 -->

- Chip autoplay: suggestCmds()/currentHint() are a machine walkthrough — replay chips into handleLine() so dead hints and unreachable endings fail loudly. first step: harness stubs sleep()+DOM, drives chapter1() to act1done.
- VERA miss log: veraFallback() drops unmatched player lines into a generic bank; log them to codex_meta, turn recurring phrasings into new has() branches. first step: add `codex --dump` next to the existing --jump debug.
- New-game-plus meta: recordEnding() saves bestFrags/lastMercy but bestFrags is never read; feed prior runs into the boot motd and VERA's act-1 lines. first step: read meta.bestFrags at boot to nudge unfound fragments.
