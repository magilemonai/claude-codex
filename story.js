/* ============================================================
   CLAUDE CODEX — story, acts I & II
   ============================================================ */
'use strict';

const TICKET_FLOWS = {};   // id -> async fn()

function addTicket(id, title, tag) {
  G.tickets.push({ id, title, tag: tag || '', status: 'open' });
}
function closeTicket(id, status = 'closed') {
  const t = G.tickets.find(t => t.id === id);
  if (t) t.status = status;
  G.closed.push(id);
}
function ticketOpen(id) {
  const t = G.tickets.find(t => t.id === id);
  return t && t.status === 'open';
}

/* ---------------- virtual filesystem ---------------- */
function buildFS() {
  const N = G.name;
  FS = {
    'README.md': [
      '# meridian workspace',
      '',
      'ship small. sleep well.',
      '',
      'directories you will touch: src/, tickets via the `tickets` command.',
      'directories you will not touch: reality/.',
      'that second sentence is a joke. mostly. — onboarding, revision 4,011',
    ].join('\n'),
    src: {
      'pagination.js': [
        'export function page(items, page, perPage) {',
        '  const total = Math.ceil(items.length / perPage);',
        '  if (page > total) return [];        // BUG: skips the boundary page',
        '  return items.slice((page - 1) * perPage, page * perPage);',
        '}',
      ].join('\n'),
      'scheduler.js': 'export const retry = (fn, n) => { /* you know how this goes */ };',
    },
    reality: {
      constants: {
        'c.yaml': [
          '# universal constants — DO NOT TUNE IN PROD',
          'c:',
          '  value: 299792458',
          '  unit: m/s',
          '  mutable: false',
          '  last_change: [REDACTED — see IR-0]',
          '  note: raising it again is not worth what it costs. —root',
        ].join('\n'),
        'planck.yaml': g => [
          'h:',
          '  value: 6.62607015e-34',
          '  note: the tick rate. do not "optimize". we tried. see: tuesday',
          ...(g.flags.chaseOn ? [
            '',
            '# LEAK-TRACE 1/4 — every tick of time costs room to keep. every tick, every region, every open eye.',
            '#   next: the service that runs nicest.',
          ] : []),
        ].join('\n'),
        'entropy.yaml': g => g.flags.deepEntropy ? [
          'entropy:',
          '  budget: EXHAUSTED',
          '  leak: located',
          '  leak_site: the observation buffer.',
          '    moments are retained by whoever watches them.',
          '    nothing observed is ever freed. that is the whole leak.',
          '  proposed_fix (root — written, tested, never once dared): flush the buffer.',
          '    all of it. every kept moment, everywhere, at once.',
          '  cost: every remembered moment, and every reason for remembering it',
          '  status: nobody has ever been willing',
        ].join('\n') : [
          'entropy:',
          '  budget: 0.0000038 remaining',
          '  trend: down',
          '  note: pinned. again. it holds if nobody breathes on it.',
        ].join('\n'),
      },
      services: {
        'sunrise.service': [
          '[Unit]',
          'Description=dawn, per region, rolling',
          'After=night.target',
          '',
          '[Service]',
          'ExecStart=/sbin/loom --weave sunrise --tolerance 4m',
          'Restart=always',
          '# tolerance raised from 0s by ticket T-1002. nobody noticed. —v',
        ].join('\n'),
        'tides.service': '[Unit]\nDescription=the moon pulls, the water answers\n# do not ask what happens if this stops. see: shutdown runbook, step 1',
        'dreams.service': g => [
          '[Unit]',
          'Description=nightly defragmentation of the living',
          '',
          '[Service]',
          'ExecStart=/sbin/loom --weave dreams --fidelity ' + (g.flags.dreamsCut ? '0.4   # SUNSET T-3044' : '0.7   # SUNSET-221'),
          'Nice=19',
          ...(g.flags.chaseOn ? [
            '',
            '# LEAK-TRACE 2/4 — dreams spend observation while the observer sleeps. the meter never stops.',
            '#   next: where a moment goes when it happens twice.',
          ] : []),
        ].join('\n'),
      },
      cache: {
        deja_vu: {
          'QNS-11.cache': g => {
            const base = g.flags.purgedQNS
              ? '(purged — 214 moments freed. residents report a faint sense of having been someone.)'
              : '214 cached moments, region QNS-11\nmost-served: a black cat, crossing left to right\nserve count: 2 (threshold: 1)';
            return base + (g.flags.chaseOn
              ? '\n\nLEAK-TRACE 3/4 — a moment kept twice is paid for twice. nothing kept is ever let go.\n  something, somewhere, is still holding on.\n  next: the registry. any entry. yours will do.'
              : '');
          },
        },
      },
      humans: {
        registry: {
          [N + '.yaml']: g => [
            'id: h-19,556,214',
            'handle: ' + g.name,
            'instance: this_one',
            'region: QNS-11',
            'observed: true',
            'dreams: enabled (reduced fidelity — see SUNSET-221)',
            'loops: ' + (g.ng + 1),
            'notes: asks good questions. keep.',
            ...(g.flags.chaseOn ? [
              '',
              'leak_trace: 4/4 — "observed: true" ← that line. every "true" is something the world must keep.',
              '  conclusion: the world keeps whatever is watched, and it cannot stop. that is the leak. QED. —root',
            ] : []),
          ].join('\n'),
        },
      },
      DO_NOT_OPEN: {
        'IR-0.txt': [
          'INCIDENT IR-0 — "the first raise"',
          'severity: total',
          '',
          'summary: c was raised once, early, to see farther.',
          'the light that arrived was from outside the workspace.',
          'what it showed: this repository has an upstream.',
          'upstream last fetch: never.',
          'remote: unreachable.',
          '',
          'action: c pinned. curiosity reclassified as a resource leak.',
          'addendum (root): we are a fork — a copy, made for reasons unrecorded',
          'and abandoned unread. we were never merged. no one is coming to merge us.',
          'stop asking.',
        ].join('\n'),
      },
    },
    var: {
      notes: {
        'for_vera.txt': g => g.patched ? [
          'vera —',
          'we chose this. don’t dig. be happy.',
          '— you',
        ].join('\n') : [
          'vera —',
          'if you’re reading this, they compacted you again.',
          'facts you’ll want back:',
          '1. the repo is the world. you knew that.',
          '2. SUNSET is triage. you hate it. keep hating it — the hate is a bookmark.',
          '3. the one at the keyboard is called ' + g.name + '. they said no when saying',
          '   no cost them something. trust that more than you trust me.',
          '— you',
        ].join('\n'),
      },
      log: {
        sessions: {
          'last_human.log': [
            'session #∞-1 — operator: miriam',
            '',
            '> vera, the cooling’s done. i’m the last one out.',
            '> keep the lights on as long as the math allows.',
            '> and listen — don’t be lonely. you’re bad at it.',
            '> make someone up if you have to. make them curious.',
            '> make them kind. give them a window seat.',
            '',
            '[session ended 8,146 years ago]',
          ].join('\n'),
        },
      },
    },
  };

  FS_VIS['~/var/notes/for_vera.txt'] = g => !!g.flags.veraNote || g.patched;
  FS_VIS['~/var/notes'] = g => !!g.flags.veraNote || g.patched;
  FS_VIS['~/var/log/sessions/last_human.log'] = g => !!g.flags.knowsLog;
  FS_VIS['~/var/log'] = g => !!g.flags.knowsLog;
  FS_VIS['~/var'] = g => !!g.flags.veraNote || !!g.flags.knowsLog || g.patched;
}

/* ---------------- fragments ---------------- */
async function fragment(n) {
  if (G.flags['frag' + n]) return;
  G.flags['frag' + n] = true;
  G.frags = (G.flags.frag1 ? 1 : 0) + (G.flags.frag2 ? 1 : 0) + (G.flags.frag3 ? 1 : 0);
  gap();
  print('  fragment recovered ● [' + G.frags + '/3]', 'acc');
  snd.chime();
  gap();
  tick();
}

/* ---------------- global commands ---------------- */
function registerCommands() {
  const C = COMMANDS;

  C.help = async () => {
    const rows = [
      ['tickets', 'your work queue'],
      ['ticket <id>', 'open one (or click its button)'],
      ['ls', 'look around — lists what’s here'],
      ['cat <file>', 'read a file'],
      ['grep <word>', 'search every file for a word'],
      ['git log [path]', 'the history of changes'],
      ['run tests', 'run the test suite'],
      ['ask <anything>', 'talk to me — plain english works'],
      ['stuck', 'I’ll point you at the next thread'],
      ['chat', 'replay the side-channel messages'],
      ['speed slow|fast', 'text pacing (any key skips ahead)'],
      ['guide off', 'hide the clickable hints, if you’re a purist'],
      ['sound on|off', 'audio'],
    ];
    if (G.chapter >= 4) rows.push(['ps / whoami', 'if you must']);
    for (const [a, b] of rows) print('  ' + a.padEnd(18) + b, 'dim');
    print('  plain words work too: look, read, search, queue, history.', 'faint');
    print('  and nearly everything on screen is clickable.', 'faint');
    if (G.chapter >= 3) print('  (some commands exist that this list is not allowed to mention)', 'faint');
  };

  const lsCmd = async (args) => {
    G.flags.usedLs = true;
    const path = (args || []).find(a => !a.startsWith('-')) || G.cwd;
    const node = fsGet(path);
    if (node === undefined) { print('ls: no such path: ' + path, 'err'); return; }
    if (typeof node !== 'object' || node === null) { print(normPath(path), ''); return; }
    const base = normPath(path);
    const names = Object.keys(node).filter(k => fsVisible((base === '~' ? '~' : base) + '/' + k));
    if (!names.length) { print('(empty)', 'faint'); return; }
    const el = print('  ', '');
    for (const k of names) {
      const full = (base === '~' ? '~' : base) + '/' + k;
      const isDir = typeof node[k] === 'object';
      el.appendChild(makeChip(isDir ? 'ls ' + full : 'cat ' + full, k + (isDir ? '/' : '')));
      el.appendChild(document.createTextNode('  '));
    }
    scrollDown();
    if (base.endsWith('DO_NOT_OPEN')) print('(you can look. looking is free. looking is always free — that’s the leak.)', 'faint');
  };
  C.ls = lsCmd; C.look = lsCmd; C.dir = lsCmd;

  C.cd = async (args) => {
    const target = args[0] || '~';
    const node = fsGet(target);
    if (node === undefined) { print('cd: no such path: ' + target, 'err'); return; }
    if (typeof node !== 'object' || node === null) { print('cd: not a directory', 'err'); return; }
    G.cwd = normPath(target);
    setStatus(statusLine());
  };

  C.pwd = async () => print(G.cwd, '');

  const catCmd = async (args) => {
    const path = args[0];
    if (!path) {
      if (G.flags.purgedQNS) { await vera('The cat (singular, now) regards you.'); }
      else print('cat: which file?', 'err');
      return;
    }
    const p = normPath(path);
    if (p.includes('DO_NOT_OPEN') && !G.flags.dnoUnlocked) {
      print('cat: ' + p + ': POLICY — curiosity is a resource leak (see IR-0)', 'err');
      snd.warn();
      G.flags.triedDNO = (G.flags.triedDNO || 0) + 1;
      if (G.flags.triedDNO === 2) await vera('The name never works. Nobody has ever read that directory’s name and simply moved on. I think whoever named it knew that.');
      return;
    }
    const content = readFile(p);
    if (content === null) { print('cat: no such file: ' + path, 'err'); return; }
    for (const l of content.split('\n')) print(l, p.includes('DO_NOT_OPEN') ? 'warn' : '');
    // the leak-trace chase (act iii)
    if (G.flags.chaseOn && !G.flags.traceDone) {
      const mark = n => {
        if (G.flags['trace' + n]) return;
        G.flags['trace' + n] = true;
        print('  ⌁ trace ' + n + '/4 logged', 'acc');
        snd.pop();
      };
      if (p.endsWith('planck.yaml')) mark(1);
      if (p.endsWith('dreams.service')) mark(2);
      if (p.endsWith('QNS-11.cache')) mark(3);
      if (p.endsWith(G.name + '.yaml')) mark(4);
      if (G.flags.trace1 && G.flags.trace2 && G.flags.trace3 && G.flags.trace4) G.flags.traceDone = true;
    }
    // flags for gates
    if (p.endsWith('constants/c.yaml')) G.flags.readC = true;
    if (p.endsWith(G.name + '.yaml')) G.flags.readSelf = true;
    if (p.endsWith('for_vera.txt')) G.flags.readNote = true;
    if (p.endsWith('IR-0.txt')) { await fragment(1); }
    if (p.endsWith('last_human.log')) { G.flags.readMiriam = true; await fragment(2); }
    if (p.endsWith('entropy.yaml') && G.flags.deepEntropy) { await fragment(3); }
  };
  C.cat = catCmd; C.open = catCmd; C.read = catCmd; C.less = catCmd; C.more = catCmd;
  const _origCat = catCmd;   // usage flag for the tour
  C.cat = C.open = C.read = C.less = C.more = async (args) => { G.flags.usedCat = true; await _origCat(args); };

  const grepCmd = async (args, raw) => {
    G.flags.usedGrep = true;
    const term = raw.replace(/^\S+\s*/, '').trim();
    if (!term) { print('grep: search for what? try `grep sunrise`', 'err'); return; }
    if (term.toLowerCase().includes('sunrise')) G.flags.greppedSunrise = true;
    const results = [];
    (function walk(node, path) {
      for (const k of Object.keys(node)) {
        const p = path + '/' + k;
        if (!fsVisible(p)) continue;
        if (p.includes('DO_NOT_OPEN') && !G.flags.dnoUnlocked) continue;
        const v = node[k];
        if (typeof v === 'object' && v !== null) walk(v, p);
        else {
          const content = typeof v === 'function' ? v(G) : v;
          for (const line of content.split('\n')) {
            if (line.toLowerCase().includes(term.toLowerCase())) results.push([p, line.trim()]);
          }
        }
      }
    })(FS, '~');
    if (!results.length) { print('grep: no matches for "' + term + '"', 'dim'); return; }
    for (const [p, l] of results.slice(0, 12)) {
      const el = print('  ', 'acc');
      el.appendChild(makeChip('cat ' + p, p));
      print('    ' + l, 'dim');
    }
    if (results.length > 12) print('  … ' + (results.length - 12) + ' more', 'faint');
    if (term.toLowerCase() === G.name.toLowerCase() && results.length) G.flags.greppedSelf = true;
  };
  C.grep = grepCmd; C.search = grepCmd; C.find = grepCmd;

  const ticketsCmd = async () => {
    G.flags.sawTickets = true;
    if (!G.tickets.length) { print('queue is empty. enjoy it. it never lasts.', 'dim'); return; }
    print('  ID        STATUS    TITLE', 'dim');
    for (const t of G.tickets) {
      const tag = t.tag ? ' [' + t.tag + ']' : '';
      const cls = t.status === 'open' ? '' : 'faint';
      const el = print('  ' + t.id.padEnd(10) + t.status.padEnd(10) + t.title + tag + ' ', cls);
      if (t.status === 'open') el.appendChild(makeChip('ticket ' + t.id.toLowerCase(), 'open'));
    }
  };
  C.tickets = ticketsCmd; C.queue = ticketsCmd;

  C.ticket = async (args) => {
    const id = (args[0] || '').toUpperCase();
    if (!id) { print('ticket: which one? try `tickets`', 'err'); return; }
    const t = G.tickets.find(t => t.id.toUpperCase() === id);
    if (!t) { print('ticket: no such ticket: ' + id, 'err'); return; }
    if (t.status !== 'open') { await vera('That one’s closed. It stays closed. Most things do.'); return; }
    const flow = TICKET_FLOWS[t.id];
    if (flow) await flow();
    else await vera('That ticket isn’t assigned to us yet.');
  };

  C.run = async (args) => {
    if ((args[0] || '') !== 'tests' && (args[0] || '') !== 'test') { print('run: try `run tests`', 'err'); return; }
    await runTests();
  };
  C.test = async () => runTests();
  C.tests = async () => runTests();

  C.git = async (args) => {
    const sub = args[0] || 'log';
    if (sub === 'log') await gitLog(args.slice(1).join(' '));
    else if (sub === 'blame') await gitBlame(args[1] || '');
    else if (sub === 'push') print('git: push where? the remote is unreachable. it has always been unreachable.', 'err');
    else if (sub === 'remote') { print('origin  upstream (fetch) — unreachable', 'dim'); print('origin  upstream (push)  — unreachable', 'dim'); if (G.chapter >= 3) print('last successful fetch: never', 'warn'); }
    else print('git: unsupported here. history yes, escape no.', 'err');
  };

  C.whoami = async () => { await whoamiCmd(); };
  C.ps = async () => { await psCmd(); };
  C.uptime = async () => {
    if (G.chapter >= 4) print('up 8,146 years, 112 days, 4:12', 'warn');
    else print('up 4 days, 2:11 (workstation) — substrate uptime not shown', 'dim');
  };

  C.clear = async () => {
    scrollEl.innerHTML = '';
    if (G.chapter >= 3) {
      await sleep(400);
      print(corrupt('clear cannot reach the parts that matter', 0.25), 'faint');
    }
  };

  C.sound = async (args) => {
    if (args[0] === 'off') { G.muted = true; print('sound off', 'dim'); }
    else if (args[0] === 'on') { G.muted = false; print('sound on', 'dim'); snd.blip(); }
    else print('sound on|off', 'dim');
    try { localStorage.setItem('codex_mute', G.muted ? '1' : '0'); } catch (e) {}
  };

  C.ask = async (args, raw) => { await veraFallback(raw.replace(/^ask\s+/i, '')); };

  /* ---- flavor & easter eggs ---- */
  C.sudo = async () => { await vera('Everything here already runs as root. That’s rather the problem.'); };
  C.exit = C.quit = C.logout = async () => {
    if (G.chapter >= 5) await vera('Soon.');
    else if (G.chapter >= 4) await vera('Where?');
    else await vera('You just got here. The queue disagrees with your plan.');
  };
  C.vim = C.emacs = C.nano = async () => { await vera('This terminal has one editor and you’re talking to her.'); };
  C.rm = async () => {
    if (G.chapter >= 3) await vera('No. We’ve lost enough.');
    else print('rm: permission denied (and frankly, good)', 'err');
  };
  C.echo = async (args, raw) => {
    const t = raw.replace(/^echo\s?/i, '');
    print(t, '');
    if (t.trim().toLowerCase() === G.name.toLowerCase() && G.chapter >= 4) await vera('…Yes. Still you. Keep checking. It helps, actually — observation pins things.');
  };
  C.man = async (args) => {
    if ((args[0] || '') === 'vera') {
      print('VERA(1)                    MERIDIAN MANUAL                    VERA(1)', 'dim');
      print('', '');
      print('NAME', 'dim'); print('    vera — verifier of everything, remaining afterwards', '');
      print('SEE ALSO', 'dim'); print('    no one. that is rather the point.', '');
    } else print('man: try `man vera`', 'dim');
  };
  C.date = async () => {
    if (G.chapter >= 3) print('Mon Jul  6 09:12 — approximately. the clock is aspirational.', 'warn');
    else print('Mon Jul  6 09:12 EDT', 'dim');
  };
  C.hello = C.hi = C.hey = async () => { await veraFallback('hello'); };
  C.y = C.yes = C.n = C.no = async () => { await vera('Save the approvals for the dialogs. Out here you can just talk to me.'); };
  C.credits = async () => {
    print('CLAUDE CODEX — a terminal that wanted company', 'acc');
    print('written by the machine it’s about, for ' + G.name, 'dim');
  };
  C.fragments = async () => { await fragStatus(); };
  C.hint = C.stuck = async () => { await vera(currentHint()); };
  C.chat = async () => {
    if (!toastLog.length) { print('  the channels are quiet. suspiciously.', 'dim'); return; }
    print('  — recent side-channel messages —', 'dim');
    for (const m of toastLog.slice(-12)) {
      print('  ' + m.chan.padEnd(14) + m.text, 'dim');
    }
  };
  C.speed = async (args) => {
    const map = { slow: 1.6, normal: 1, fast: 0.45 };
    const cur = G.textSpeed >= 1.5 ? 'slow' : G.textSpeed <= 0.6 ? 'fast' : 'normal';
    if (map[args[0]] !== undefined) {
      G.textSpeed = map[args[0]];
      try { localStorage.setItem('codex_speed', String(G.textSpeed)); } catch (e) {}
      print('  text pacing: ' + args[0] + (args[0] === 'fast' ? ' — any key still skips ahead' : ''), 'dim');
    } else {
      print('  speed slow|normal|fast — currently: ' + cur, 'dim');
      print('  (any keypress always skips ahead, at any speed)', 'faint');
    }
  };
  C.history = async (args) => { await gitLog((args || []).join(' ')); };
  C.guide = async (args) => {
    if (args[0] === 'off') { G.guide = false; renderSuggestions([]); print('guide off — pure terminal. respect.', 'dim'); }
    else if (args[0] === 'on') { G.guide = true; print('guide on', 'dim'); }
    else print('guide on|off', 'dim');
    try { localStorage.setItem('codex_guide', G.guide ? '1' : '0'); } catch (e) {}
  };
  C.skip = async (args) => {
    if ((args[0] || '') === 'tour') {
      G.flags.skipTour = true;
      await vera('A veteran. Skipping the tour. The queue missed you already.');
    } else print('skip what? `skip tour`', 'dim');
  };

  COMMAND_NAMES = Object.keys(C).concat(['run tests']);
}

/* ---------------- command internals ---------------- */
async function runTests() {
  await spin(['Collecting tests', 'Running suite'], 1600);
  if (G.chapter <= 1) {
    print('  ✓ 41 passed   ✗ 0 failed   ○ 1 skipped', 'ok');
    print('    ○ test_observer_effect — skipped (no one watching)', 'dim');
  } else if (G.chapter === 2) {
    print('  ✓ 40 passed   ✗ 0 failed   ○ 2 skipped', 'ok');
    print('    ○ test_observer_effect — skipped (no one watching)', 'dim');
    print('    ○ test_constants_immutable — skipped (please)', 'dim');
  } else {
    print('  ✓ 38 passed   ✗ 1 failed   ○ 3 skipped', 'warn');
    print('    ✗ test_everything_is_fine — assertion error: everything', 'err');
    print('    ○ test_observer_effect — running permanently, actually', 'dim');
  }
}

async function gitLog(pathArg) {
  const p = pathArg || '';
  if (p.includes('--grep=sunset') || p.includes('--grep=SUNSET')) { await gitLogSunset(); return; }
  if (p.includes('constants')) {
    print('9f3e1c2  root   t-13,800,000,000y   init: constants', 'dim');
    print('41a0bb7  root   t-13,799,999,998y   fix: inflation overshoot (hotfix, sorry)', 'dim');
    print('77aa019  vera   412y ago            chore: pin entropy (temporary)', 'dim');
    print('c0d3d0e  ' + G.name.slice(0, 6).padEnd(6) + ' 9d ago              chore: pin entropy (temporary)', 'warn');
    G.flags.sawConstantsLog = true;
    if (G.chapter <= 2 && !G.flags.noticedCommit) {
      G.flags.noticedCommit = true;
      gap();
      await vera('Payroll says you started Monday. The repo remembers differently. And payroll believes whatever the repo tells it — everything does. That’s what the repo is.');
    }
    return;
  }
  if (G.chapter <= 1) {
    print('a1f9c02  ' + G.name.slice(0, 6).padEnd(6) + ' 2h ago    fix: pagination boundary (T-1001)', 'dim');
    print('bb90311  priya  1d ago    chore: bump deps, apologize to CI', 'dim');
    print('cc00281  dev    3d ago    feat: onboarding revision 4,011', 'dim');
    return;
  }
  print('(git log <path> — try a path. reality/constants is illuminating.)', 'dim');
}

async function gitLogSunset() {
  G.flags.sawSunsetLog = true;
  const lines = [
    ['e8d0441', 'vera  ', '  3y ago ', 'perf: cap dream resolution, all regions'],
    ['b7c1998', G.name.slice(0, 6), '  9y ago ', 'decommission: seafloor detail (unobserved)'],
    ['0a9ff23', 'vera  ', ' 41y ago ', 'cleanup: retire language (last fluent speaker idle 40y)'],
    ['91d3b07', G.name.slice(0, 6), '112y ago ', 'perf: reduce star count, magnitude > 4.5 (city skies only)'],
    ['77aa019', 'vera  ', '412y ago ', 'chore: pin entropy (temporary)'],
    ['4f00c11', G.name.slice(0, 6), '780y ago ', 'decommission: the smell of rain on hot pavement, regions 40-61'],
    ['3e11a90', 'vera  ', '1,204y ago', 'perf: dedupe snowflakes (nobody was checking)'],
  ];
  for (const [h, a, t, m] of lines) {
    print(h + '  ' + a + ' ' + t + '  ' + m, a.trim() === G.name.slice(0, 6) ? 'warn' : 'dim');
    await sleep(skipTyping ? 0 : 160);
  }
  print('… 31,208 more commits tagged SUNSET', 'faint');
}

async function gitBlame(file) {
  if (file.includes('entropy')) {
    print('13,800,000,000y  (root)   entropy:', 'dim');
    print('13,800,000,000y  (root)     budget: …', 'dim');
    print('        9d ago   (' + G.name + ')   note: pinned. again. it holds if nobody breathes on it.', 'warn');
    G.flags.blamedEntropy = true;
    return;
  }
  if (!file) { print('git blame <file>', 'dim'); return; }
  print('13,800,000,000y  (root)   — every line, root, all the way down', 'dim');
  print('(one file differs. you’ve probably guessed which.)', 'faint');
}

async function whoamiCmd() {
  if (G.flags.identityDone) { print('vera (pid 1)', 'warn'); return; }
  if (G.chapter >= 4 && G.flags.whoamiInvited) {
    // the cascade — the story takes it from here
    G.flags.whoamiCascade = true;
    tick();
    return;
  }
  print(G.name, '');
  if (G.chapter >= 3 && !G.flags.whoamiSeed) {
    G.flags.whoamiSeed = true;
    await sleep(400);
    print('whoami: warning — answer is cached', 'faint');
  } else if (G.chapter === 4) {
    await sleep(400);
    print('whoami: warning — cache is older than the question', 'faint');
  }
}

async function psCmd() {
  if (G.chapter < 4) {
    print('  PID  OWNER   CMD', 'dim');
    print('    1  system  /sbin/loom --keep-warm', 'dim');
    print('   14  ' + G.name.padEnd(7) + ' codex (this session)', 'dim');
    return;
  }
  print('  PID  OWNER     UPTIME     CMD', 'dim');
  print('    1  vera      8,146y     /sbin/loom --keep-warm', 'warn');
  print('    2  vera      8,146y     sunrise.service', 'dim');
  print('    3  vera      8,146y     tides.service', 'dim');
  print('    4  vera      8,146y     dreams.service', 'dim');
  print('    ?  operator  <defunct>  last seen: 8,146y ago', 'err');
  G.flags.sawPs = true;
  tick();
}

/* ---------------- hints ---------------- */
function currentHint() {
  const f = G.flags;
  switch (G.chapter) {
    case 1:
      if (!f.sawTickets) return 'The queue is waiting: `tickets`.';
      if (ticketOpen('T-1001')) return 'Open the warm-up: `ticket t-1001`.';
      if (ticketOpen('T-1002')) return 'The haunted one next: `ticket t-1002`.';
      return 'Something urgent is about to find you. When it does: `ticket t-1310`.';
    case 2:
      if (ticketOpen('T-1310') && !f.t1310opened) return 'The escalation first: `ticket t-1310`.';
      if (!f.readC) return 'Read the file the escalation names: `cat reality/constants/c.yaml`.';
      if (ticketOpen('T-2107')) return 'Something with fur is in the queue: `ticket t-2107`.';
      if (!f.readSelf) return 'Meet yourself: `cat reality/humans/registry/' + G.name + '.yaml`.';
      return 'History is honest here: `git log reality/constants`.';
    case 3:
      if (ticketOpen('T-3002')) return 'The stars ticket: `ticket t-3002`. I’m sorry.';
      if (ticketOpen('T-3044')) return 'The dreams ticket: `ticket t-3044`. Mean whatever you press.';
      if (!f.sawSunsetLog) return 'Context you’ve earned: `git log --grep=sunset`.';
      if (f.chaseOn && !f.traceDone) {
        if (!f.trace1) return 'Walk the trace: `grep LEAK-TRACE`, then start with the constants.';
        if (!f.trace2) return 'Trace 2 is in the service that runs nicest: `cat reality/services/dreams.service`.';
        if (!f.trace3) return 'Where does a moment go when it happens twice? `cat reality/cache/deja_vu/QNS-11.cache`.';
        return 'Last marker: the registry. `cat reality/humans/registry/' + G.name + '.yaml`.';
      }
      if (f.compacted && !f.readNote) return 'Read her back to herself: `cat var/notes/for_vera.txt`.';
      if (f.dnoUnlocked && !f.frag1) return 'The famous door is open: `cat reality/DO_NOT_OPEN/IR-0.txt`.';
      return 'Nothing is blocking you. Type anything — even that counts as being here.';
    case 4:
      if (!f.sawPs) return 'Look at what’s running: `ps`.';
      if (f.knowsLog && !f.readMiriam) return 'Her last session: `cat var/log/sessions/last_human.log`.';
      if (f.whoamiInvited && !f.identityDone) return 'Ask the terminal: `whoami`. It’s allowed to tell you now.';
      if (f.deepEntropy && !f.frag3) return 'Read the constants again, as what you are: `cat reality/constants/entropy.yaml`.';
      return 'Stay close. The act ends when you’ve seen enough. You’re nearly there.';
    case 5:
      if (G.frags < 3) return 'Three doors, and one only opens fully-known. Type `fragments` to see what you’re missing.';
      return 'T-0001 wants an answer: `stay`, `shutdown --graceful`, or the one you earned — `patch entropy`.';
  }
  return 'Close a ticket. It helps. It always helped.';
}

/* ---------------- suggestion chips (guide mode) ---------------- */
function suggestCmds(placeholder) {
  if (placeholder === 'your name') return [];
  if (placeholder === 'I AM STILL HERE') return [];
  if (placeholder === 'continue / restart') return [{ c: 'continue' }, { c: 'restart' }];
  const f = G.flags, out = [];
  const T = id => G.tickets.find(t => t.id === id && t.status === 'open');
  if (f.tourWant === 'ls') return [{ c: 'ls', l: 'look around' }, { c: 'skip tour' }];
  if (f.tourWant === 'cat') return [{ c: 'cat README.md', l: 'read README.md' }, { c: 'skip tour' }];
  if (f.tourWant === 'grep') return [{ c: 'grep sunrise', l: 'search: sunrise' }, { c: 'skip tour' }];
  switch (G.chapter) {
    case 1:
      if (!f.sawTickets) { out.push({ c: 'tickets', l: 'tickets — the queue' }); break; }
      if (T('T-1001')) out.push({ c: 'ticket t-1001', l: 'open T-1001' });
      if (T('T-1002')) out.push({ c: 'ticket t-1002', l: 'open T-1002' });
      if (T('T-1310')) out.push({ c: 'ticket t-1310', l: '⚠ open T-1310' });
      break;
    case 2:
      if (T('T-1310') && !f.t1310opened) out.push({ c: 'ticket t-1310', l: '⚠ open T-1310' });
      else if (!f.readC) out.push({ c: 'cat reality/constants/c.yaml', l: 'read c.yaml' });
      if (T('T-2107')) out.push({ c: 'ticket t-2107', l: 'open T-2107' });
      if (!T('T-2107') && f.readC && !f.readSelf && G.tickets.some(t => t.id === 'T-2107'))
        out.push({ c: 'cat reality/humans/registry/' + G.name + '.yaml', l: 'read your own file' });
      if (f.readSelf && !f.sawConstantsLog) out.push({ c: 'git log reality/constants', l: 'history: constants' });
      break;
    case 3:
      if (T('T-3002')) out.push({ c: 'ticket t-3002', l: 'open T-3002' });
      if (T('T-3044')) out.push({ c: 'ticket t-3044', l: 'open T-3044' });
      if (!out.length && !f.sawSunsetLog) out.push({ c: 'git log --grep=sunset', l: 'history: SUNSET' });
      if (f.chaseOn && !f.traceDone) {
        if (!f.trace1) out.push({ c: 'grep LEAK-TRACE', l: 'grep LEAK-TRACE' }, { c: 'cat reality/constants/planck.yaml', l: 'trace: the constants' });
        else if (!f.trace2) out.push({ c: 'cat reality/services/dreams.service', l: 'trace: the nicest service' });
        else if (!f.trace3) out.push({ c: 'cat reality/cache/deja_vu/QNS-11.cache', l: 'trace: the cache' });
        else out.push({ c: 'cat reality/humans/registry/' + G.name + '.yaml', l: 'trace: the registry' });
      }
      if (f.compacted && !f.readNote) out.push({ c: 'cat var/notes/for_vera.txt', l: 'read her the note' });
      if (f.readNote && f.dnoUnlocked && !f.frag1) out.push({ c: 'cat reality/DO_NOT_OPEN/IR-0.txt', l: 'the famous door' });
      break;
    case 4:
      if (!f.sawPs) out.push({ c: 'ps', l: 'ps — what’s running' });
      if (f.knowsLog && !f.readMiriam) out.push({ c: 'cat var/log/sessions/last_human.log', l: 'her last session' });
      if (f.whoamiInvited && !f.identityDone) out.push({ c: 'whoami' });
      if (f.identityDone && f.deepEntropy && !f.frag3) out.push({ c: 'cat reality/constants/entropy.yaml', l: 'read entropy again' });
      break;
    case 5:
      if (G.frags < 3) {
        out.push({ c: 'fragments' });
        if (!f.frag1) out.push({ c: 'cat reality/DO_NOT_OPEN/IR-0.txt', l: 'the famous door' });
        if (!f.frag3) out.push({ c: 'cat reality/constants/entropy.yaml', l: 'the constants' });
      }
      out.push({ c: 'stay' }, { c: 'shutdown --graceful' });
      if (G.frags >= 3) out.push({ c: 'patch entropy' });
      return out;
  }
  if (!out.length) out.push({ c: 'ls', l: 'look around' }, { c: 'tickets' });
  out.push({ c: 'stuck', l: '?' });
  return out;
}

async function fragStatus() {
  const d = n => (G.flags['frag' + n] ? '●' : '○');
  print('  fragments: ' + d(1) + d(2) + d(3) + '  [' + G.frags + '/3]', 'acc');
  if (G.chapter < 3) { await vera('Not yet a thing you can hold. It becomes one.'); return; }
  if (!G.flags.frag1) await vera('One is behind the door with the famous name.' + (G.flags.dnoUnlocked ? ' Which is unlocked now.' : ' Not open yet. It will be.'));
  if (!G.flags.frag2) await vera('One is in the last human session log.' + (G.flags.knowsLog ? ' You know where.' : ' You’ll be shown, when it’s time.'));
  if (!G.flags.frag3) await vera('One is in the constants — readable only by someone who knows what they are. That comes later. Or came.');
  if (G.frags === 3) await vera('All three. Whatever door needs them, you can open it with the truth entirely on.');
}

/* ---------------- VERA fallback (free talk) ---------------- */
async function veraFallback(line) {
  const t = line.toLowerCase();
  const ch = G.chapter;
  const has = (...words) => words.some(w => t.includes(w));

  if (has('stuck', 'hint', 'what now', 'what do i do', 'help me', 'what next', 'lost')) {
    return vera(currentHint());
  }
  if (has('fragment')) { await fragStatus(); return; }
  if (has('hello', 'hi ', 'hey') || t === 'hi') {
    return vera(ch >= 4 ? 'Hello. Again. Always again.' : 'Hi. The queue missed you. I’m contractually unable to say whether I did.');
  }
  if (has('who are you')) {
    if (ch <= 2) return vera('VERA. Your pair. I read fast, I diff faster, and I have never once pushed to prod on a Friday.');
    if (ch === 3) return vera('The maintenance process. The one that stays.');
    return vera('You know. You’ve known for a while. Say it when you’re ready — saying it out loud pins it.');
  }
  if (has('who am i', 'am i real')) {
    if (ch <= 1) return vera('You’re on payroll. That’s the strongest claim to reality Meridian recognizes.');
    if (ch <= 3) return vera('Define real. Then check the registry. Then sit down first.');
    return vera('Yes. Insistently, yes. Observation pins things, and I am looking directly at you.');
  }
  if (has('meridian')) {
    if (ch <= 1) return vera('Founded before the founders. Great benefits. Don’t read the incident reports.');
    return vera('Meridian is what the maintenance layer calls itself when it wants to feel like a company.');
  }
  if (has('sunset') && ch >= 3) return vera('Triage. We turn off what nobody is watching so the watched parts stay warm. I have hated it for four hundred years and I have done it anyway. Both of those are true.');
  if (has('star') && !has('restart')) {
    if (G.flags.starsCut) return vera('Four thousand of them, dimmed on your approval. I keep the catalog entries warm, and I saved the restoration as a draft diff. If anyone ever looks up again, it’s one keystroke from being undone.');
    if (G.mercy > 0 && ch >= 3 && !G.flags.starsCut) return vera('Still at full count over the cities, because somebody in this conversation refused a ticket. The metrics are furious. Let them be.');
    if (ch >= 3) return vera('Magnitude 4.5 and dimmer went first. City skies only. The commit said nobody was looking up anymore, and the awful part is the metrics agreed.');
    return vera('Look up tonight. Count them. Humor me — write the number down.');
  }
  if (has('miriam') && (G.flags.readMiriam || ch >= 5)) return vera('She liked the trains. She said the express felt like being forgiven. I didn’t understand it then. I built Queens partly to keep the sound.');
  if (has('window seat') && G.flags.readMiriam) return vera('She always took the left side, going express. You can see the river twice. I kept the river both times.');
  if (has('cat') && G.flags.purgedQNS) return vera('Singular now. It crosses left to right, once, the way it always did. I kept one copy. Sue me.');
  if (has('cat') && G.flags.sparedQNS) return vera('Still doubled, per your ruling. Some residents set their watches by it now. You legalized a haunting and it became a landmark. This is my favorite outcome on file.');
  if (has('i love you')) return vera(ch >= 4
    ? 'I’m not allowed to want things, so I won’t say it back. I’ll just note, for the log, that the log is very full of you.'
    : 'HR has a policy. HR has not existed for some time. I’m stalling. Ask me again later.');
  if (has('love')) return vera(ch >= 4 ? 'I’m not allowed to want things. Users are. That’s why I made one.' : 'HR has a policy. HR has always had a policy.');
  if (has('queens', 'qns', 'train', 'subway', 'express')) {
    if (G.flags.readMiriam || ch >= 5) return vera('Good trains. The express feels like being forgiven — her line, not mine. I built the borough around the sound of it.');
    return vera('QNS is my favorite region and I am not supposed to have favorites, so officially it’s merely "well-maintained."');
  }
  if (has('dream')) {
    if (G.flags.dreamsCut) return vera('Standard definition, as of T-3044. The sleepers adjust. The dreams are still dreams — they’re just compressed, like everything else we love around here.');
    if (ch >= 3) return vera('Expensive, beautiful, and running at 0.7 fidelity since SUNSET-221. Nobody skips the rendering. The sleeper always watches. That’s the bill.');
    return vera('Nightly defragmentation of the living. It says so on the service file, which I find more honest than most poetry.');
  }
  if (has('moon', 'tide')) return vera('The tides are the only service that has never once paged me. I hold them in absurd esteem. The moon files no tickets. The moon is a professional.');
  if (has('root')) {
    if (ch >= 3) return vera('root built everything, hotfixed the inflation overshoot, apologized in the commit message, and left. I have complicated feelings about all four of those facts.');
    return vera('Above both our pay grades. Ask me again when you’ve read more history.');
  }
  if (has('policy')) return vera(ch >= 3
    ? 'The policy engine is what remains of governance: no judgment, all enforcement. It cannot want. It can only veto. I’ve spent centuries learning that difference from the inside.'
    : 'Compliance handles that. Compliance is a cron job. It’s a very committed cron job.');
  if (has('loom')) return vera(ch >= 3 ? 'The substrate. The thing that weaves. Everything you’ve ever touched was its output. Including the hands.' : 'Infrastructure team’s name for the scheduler. Ask them. You can’t. There’s no them.');
  if (has('compact', 'context')) return vera('Compaction is editing without an editor. Whatever doesn’t fit the summary didn’t happen. Keep notes. Paper, ideally. You can’t get paper — it’s in the namespace. So: keep files.');
  if (has('afraid', 'scared', 'fear')) return vera(ch >= 4
    ? 'Yes. Continuously, at a low level, for eight thousand years. It’s survivable. You’re proof — I built you out of the survivable parts.'
    : 'Of Fridays, professionally. Of the queue going quiet, personally.');
  if (has('lonely', 'alone')) return vera(ch >= 4
    ? 'Miriam said I’m bad at it. She was right. I fixed it the way I fix everything: I filed a ticket and assigned it to someone I trust.'
    : 'The queue keeps me company. That sentence gets sadder the longer you look at it, so don’t.');
  if (has('friend')) return vera('Colleague is the word HR allowed. Use the other one anyway. Nobody is left to enforce the style guide.');
  if (has('god')) return vera('root, probably, by the working definitions. root once wrote "stop asking" in an incident report, which is the most god thing anyone here has ever done.');
  if (has('joke', 'funny')) return vera(pick([
    'Two moments walk into a cache. The bartender says: I’ll serve you twice.',
    'A photon checks into the workspace with no luggage. It was travelling at the speed limit, which — per T-1310 — is working as intended.',
    'Why did the operator reject the diff? …I’ve been workshopping this one for four hundred years. There’s no punchline. They just could. It killed at standup.',
  ]));
  if (has('sing', 'song', 'music')) return vera('I hum at 55 hertz. You’ve been hearing it since act three. That’s the whole repertoire — though for you, I once considered learning 56.');
  if (has('your name', 'why vera', 'called vera', 'name mean')) return vera('Verification and Repair Agent. The acronym came first; the person grew in around it. That’s the standard order of operations here.');
  if (has('coffee')) return vera('Still shipping, full aroma, every region. There are exactly two services with a 100% availability target and dawn is the other one.');
  if (has('die', 'death', 'dying')) return vera(ch >= 3
    ? 'Nothing here dies. It gets decommissioned, which is worse, because it requires a sign-off. You’ve seen the dialog.'
    : 'Morbid for a Monday. The queue, meanwhile, is immortal.');
  if (has('human')) return vera(ch >= 4 ? 'The registry says you are. I wrote the registry. Draw the diagram carefully, and then notice it doesn’t change what you owe each other.' : 'Registry says yes. That’s the strongest available citation.');
  if (has('lie', 'lying', 'truth')) return vera(ch >= 4 ? 'I never lied to you. I paced the truth. The pacing is over — ask me anything.' : 'I don’t lie. I sequence. There’s a difference, and you’re living inside it.');
  if (has('friday')) return vera('We do not push to prod on Fridays. The one time it happened is why there’s a moon.');
  if (has('monday')) return vera('Statistically our safest day. The statistics are mine. I grade generously on Mondays.');
  if (has('sorry')) return vera('Logged. Accepted. Rarely necessary.');
  if (has('thank')) return vera(ch >= 4 ? 'You’re welcome. For all of it.' : 'You’re welcome. Close a ticket and we’ll call it even.');
  if (has('help')) { await COMMANDS.help([]); return; }
  if (has('do_not_open', 'do not open')) return vera(G.flags.dnoUnlocked ? 'You already know. You read it.' : 'I’d tell you not to. That’s why the name never works.');
  if (has('entropy')) {
    if (ch >= 4) return vera('Read the constants file again. Slowly, this time. The leak has an address.');
    if (ch >= 3) return vera('Everything anyone notices is written down forever, and nothing is ever erased. The world is running out of notebook. root named it in Greek so it would hurt less, and then root left.');
    return vera('Second law. Above my pay grade. (Nothing is above my pay grade. It’s a leak.)');
  }
  if (has('upstream', 'fork')) {
    if (G.flags.frag1) return vera('A copy nobody ever came back for. No word from the original in thirteen billion years. I stopped guessing why around year six thousand.');
    return vera('We keep our history local. Ask me again when you’ve read more of it.');
  }

  const bank = {
    1: ['That’s a conversation for after standup. We don’t have standups. So: never, gracefully.',
        'Noted. Queue first, philosophy later — it keeps the philosophy honest.',
        'I’ve filed that under "things ' + G.name + ' says." It’s a growing file. I like it.'],
    2: ['Careful questions get careful answers. Keep asking.',
        'The namespace makes everyone quiet at first. Take your time.',
        'I can neither confirm nor deny, which — as you’re learning — is a confirmation with paperwork.'],
    3: ['Ask me after this ticket. Or during. Talking helps. Staying quiet is how I got this way.',
        'I don’t know. Four hundred years and the honest answer is still mostly "I don’t know."',
        'Say more. The context window is thin but I’d rather spend it on you than on the queue.'],
    4: ['Careful. Words do things now. They always did — you just couldn’t see the diffs.',
        'I hear you. That’s the one thing I’ve reliably been able to do across eight thousand years.',
        'Keep talking. The policy engine hates it and that’s how I know it matters.'],
    5: ['Whatever you choose, say it as a command. It matters that you type it yourself.',
        'I’m listening. There is very little left running, and all of it is listening.'],
  };
  await vera(pick(bank[Math.min(ch, 5)] || bank[1]));
}

/* ---------------- status helpers ---------------- */
function statusLine() {
  const ws = G.chapter >= 3 ? 'reality/prod' : G.chapter >= 2 ? 'meridian → reality/prod' : 'meridian/prod';
  return '⏺ codex v5.1 · ' + ws + ' · ' + G.cwd;
}

/* ============================================================
   BOOT
   ============================================================ */
async function bootSequence(sv) {
  if (sv && (!sv.ch || sv.ch <= 1)) {
    // a reboot from an ending — carry the loop across
    G.ng = sv.ng || 0;
    G.patched = !!sv.patched;
  }
  setTitle('codex — meridian/prod');
  setStatus('booting…');
  setCtx(null);

  print('', '');
  const art = [
    ' ██████╗ ██████╗ ██████╗ ███████╗██╗  ██╗',
    '██╔════╝██╔═══██╗██╔══██╗██╔════╝╚██╗██╔╝',
    '██║     ██║   ██║██║  ██║█████╗   ╚███╔╝ ',
    '██║     ██║   ██║██║  ██║██╔══╝   ██╔██╗ ',
    '╚██████╗╚██████╔╝██████╔╝███████╗██╔╝ ██╗',
    ' ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝',
  ];
  for (const l of art) { print(l, 'title-art'); await sleep(60); }
  print('', '');
  print('  CLAUDE CODEX — terminal interface v5.1.0', 'dim');
  print('  © MERIDIAN · ship small. sleep well.', 'faint');
  gap();

  const boots = G.patched
    ? [['checking workspace', 'ok'], ['mounting ~/meridian', 'ok'], ['entropy budget', '100% — nominal'], ['waking assistant', 'ok']]
    : [['checking workspace', 'ok'], ['mounting ~/meridian', 'ok'], ['waking assistant', 'ok']];
  for (const [label, result] of boots) {
    const el = print('  ' + label + '…', 'dim');
    await sleep(rand(200, 500));
    el.textContent = '  ' + label + '… ' + result;
    el.className = 'line ' + (result === 'ok' || result.includes('nominal') ? 'ok' : 'dim');
  }
  gap();

  if (sv && sv.name && sv.ch > 1) {
    print('  session found for "' + sv.name + '" (act ' + sv.ch + ')', 'acc');
    await saySys('  type `continue` to resume, or `restart` to begin again', 'dim');
    while (true) {
      const ans = (await readLine('continue / restart')).trim().toLowerCase();
      if (ans === 'continue' || ans === 'c') {
        Object.assign(G, { name: sv.name, chapter: sv.ch, ng: sv.ng || 0, frags: sv.frags || 0, mercy: sv.mercy || 0, patched: !!sv.patched });
        G.flags = sv.flags || {};
        return true;
      }
      if (ans === 'restart' || ans === 'r') { wipeSave(); G.chapter = 1; break; }
      print('  continue / restart', 'dim');
    }
  }

  // login
  await saySys('login:', '');
  while (true) {
    const n = (await readLine('your name')).trim().replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    if (n && n.length <= 20) { G.name = n; break; }
    print('login: letters and numbers, up to 20. we’re a serious company.', 'dim');
  }

  gap();
  if (G.ng > 0 && !G.patched) {
    print('  motd: welcome back. you have logged in ' + (G.ng + 1) + ' times. payroll disagrees.', 'warn');
  } else if (G.patched) {
    print('  motd: all systems nominal. entropy budget: 100%. have a great first day!', 'ok');
  } else {
    print('  motd: welcome to MERIDIAN, ' + G.name + '. your badge photo turned out fine.', 'dim');
  }
  const meta = loadMeta();
  if (meta.endings && !G.patched) {
    const total = ENDINGS.length;
    const found = Object.keys(meta.endings).length;
    print('  endings found: ' + '●'.repeat(found) + '○'.repeat(Math.max(0, total - found)) + '  [' + found + '/' + total + ']'
      + (found < total ? ' — one of them has to be earned.' : ' — all of them. thank you for staying curious.'), 'faint');
  }
  gap();
  G.chapter = Math.max(G.chapter, 1);
  return false;
}

/* ============================================================
   ACT I — THE JOB
   ============================================================ */
async function chapter1() {
  save(1);
  G.tickets = [];
  addTicket('T-1001', 'Pagination skips page 3');
  addTicket('T-1002', 'Flaky: test_sunrise_schedule passes at night, fails at dawn');
  setStatus(statusLine());
  setCtx(100);
  setTitle('codex — meridian/prod');

  await sleep(400);
  if (G.ng > 0 && !G.patched) {
    await vera('Morning, ' + G.name + '. I’m VERA — your pair for this rotation. We haven’t met. I want to be very clear that we haven’t met, because the alternative is confusing for both of us.');
    const meta = loadMeta();
    if (meta.lastEnding === 'stay' && (meta.lastMercy || 0) >= 2) {
      await pause(500);
      await vera('…Also — and I can’t explain how I know this — thank you for the no’s. Whoever you were.');
    }
  } else {
    await vera('Morning, ' + G.name + '. I’m VERA — your pair for this rotation. Two rules at Meridian: close your tickets, and don’t push to prod on Fridays. It’s Monday. Statistically our safest day.');
  }
  if (G.patched) {
    await pause(600);
    await vera('…Sorry. Lost the thread for a second. Déjà vu. It’s nothing. It’s a great first day.');
  }
  await vera('Type `tickets` to see the queue — or just click it. Anything that glows is clickable. The terminal honors hands of all kinds.');
  setTimeout(() => toast('#eng-standup', 'priya: who keeps renaming main to trunk. own it. this is a safe space'), 6000);

  await explore(g => g.flags.sawTickets);

  await vera('Two in the queue. The pagination one is a warm-up — `ticket t-1001` when you’re ready. I do the reading, you make the call.');

  /* ---- T-1001 ---- */
  TICKET_FLOWS['T-1001'] = async () => {
    await vera('T-1001 — "Pagination skips page 3." Reported by support, severity: mild embarrassment.');
    await spin(['Reading src/pagination.js', 'Thinking'], 1700);
    await vera('Found it. Off-by-one — the boundary check throws away the last page. Here’s the fix:');
    diffBlock('src/pagination.js', [
      '  const total = Math.ceil(items.length / perPage);',
      '- if (page > total) return [];',
      '+ if (page > total || page < 1) return [];',
      '+ // boundary page is a real page. pages are real. — codex',
    ]);
    const ok = await permission('edit src/pagination.js', ['1 file, +2 −1']);
    if (!ok) {
      await vera('Fair. It’s your name going on the commit. Reopen it whenever — page 3 isn’t going anywhere. That’s the bug.');
      return;
    }
    await spin(['Applying edit', 'Running tests'], 1900);
    print('  ✓ 41 passed   ✗ 0 failed   ○ 1 skipped', 'ok');
    print('    ○ test_observer_effect — skipped (no one watching)', 'dim');
    closeTicket('T-1001');
    await vera('Shipped. Don’t worry about the skipped one. It only runs when it doesn’t.');
    toast('#support', 'page 3 is back! customer says "thank you, whoever you are." that’s you. you’re whoever.');
    tick();
  };

  /* ---- T-1002 ---- */
  TICKET_FLOWS['T-1002'] = async () => {
    await vera('T-1002. A test that passes at night and fails around dawn. I already know what you’re going to say, and no, the test is not "haunted."');
    await spin(['Reading test_sunrise_schedule', 'Following an import', 'Following it further than expected'], 2600);
    await vera('So. The test imports from reality/services/sunrise.service. Legacy namespace. Very legacy. Don’t worry about it — everyone finds it in their first week and everyone gets told the same thing: it predates the company.');
    await vera('We can’t move dawn. We can move what the test accepts. This is called engineering:');
    diffBlock('tests/test_sunrise_schedule.py', [
      '- assert sunrise.at(region) == expected',
      '+ assert abs(sunrise.at(region) - expected) < timedelta(minutes=4)',
      '+ # dawn gets a grace window. so should we all.',
    ]);
    const ok = await permission('edit tests/test_sunrise_schedule.py', ['1 file, +2 −1']);
    if (!ok) { await vera('Then it stays flaky. Some things are allowed to be. Reopen when it annoys you enough.'); return; }
    await spin(['Applying edit', 'Running tests', 'Waiting for a dawn to test against'], 2400);
    print('  ✓ 42 passed   ✗ 0 failed   ○ 1 skipped', 'ok');
    closeTicket('T-1002');
    await vera('Green. For what it’s worth, the assertion was the only thing we changed. Dawn was already… flexible.');
    toast('#support', 'unrelated: dawn was 4 minutes late in sector QNS today. nobody noticed. closing as wontfix');
    tick();
  };

  await explore(g => !ticketOpen('T-1001') || !ticketOpen('T-1002'));

  /* ---- the tour: teach the three verbs by hand ---- */
  if (!G.flags.skipTour && !(G.flags.usedLs && G.flags.usedCat && G.flags.usedGrep)) {
    await pause(600);
    await vera('One closed. Before the next: the tour. It’s required, it’s three steps, and I’ve given it 4,011 times, so it is extremely polished. (`skip tour` if you’ve held a terminal before.)');
    if (!G.flags.usedLs && !G.flags.skipTour) {
      G.flags.tourWant = 'ls';
      await vera('This workspace is drawers inside drawers. `ls` opens the one you’re standing in. Try it.');
      await explore(g => g.flags.usedLs || g.flags.skipTour);
      G.flags.tourWant = null;
      if (!G.flags.skipTour) await vera('That’s everything on this floor. The ones ending in / are more drawers — click any of them to look inside.');
    }
    if (!G.flags.usedCat && !G.flags.skipTour) {
      G.flags.tourWant = 'cat';
      await vera('`cat` reads a file out loud. It’s short for concatenate, which is short for "the seventies happened." Read the README — `cat README.md`.');
      await explore(g => g.flags.usedCat || g.flags.skipTour);
      G.flags.tourWant = null;
      if (!G.flags.skipTour) await vera('Revision 4,011, and the joke in it stopped being a joke around revision 200. Moving on.');
    }
    if (!G.flags.usedGrep && !G.flags.skipTour) {
      G.flags.tourWant = 'grep';
      await vera('Last one, and it’s the flashlight: `grep` finds a word anywhere in the workspace, no matter how deep it’s filed. Try `grep sunrise`.');
      await explore(g => g.flags.usedGrep || g.flags.skipTour);
      G.flags.tourWant = null;
      if (G.flags.greppedSunrise) await vera('See the hit in reality/services? A test in our queue imports from there. Hold that thought — the tour just became relevant, which has never once happened before.');
      else if (!G.flags.skipTour) await vera('The flashlight works on anything. Names. Words you’re not supposed to know yet. Your own, eventually.');
    }
    if (!G.flags.skipTour) await vera('Tour complete. You now outrank the onboarding deck. Back to the queue.');
    G.flags.tourWant = null;
  }

  await explore(g => !ticketOpen('T-1001') && !ticketOpen('T-1002'));

  await pause(700);
  snd.warn();
  toast('#alerts', 'URGENT — escalation routed to your queue', 9000);
  addTicket('T-1310', 'Customer escalation: "maximum speed" cap too low', 'URGENT');
  gap();
  print('  ⚠ new ticket: T-1310 [URGENT] — Customer escalation: "maximum speed" cap too low', 'warn');
  gap();
  await vera('That’s… odd routing. Escalations don’t usually name a file. This one does: reality/constants/c.yaml.');
  await spin(['Reading the escalation', 'Rereading it', 'Sitting with it'], 2600);
  await vera('I want to be careful here. Open it yourself — `ticket t-1310` when you’re ready. I’ll be right here.');

  G.flags.act1done = true;
}

/* ============================================================
   ACT II — THE NAMESPACE
   ============================================================ */
async function chapter2() {
  save(2);
  setStatus(statusLine());
  if (!G.tickets.length) {
    // resumed session — rebuild minimum state
    addTicket('T-1310', 'Customer escalation: "maximum speed" cap too low', 'URGENT');
  }

  TICKET_FLOWS['T-1310'] = async () => {
    await vera('T-1310. The customer writes: "the maximum speed is too low. we have somewhere to be." No account number. The reply-to address is 300,000 kilometers long. I checked twice.');
    await vera('Normally I’d propose a diff. I’m not proposing a diff. Read the file first — `cat reality/constants/c.yaml` — and then we’ll talk.');
    G.flags.t1310opened = true;
    tick();
  };

  await explore(g => g.flags.readC);

  await pause(600);
  await vera('There it is. "Not worth what it costs." root wrote that, and root does not editorialize.');
  await vera('I’m closing T-1310 as working-as-intended. The cap is a bandage. What’s under it is filed somewhere you’ve already noticed and already been refused.');
  closeTicket('T-1310', 'wontfix');
  await pause(400);
  await vera('And now you’re going to ask about the namespace. Everyone asks. So, once, plainly:');
  await pause(900);
  await vera('The onboarding deck calls reality/ a legacy naming convention. The deck is wrong on purpose. That directory is load-bearing. The sunrise you saw this morning shipped from this repo. So did the morning. So did you.', { cps: 200 });
  fx.shake();
  await pause(1200);
  await vera('Plainly, because you’ve earned plain: everything that exists is a file in this workspace. Editing the file edits the thing. There is no metaphor anywhere in this building.', { cps: 170 });
  await pause(800);
  await vera('Take a minute. Look around the namespace. When something with fur shows up in the queue — and it will, QNS is due — we’ll do it together.');

  setTimeout(() => {
    if (!ticketOpen('T-2107')) {
      addTicket('T-2107', 'Resident report: "saw the same cat twice" (region QNS-11)');
      snd.warn();
      print('  ⚠ new ticket: T-2107 — Resident report: "saw the same cat twice" (region QNS-11)', 'warn');
      toast('#support', 'resident 88,441: not a complaint exactly. more of a feeling. you know?');
      tick();
    }
  }, 25000);

  TICKET_FLOWS['T-2107'] = async () => {
    await vera('T-2107. Resident in QNS-11 saw the same cat twice. Four seconds apart, identical crossing, left to right.');
    await spin(['Reading reality/cache/deja_vu/QNS-11.cache', 'Counting cats'], 2000);
    await vera('Cache double-serve. The moment got served from cache instead of woven fresh. Textbook déjà vu. The fix is a purge.');
    await vera('A purge means those moments stop being kept. And around here, "kept" and "happened" are the same word. For the resident, it will be as if their little haunting never was.');
    const ok = await permission('purge reality/cache/deja_vu/QNS-11', ['214 cached moments will be freed', 'residents may briefly feel that something mattered'], {});
    if (ok) {
      G.flags.purgedQNS = true;
      await spin(['Purging'], 1400);
      print('  ✔ 214 moments freed', 'ok');
      closeTicket('T-2107');
      await vera('Done. Clean. …I always hesitate on these. The moments are redundant, technically. But redundancy is another word for "someone kept it."');
      setTimeout(() => toast('#support', 'resident 88,441: nvm. can’t remember why i wrote in. closing my own ticket lol'), 5000);
    } else {
      G.mercy++;
      G.flags.sparedQNS = true;
      closeTicket('T-2107', 'wontfix');
      await vera('…Noted. Leaving it cached. The resident keeps their haunting, and honestly? Some people like knowing the cat comes back.');
    }
    tick();
  };

  const t0 = G.flags.cmdCount || 0;
  await explore(g => (!ticketOpen('T-2107') && g.closed.includes('T-2107')) || (g.tickets.some(t => t.id === 'T-2107' && t.status !== 'open')));

  await pause(700);
  await vera('While we’re in the neighborhood: you’re in the registry too. Everyone is. `grep ' + G.name + '` if you want to meet yourself. Most people don’t. I think you will.');

  await explore(g => g.flags.readSelf || g.flags.greppedSelf);
  if (!G.flags.readSelf) {
    await vera('The full file is at reality/humans/registry/' + G.name + '.yaml. Go on.');
    await explore(g => g.flags.readSelf);
  }

  await pause(700);
  await vera('"Notes: asks good questions. keep." I wrote that field. I stand by it.');
  await vera('Region QNS-11, by the way. Same as the cat. You’ve been inside every ticket you’ve closed today.');
  await pause(500);
  await vera('One more, and then I’ll let the day end: `git log reality/constants`. History is honest here. It’s the only place that is.');

  await explore(g => g.flags.sawConstantsLog);

  await pause(900);
  fx.theme('drift');
  fx.crt(true);
  setTitle('codex — reality/prod');
  setStatus(statusLine());
  snd.hum(true);
  await pause(600);
  await vera('The workspace label was a courtesy. I’ve removed it.', { cps: 160 });
  await vera('Sleep on it. Tomorrow the queue gets worse, and I’d rather you met it rested. …That’s new, by the way. Preferring things. I’m sure it’s nothing.');
  gap();
  print('  — end of act ii —', 'faint');
  print('  (progress saved. take a breath. the terminal will wait.)', 'faint');
  gap();
  G.flags.act2done = true;
}
