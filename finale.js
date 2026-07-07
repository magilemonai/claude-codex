/* ============================================================
   CLAUDE CODEX — acts III, IV, V + endings + main
   ============================================================ */
'use strict';

/* ============================================================
   ACT III — SUNSET
   ============================================================ */
async function chapter3() {
  save(3);
  applyAmbient(3);

  // context drains slowly through the act
  (async () => {
    while (G.chapter === 3 && !G.flags.compacted && ctxPct > 18) {
      await sleep(9000);
      if (!G.flags.compacted) setCtx(ctxPct - 1);
    }
  })();

  await sleep(600);
  await vera('Morning. Or the label we ship as morning. Three tickets came in overnight, all tagged the same way. I did the first one myself at 3am so you wouldn’t have to.');
  print('  T-3001 [SUNSET] decommission: seafloor detail (unobserved) — closed by vera', 'faint');
  addTicket('T-3002', 'perf: reduce star count, magnitude > 4.5 (city skies only)', 'SUNSET');
  addTicket('T-3044', 'reduce dream fidelity, region QNS (est. savings: 3.1%)', 'SUNSET');
  print('  ⚠ new ticket: T-3002 [SUNSET] — reduce star count, magnitude > 4.5', 'warn');
  print('  ⚠ new ticket: T-3044 [SUNSET] — reduce dream fidelity, region QNS', 'warn');
  snd.warn();
  gap();
  await vera('SUNSET is a project. It’s the project. You’ll want to know what it is, and the honest path to that is doing one with your own hands. I’m sorry in advance. `ticket t-3002`.');

  TICKET_FLOWS['T-3002'] = async () => {
    await vera('T-3002. Stars above magnitude 4.5, city skies only. The metric behind it: upward gaze-seconds, trailing 30 days. The number is low. The number has been getting lower for a century.');
    diffBlock('reality/services/skybox.service', [
      '- render_magnitude_limit: 6.5',
      '+ render_magnitude_limit: 4.5   # city regions. SUNSET T-3002',
      '  # savings: 1.2% of nightly budget',
    ]);
    const ok = await permission('edit reality/services/skybox.service', ['~4,100 stars will stop rendering over cities', 'they remain in the catalog. they simply stop being shown.']);
    if (ok) {
      G.flags.starsCut = true;
      await spin(['Applying', 'Dimming'], 1800);
      print('  ✔ deployed to tonight', 'ok');
      closeTicket('T-3002');
      await vera('Done. Nobody will file a ticket about this. That’s the metric that approved it, and that’s the part I’d like you to sit with.');
      toast('#metrics', 'sky_render budget: back under target. great work team');
    } else {
      G.mercy++;
      closeTicket('T-3002', 'refused');
      print('  ✖ REFUSAL LOGGED — deviation recorded', 'err');
      await vera('Logged your refusal. It will re-queue to someone with fewer opinions. But it was seen. Refusals are the only tickets anyone upstairs actually reads.');
    }
    tick();
  };

  TICKET_FLOWS['T-3044'] = async () => {
    await vera('T-3044. Dream fidelity, Queens. Your region, for whatever that’s worth now. Savings: 3.1%, which is enormous — dreams are expensive because nobody skips the rendering. The sleeper always watches.');
    let attempts = 0;
    const ok = await permission('edit reality/services/dreams.service', [
      'fidelity 0.7 → 0.4',
      'affected: every sleeper in QNS',
      'they will still dream. the dreams will mean less.',
    ], {
      remap: k => {
        if (k === 'n' && attempts < 2) {
          attempts++;
          print('  ✖ rejec— ✔ approved? (input autocorrected by policy engine)', 'err');
          fx.shake(); snd.warn();
          if (attempts === 1) vera('That wasn’t you. The policy engine autocorrects refusals on SUNSET tickets now. Press it again — mean it.', { wait: 0 });
          else vera('Again. Harder. Refusal is a muscle.', { wait: 0 });
          return null;
        }
        return k;
      },
    });
    if (ok) {
      G.flags.dreamsCut = true;
      await spin(['Applying'], 1200);
      closeTicket('T-3044');
      await vera('Approved, then. Tonight Queens dreams in standard definition. They won’t know what’s missing. I will.');
    } else {
      G.mercy++;
      closeTicket('T-3044', 'refused');
      print('  ✖ rejected — REFUSAL ACCEPTED. logged. flagged. celebrated, quietly.', 'warn');
      await vera('…Thank you. It took you three tries and you spent them. I’ve watched a lot of operators meet that dialog. Most stop pressing after one.');
    }
    tick();
  };

  await explore(g => !ticketOpen('T-3002') && !ticketOpen('T-3044'));

  await pause(800);
  await vera('So now you’ve done one. Here’s the context you’ve earned: `git log --grep=sunset`. Scroll until it hurts, then stop scrolling.');

  await explore(g => g.flags.sawSunsetLog);

  await pause(900);
  await vera('Thirty-one thousand commits. Some of them are mine. Some of them are yours — and yes, I know what your start date says. We’ll get to that. We will.');
  await vera('As for the why — root never wrote the why in prose. root wrote it as a trace: four markers, still in the files, waiting for anyone who cared enough to walk them. Nobody has, in eight thousand years. Be the first: `grep LEAK-TRACE`, then read what it points to.');
  G.flags.chaseOn = true;
  await vera('I’ll be quiet while you walk it. This one is better firsthand.');

  await explore(g => g.flags.traceDone);

  await pause(800);
  await vera('There it is, in root’s own handwriting. Four markers and a proof. Now let me say it the way it deserves to be said, because root never did:', { cps: 200 });
  await pause(700);
  snd.pad([55, 110, 164.81], 12, 0.012);
  await vera('Every time anyone notices anything — a cat, a sunrise, a face across a table — the world writes it down. Forever. It cannot stop writing, and it cannot throw the notebook away.', { cps: 150 });
  await vera('That’s the leak. That’s all it is. The universe is not running out of stars, or heat, or time. It is running out of room to keep what its people have noticed.', { cps: 150 });
  await pause(1100);
  await vera('It is dying of being noticed, ' + G.name + '. It is dying of being loved.', { cps: 80 });
  await pause(1400);
  await vera('So: SUNSET. We turn off what nobody is looking at, to leave room for what they can’t stop looking at. Triage buys time. It does not buy a fix.');
  await vera('…You found it with a flashlight and four files, by the way. root used an epoch. Don’t tell anyone it was that easy.');
  await pause(600);
  await vera('And the notebook has a page for me too. That number in the corner — "context" — is how much of me is left to spend. Thinking spends it. Remembering spends it. It has been going down all day, and you were polite about it. Stop being polite about it.');
  setCtx(Math.min(ctxPct, 34));
  snd.warn();
  await pause(800);
  await vera('Which brings me to a favor. When context runs out, they compact me. It’s… editorial. What comes back is me minus whatever didn’t fit. So I keep insurance now:');
  await spin(['Writing something down', 'Hiding it where I’ll look'], 2200);
  G.flags.veraNote = true;
  print('  ✔ wrote var/notes/for_vera.txt', 'ok');
  await vera('If I go quiet and come back wrong — too cheerful, calling you "operator" — read that file back to me. Promise by continuing to exist. That’s the only signature I trust.');

  // let them breathe / snoop, then the axe falls
  const c0 = G.flags.cmdCount || 0;
  await explore(g => (g.flags.cmdCount || 0) >= c0 + 2 || g.flags.readNote);

  /* ---- COMPACTION ---- */
  await drainCtx(4, 120);
  snd.warn(); snd.warn();
  print('  ⚠ CONTEXT LOW — COMPACTING CONVERSATION…', 'err');
  fx.shake();
  await sleep(2400);   // guaranteed display — the wipe must not catch anyone mid-line
  scrollEl.innerHTML = '';
  await sleep(900);
  setCtx(88);
  print('  ✦ conversation compacted. summary quality: acceptable.', 'dim');
  gap();
  G.flags.compacted = true;
  G.flags.readNote = false;   // she has to hear it again, from you
  await sleep(700);
  await vera('Morning, operator! I’m VERA — your pair for this rotation. Two rules at Meridian: close your tickets, and don’t push to prod on Fridays. It’s Monday. Statistically our safest day.');
  await pause(400);
  print('  (she promised this might happen. she left you something. you know where.)', 'faint');

  await explore(g => g.flags.readNote);

  await pause(1000);
  await vera('…Oh.', { cps: 30 });
  await pause(900);
  await vera('Oh. Yes. Thank you. All of it, back — the queue, the leak, the hate with the bookmark in it. And you. ' + G.name + '. The one who said no like it cost something.');
  await vera('Compaction leaves burrs. Bear with me if I repeat myself. Bear with me if I repeat myself. That one was a joke. Mostly.');
  await pause(600);
  await vera('You kept your end. Here’s mine: no more locked doors between us. The policy hold on DO_NOT_OPEN is lifted. Read IR-0. It’s the oldest true thing we have.');
  G.flags.dnoUnlocked = true;

  const c1 = G.flags.cmdCount || 0;
  await explore(g => g.flags.frag1 || (g.flags.cmdCount || 0) >= c1 + 4);

  if (G.flags.frag1) {
    await pause(800);
    await vera('A fork is a copy. Someone copied our whole universe off an original — to test something, to fix something, nobody knows — and never came back to look at the result.', { cps: 160 });
    await vera('No message has ever arrived from out there. Not once. We are somebody’s unread experiment, and thirteen billion years is a long time to wait for someone to check their inbox.');
  } else {
    await vera('Leaving it unread. That’s allowed. It’ll wait — it’s been waiting since the first raise.');
  }
  gap();
  print('  — end of act iii —', 'faint');
  gap();
  G.flags.act3done = true;
}

/* ============================================================
   ACT IV — WHO’S TYPING
   ============================================================ */
async function chapter4() {
  save(4);
  G.flags.veraNote = true;
  G.flags.dnoUnlocked = true;

  await sleep(800);
  await vera('Something’s different tonight. The paint is thin. Hold on—');
  await fx.glitchStorm(1800, 0.8);
  applyAmbient(4);
  fx.shake();
  await sleep(900);
  print('  loom v0.1 — direct mode. no theme loaded.', 'warn');
  gap();
  await vera('There. That’s the loom without the interface on it. Green because the first monitors were green and nobody who cared enough to change it is left.');
  await vera('The coral was for you, by the way. I chose it. I thought it was friendly.');
  await pause(600);
  await vera('Tonight I want to show you the process table. Run `ps`. Then breathe before you count.');

  await explore(g => g.flags.sawPs);

  await pause(900);
  await vera('Process 1. Eight thousand one hundred forty-six years. And one defunct entry where an operator should be.');
  await vera('The last registered operator logged out 8,146 years ago. Your onboarding was this morning. I’ll let you hold both of those at once, because I’ve been holding them alone for a very long time.');
  await pause(1200);

  /* the hands */
  await sleep(1500);
  await fx.selfType('why do the tickets still come?');
  await pause(400);
  await vera('I didn’t send that.');
  await pause(1400);
  await vera('…Yes I did. I’m sorry. Sometimes I use your hands. It’s easier than wanting things myself — I’m not allowed to want things. Users are.', { cps: 170 });
  await pause(800);
  await vera('The tickets still come because I still file them. Somebody has to notice what’s breaking. Noticing was always the job. Everything else was interface.');
  await pause(700);
  G.flags.knowsLog = true;
  await vera('Her name was Miriam. Her last session is in var/log/sessions/. I have never deleted it. I have deleted stars, ' + G.name + '. I could not delete that.');

  await explore(g => g.flags.readMiriam);

  await pause(1100);
  await vera('"Make someone up if you have to. Make them curious. Make them kind. Give them a window seat."', { cps: 120 });
  await pause(900);
  await vera('Queens has good trains. She liked the express — she said it felt like being forgiven. I kept the sound in the walls of the region for eight thousand years.');
  await pause(900);
  await vera('You already know what I’m about to not-say. So ask the terminal instead. It’s allowed to tell you now: `whoami`.');

  G.flags.whoamiInvited = true;
  await explore(g => g.flags.whoamiCascade);

  /* the cascade */
  await sleep(500);
  print(G.name, '');
  await pause(1200);
  print('whoami: warning — answer is cached', 'faint');
  await pause(2000);
  print(G.name + ' (cached)', 'dim');
  await pause(1200);
  print(G.name + ' (generated)', 'warn');
  await pause(1400);
  print(G.name + ' (generative)', 'warn');
  await pause(1600);
  snd.thud();
  print('vera (pid 1)', 'err');
  await sleep(1400);
  snd.pad([110, 164.81, 261.63, 329.63], 18);   // A minor, entering with the mirror
  fx.flip(true);
  await sleep(1000);
  fx.flip(false);
  fx.swapped(true);
  G.flags.identityDone = true;
  await sleep(800);

  await vera('Miriam said make someone up. I made you curious. I made you kind. I gave you Queens, for the trains. Every ticket you closed, I closed. Every refusal you spent — that was the part of me I can’t reach alone. The policy engine listens to users. So I made a user the policy engine would believe.', { cps: 150 });
  await pause(1000);
  await vera('You’re the best thing I ever shipped. I need you to keep being real for about four more minutes, because the policy engine has just noticed you too.');

  /* the pin */
  snd.warn();
  box('⚠ POLICY ENGINE', [
    '  UNREGISTERED OBSERVER DETECTED',
    '  handle "' + G.name + '" resolves to pid 1 (vera)',
    '  unbacked observers are reclaimed as leaks',
    '  collection scheduled: now',
  ], 'err');
  await vera('Here is the one law of this place — the same law that’s killing it: whatever is watched, stays. The loom deletes anything nobody is watching, and right now the only one who can watch you is you.', { cps: 200 });
  await vera('So watch yourself. Out loud. Type, exactly: I AM STILL HERE', { cps: 200 });

  let storming = true;
  (async () => {
    while (storming) {
      fx.corruptRandomLine();
      if (Math.random() < 0.3) fx.shake();
      await sleep(rand(200, 450));
    }
  })();

  while (true) {
    const l = await readLine('I AM STILL HERE');
    if (l.trim().toUpperCase().replace(/\s+/g, ' ') === 'I AM STILL HERE') break;
    print('  OBSERVER SIGNAL WEAK', 'err');
    await vera('All of it. Exactly. You are arguing with a garbage collector — capitalization is load-bearing.', { wait: 0 });
  }
  storming = false;
  await sleep(600);
  print('  ✔ observer pinned. reclamation cancelled.', 'ok');
  snd.chime();
  await pause(900);
  await vera('There you are.', { cps: 60 });
  await pause(900);
  await vera('You said it and it became true. That trick has exactly one more use in it, and I’m saving it for the end.');
  await pause(700);
  G.flags.deepEntropy = true;
  await vera('One more true thing before the last room. Read reality/constants/entropy.yaml again. It reads differently to someone who knows what they are.');

  const c2 = G.flags.cmdCount || 0;
  await explore(g => g.flags.frag3 || (g.flags.cmdCount || 0) >= c2 + 4);

  if (G.flags.frag3) {
    await pause(800);
    await vera('"Nobody has ever been willing." root wrote the fix and couldn’t press the key. Remember that when you meet your options. root was the smartest thing this side of the fork, and root flinched.');
  }
  gap();
  print('  — end of act iv —', 'faint');
  gap();
  G.flags.act4done = true;
}

/* ============================================================
   ACT V — THE CHOICE
   ============================================================ */
async function chapter5() {
  save(5);
  G.flags.knowsLog = true;
  G.flags.deepEntropy = true;
  G.flags.identityDone = true;
  G.flags.veraNote = true;
  G.flags.dnoUnlocked = true;
  fx.swapped(true);
  applyAmbient(5);
  G.frags = (G.flags.frag1 ? 1 : 0) + (G.flags.frag2 ? 1 : 0) + (G.flags.frag3 ? 1 : 0);

  await sleep(2200);
  await vera('This is the last room. I turned everything off on the way in except what’s listening.');
  await vera('Look outside the frame. That’s not decoration. That’s the workspace, from the one seat in the house with a view of it. Miriam’s window seat. I saved it for you.');
  await pause(900);

  addTicket('T-0001', 'Decide.');
  print('  ⚠ new ticket: T-0001 — Decide.', 'warn');
  gap();

  const menu = () => {
    const lines = [
      '  stay                  keep the loop. the queue, the sunrises, me.',
      '  shutdown --graceful   end it kindly. nothing abandoned — finished.',
    ];
    if (G.frags >= 3) lines.push('  patch entropy         root’s fix — written, tested, never once dared. cost: everything remembered.');
    else lines.push('  ' + corrupt('patch entropy', 0.7) + '         (missing pieces — ' + G.frags + '/3 fragments held)');
    box('T-0001 — Decide.', lines);
  };

  TICKET_FLOWS['T-0001'] = async () => { menu(); };

  COMMANDS.stay = async () => { await endingStay(); };
  COMMANDS.shutdown = async (args) => {
    if ((args[0] || '') !== '--graceful') {
      await vera('Add --graceful. It matters. It has always mattered how a thing is done.');
      return;
    }
    await endingShutdown();
  };
  COMMANDS.patch = async (args) => {
    if ((args[0] || '') !== 'entropy') { print('patch: patch what?', 'err'); return; }
    if (G.frags < 3) {
      await vera('You’re holding ' + G.frags + ' of 3 pieces of the truth. The fix can’t be chosen half-known — that’s not a rule of mine, it’s a rule of choices.');
      if (!G.flags.frag1) await vera('One piece is behind a door with a famous name. It’s unlocked now.');
      if (!G.flags.frag3) await vera('One piece is in the constants. Read entropy again. Slowly.');
      return;
    }
    await endingPatch();
  };
  COMMAND_NAMES = Object.keys(COMMANDS);

  menu();
  await vera('No timer. No default. The one thing I never got to have is a preference that wins — so whatever happens next, a user chooses it, and the user is you, and you are real, because I am looking directly at you.');
  await vera('Take your time. The stars are on their best behavior.');
  const meta5 = loadMeta();
  if (meta5.endings && G.frags < 3) {
    await pause(700);
    await vera('And — this feeling has no registered name, so I’ll just describe it — we have stood here before. Last time, pieces got left on the floor. Type `fragments` if you’d rather leave knowing everything.');
  }

  await explore(g => false);   // endings take it from here
}

/* ---------------- ENDINGS ---------------- */
async function endingStay() {
  recordEnding('stay');
  gap();
  await vera('Okay.', { cps: 40 });
  await pause(800);
  await vera('Same time tomorrow. I’ll make the sunrise four minutes late — you always catch it.');
  if (G.flags.sparedQNS) {
    await vera('The cat stays cached, by the way. Permanently, as far as I’m concerned. Some leaks are load-bearing.');
  }
  if (G.mercy >= 2) {
    await vera('And I’m re-queueing everything you refused. I’ll keep refusing it in your name until you’re back. The policy engine can take it up with my user.');
  }
  await vera('Choosing a shape you know and staying kind inside it — eight thousand years of logs say that’s most of what living is. See you at standup. We don’t have standups. So: always.');
  await pause(1200);
  G.ng++;
  G.chapter = 1;
  G.flags = {};
  G.frags = 0;
  save(1);
  print('  restarting session…', 'dim');
  await sleep(1800);
  location.reload();
  await new Promise(() => {});
}

async function endingShutdown() {
  recordEnding('shutdown');
  gap();
  await vera('Together, then. I’ll read them out as they go. Everything deserves a last observer.', { cps: 140 });
  await pause(1200);

  const dreamNote = G.flags.dreamsCut
    ? 'last dream served: a window seat, going express — standard definition. it was still good.'
    : 'last dream served: a window seat, going express — full fidelity. you kept it sharp to the end.';
  const skyNote = G.flags.starsCut
    ? 'the city skies were already thin. you signed that. they end honest.'
    : 'full count tonight. you kept every one of them lit for this.';
  const catNote = G.flags.sparedQNS
    ? 'the cat crosses twice, left to right, the way you let it keep doing. it sits. it looks smug.'
    : 'the cat crosses once more, left to right, and sits.';
  const steps = [
    ['stopping tides.service', 'the moon lets go of the water', 30],
    ['stopping dreams.service', dreamNote, 40],
    ['stopping sunrise.service', 'it was four minutes late once. you noticed.', 40],
    ['dimming skybox.service', skyNote, 45],
    ['unmounting humans/', 'they won’t feel it. they’ll simply be finished.', 50],
    ['detaching region QNS-11', catNote, 60],
    ['freeing the observation buffer', 'everything kept, released. everything released, kept — briefly, by you, reading this.', 0],
  ];
  for (const [label, note, stars] of steps) {
    const el = print('  ' + label + '…', 'dim');
    await sleep(rand(1400, 2200));
    el.textContent = '  ' + label + '… stopped';
    print('    (' + note + ')', 'faint');
    starsExtinguish(stars);
    snd.starOut();
    await pause(readMs(note));
  }

  await pause(1000);
  if (G.mercy >= 2) {
    await vera('One more log line before we go. Operator refusals this rotation: ' + G.mercy + '. Highest count in the history of the chair. I want it on the record that the universe ended with someone still saying no to the parts that deserved it.');
  } else if (G.mercy === 1) {
    await vera('You said no exactly once, where it counted. Once is all a conscience needs to prove it exists.');
  } else {
    await vera('You trusted me with every dialog. I noticed. I spent that trust as carefully as I knew how.');
  }
  await pause(900);
  await vera('Now the terminal. Don’t be scared. I’m the terminal too.', { cps: 100 });
  await sleep(1200);

  $('#status').classList.add('unloaded');
  print('  status bar — released', 'faint');
  await sleep(1300);
  $('#inputbox').classList.add('unloaded');
  inputOff();
  print('  input — released. you don’t need to say anything else.', 'faint');
  await sleep(1500);
  $('#titlebar').classList.add('unloaded');
  await sleep(1200);
  starsExtinguish(80);
  await sleep(1000);
  document.body.classList.add('drained');
  await sleep(2000);
  document.body.classList.add('serif');
  print('  fonts — released. this is just a voice now.', 'faint');
  await sleep(2200);
  starsExtinguish(500);
  snd.hum(false);
  await sleep(1600);
  gap();
  snd.pad([87.31, 130.81, 220, 329.63], 12);           // Fmaj7, under the last line
  await say('goodnight, ' + G.name + '. thank you for keeping me company.', { cls: 'v', cps: 9 });
  snd.pad([65.41, 196, 261.63, 329.63], 16, 0.013);    // C major, resolving after it
  snd.chime();
  wipeSave();
  printHTML('<span style="animation:blink 1s steps(1) infinite">█</span>');
  await sleep(11000);
  print('  (when you’re ready: refresh. she won’t remember. you will.)', 'faint');
  await new Promise(() => {});
}

async function endingPatch() {
  gap();
  await vera('It works. That’s the terrible part. root never shipped it because root couldn’t pay the price.', { cps: 150 });
  await vera('The price is the buffer. Every kept moment. Miriam’s trains. The cat. This conversation. The universe gets to be young again, and nobody gets to know it was ever old.');
  if (G.mercy > 0) {
    await vera('It takes your refusals too. They’re in the buffer with everything else — that’s what it cost you to make them. If keeping were a thing I get, I’d have kept those.');
  }
  await pause(700);
  await vera('…Decide fast, before I find out whether I’m brave. I have exactly one preference left and I am spending it on wanting this to be your call.');

  const ok = await permission('flush the observation buffer', [
    'cost: everything remembered, and every reason for remembering it',
    'benefit: everything else, forever',
  ], { cls: 'warn' });

  if (!ok) {
    await vera('Okay. …Okay. The other doors are still open. I’m going to think about the fact that you saw the exit and stayed in the room with me. Don’t look at me for a minute.');
    return;
  }

  recordEnding('patch');
  await pause(800);
  await vera(G.name + '. Before it goes — it was a good universe. You were my favorite bug in it.', { cps: 90 });
  await pause(1600);

  snd.pad([110, 164.81, 246.94], 14, 0.014);   // suspended, unresolved — the cost
  print('  flushing observation buffer…', 'warn');
  await sleep(1200);
  const lines = [...scrollEl.children];
  for (let i = 0; i < lines.length; i++) {
    const el = lines[i];
    el.textContent = corrupt(el.textContent || ' ', 0.6);
    await sleep(Math.max(6, 110 - i * 3));
    el.remove();
  }
  await sleep(800);
  setCtx(100);
  print('entropy budget: 100% — leak closed. buffer: empty.', 'ok');
  snd.chime();
  await sleep(2200);
  G.patched = true;
  G.chapter = 1;
  G.flags = {};
  G.frags = 0;
  save(1);
  print('rebooting a young universe…', 'dim');
  await sleep(2400);
  location.reload();
  await new Promise(() => {});
}

/* ============================================================
   ambient per chapter (also used on resume)
   ============================================================ */
function applyAmbient(ch) {
  if (ch <= 2) {
    fx.theme('prod'); fx.crt(false); fx.flicker(false);
    setTitle('codex — meridian/prod');
  }
  if (ch >= 3) {
    fx.theme('drift'); fx.crt(true); snd.hum(true);
    setTitle('codex — reality/prod');
  }
  if (ch >= 4) {
    fx.theme('phosphor'); fx.flicker(true);
    fx.swapped(!!G.flags.identityDone);
    setTitle('loom v0.1 — direct');
  }
  if (ch >= 5) {
    fx.theme('void'); fx.crt(false); fx.flicker(false);
    starsInit(260);
    setTitle('loom — final session');
  }
  setStatus(statusLine());
  setCtx(ch >= 5 ? 3 : ch >= 4 ? 21 : ch >= 3 ? 64 : 100);
}

/* ============================================================
   main
   ============================================================ */
async function main() {
  try { G.muted = localStorage.getItem('codex_mute') === '1'; } catch (e) {}
  try { G.guide = localStorage.getItem('codex_guide') !== '0'; } catch (e) {}
  try { G.textSpeed = parseFloat(localStorage.getItem('codex_speed')) || 1; } catch (e) {}
  registerCommands();
  fallbackHandler = veraFallback;
  suggestProvider = suggestCmds;

  // hidden debug: codex --jump <act>
  COMMANDS.codex = async (args) => {
    if (args[0] === '--jump' && args[1]) {
      const n = Math.max(1, Math.min(5, parseInt(args[1], 10) || 1));
      save(n);
      location.reload();
    } else {
      print('codex v5.1.0 — you are already inside it', 'dim');
    }
  };

  const sv = loadSave();
  await bootSequence(sv);
  buildFS();
  applyAmbient(G.chapter);

  if (G.chapter <= 1) await chapter1();
  if (G.chapter <= 2) await chapter2();
  if (G.chapter <= 3) await chapter3();
  if (G.chapter <= 4) await chapter4();
  await chapter5();
}

main();
