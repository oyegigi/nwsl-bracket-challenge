/* NWSL 2026 Bracket Challenge: all of the site's logic lives in this file. */
(() => {
  'use strict';

  const CFG = window.BRACKET_CONFIG || {};
  const DEMO = !CFG.apiUrl;

  // ---------- The tournament ----------
  const TEAMS = {
    GFC: { name: 'Gotham FC',         emoji: '🗽', seed: 1, bg: '#151515', fg: '#ffffff', ring: '#9BD9EA' },
    SEA: { name: 'Seattle Reign',     emoji: '👑', seed: 8, bg: '#1B2A55', fg: '#ffffff', ring: '#E3B23C' },
    KC:  { name: 'KC Current',        emoji: '⚡', seed: 4, bg: '#0F7A78', fg: '#ffffff', ring: '#EF4E4E' },
    LA:  { name: 'Angel City',        emoji: '😇', seed: 5, bg: '#F4A6B7', fg: '#1a1a1a', ring: '#1a1a1a' },
    SD:  { name: 'San Diego Wave',    emoji: '🌊', seed: 2, bg: '#0B3A60', fg: '#ffffff', ring: '#F26B5B' },
    UTA: { name: 'Utah Royals',       emoji: '🏔️', seed: 7, bg: '#F6B21B', fg: '#13274B', ring: '#13274B' },
    WAS: { name: 'Washington Spirit', emoji: '🦅', seed: 3, bg: '#222222', fg: '#ffffff', ring: '#E0263A' },
    POR: { name: 'Portland Thorns',   emoji: '🌹', seed: 6, bg: '#9E1B32', fg: '#ffffff', ring: '#111111' },
  };
  const TEAM_CODES = Object.keys(TEAMS);

  // Winners advance without reseeding: qf1/qf2 winners meet, qf3/qf4 winners meet.
  // These ids never change; the labels are renumbered by kickoff time (see orderGames).
  const GAMES = [
    { id: 'qf1', round: 'qf', label: 'Quarterfinal 1', teams: ['GFC', 'SEA'] },
    { id: 'qf2', round: 'qf', label: 'Quarterfinal 2', teams: ['KC', 'LA'] },
    { id: 'qf3', round: 'qf', label: 'Quarterfinal 3', teams: ['SD', 'UTA'] },
    { id: 'qf4', round: 'qf', label: 'Quarterfinal 4', teams: ['WAS', 'POR'] },
    { id: 'sf1', round: 'sf', label: 'Semifinal 1', from: ['qf1', 'qf2'] },
    { id: 'sf2', round: 'sf', label: 'Semifinal 2', from: ['qf3', 'qf4'] },
    { id: 'final', round: 'final', label: 'Championship', from: ['sf1', 'sf2'] },
  ];
  const GAME = Object.fromEntries(GAMES.map(g => [g.id, g]));
  const POINTS = { qf: 1, sf: 2, final: 4 };
  const ROUNDS = [
    { id: 'qf', name: 'Quarterfinals' },
    { id: 'sf', name: 'Semifinals' },
    { id: 'final', name: 'Championship' },
  ];
  const MAX_POINTS = 12;

  // Used in demo mode. The live site reads kickoff times from the Google Sheet.
  const DEFAULT_KICKOFFS = {
    qf1: '2026-11-08T17:30:00Z', // Sun Nov 8, 12:30 PM ET
    qf2: '2026-11-07T17:00:00Z', // Sat Nov 7, 12:00 PM ET
    qf3: '2026-11-07T03:00:00Z', // Fri Nov 6, 10:00 PM ET
    qf4: '2026-11-08T20:00:00Z', // Sun Nov 8, 3:00 PM ET
    sf1: '2026-11-13T17:00:00Z', // placeholder: update when announced
    sf2: '2026-11-13T17:00:00Z', // placeholder: update when announced
    final: '2026-11-21T17:00:00Z', // Sat Nov 21, time TBA
  };

  const AVATARS = ['⚽', '🦄', '🐯', '🦊', '🐼', '🐸', '🦖', '🐙', '🦋', '🌈', '🚀', '⭐', '🍕', '🐶', '🐱', '🦁'];
  // Different from the avatars, since avatars show on the leaderboard for everyone to see.
  const SECRETS = ['🍎', '🍩', '🎈', '🌵', '🍦', '🎸', '🐢', '🌙', '🔥', '🍉', '🎁', '🧁', '🚲', '👑', '🍀', '💎'];

  // ---------- Server rules ----------
  // The same function is in apps-script/Code.gs. Keep the two copies in sync.
  function handleRequest(db, now, body) {
    const byId = {};
    db.games.forEach(g => { byId[g.id] = g; });
    const firstKick = Math.min.apply(null, db.games.map(g => g.kickoff));
    const isLocked = id => now >= byId[id].kickoff;
    const norm = s => String(s || '').trim().replace(/\s+/g, ' ');
    const same = (a, b) => norm(a).toLowerCase() === norm(b).toLowerCase();
    const find = name => db.players.find(p => same(p.name, name));
    const second = p => Object.assign({}, p.original, p.second);
    const lockedOnly = picks => {
      const out = {};
      Object.keys(picks).forEach(id => { if (byId[id] && isLocked(id)) out[id] = picks[id]; });
      return out;
    };
    const err = (code, message) => ({ result: { ok: false, error: code, message: message }, player: null });
    const secretOf = b => String(b.secret || '').trim().slice(0, 8);
    // Your secret emoji gets you in on any device. Older players without one use the key saved on their first device.
    const canUse = (p, b) => p.secret ? secretOf(b) === p.secret : !!p.key && String(b.key || '') === p.key;
    const state = (name, b) => {
      const p = name ? find(name) : null;
      const mine = p && canUse(p, b) ? p : null;
      return {
        ok: true,
        now: now,
        games: db.games.map(g => ({ id: g.id, kickoff: g.kickoff, winner: g.winner || '' })),
        players: db.players.map(q => ({
          name: q.name,
          avatar: q.avatar,
          hasOriginal: Object.keys(q.original).length > 0,
          hasSecret: !!q.secret,
          open: !q.key && !q.secret,
          original: now >= firstKick ? q.original : {},
          second: lockedOnly(second(q)),
        })),
        me: mine ? { name: mine.name, avatar: mine.avatar, hasSecret: !!mine.secret, original: mine.original, second: second(mine) } : null,
      };
    };

    if (body.action === 'state') {
      // Players without a secret emoji yet (or ones the organizer reset) pick one here.
      const p = body.name ? find(body.name) : null;
      if (p && !p.secret && secretOf(body) && (!p.key || String(body.key || '') === p.key)) {
        p.secret = secretOf(body);
        p.updated = now;
        return { result: state(p.name, body), player: p };
      }
      return { result: state(body.name, body), player: null };
    }
    if (body.action !== 'save') return err('BAD_REQUEST', 'Unknown request.');

    const name = norm(body.name);
    if (!name || name.length > 20) return err('BAD_NAME', 'Names need between 1 and 20 letters.');
    let p = find(name);
    if (p && (p.secret || p.key) && !canUse(p, body)) {
      return err('WRONG_SECRET', 'That’s not the secret emoji for "' + p.name + '". If you’re someone else, try adding your last initial!');
    }
    if (!(p && p.secret) && !secretOf(body) && !(p && p.key)) return err('NO_SECRET', 'Pick a secret emoji first.');
    const picksIn = body.picks || {};
    let original = p ? p.original : {};
    let secondPicks = p ? p.second : {};

    if (body.kind === 'original') {
      if (now >= firstKick) return err('LOCKED', 'The first game has started, so this bracket is locked. Try Second Chance!');
      original = {};
      for (let i = 0; i < GAMES.length; i++) {
        const g = GAMES[i];
        const teams = g.teams || g.from.map(f => original[f]);
        if (teams.indexOf(picksIn[g.id]) < 0) return err('INCOMPLETE', 'Please pick a winner for every game.');
        original[g.id] = picksIn[g.id];
      }
    } else if (body.kind === 'second') {
      if (now < firstKick) return err('NOT_OPEN', 'Second Chance opens when the first game kicks off.');
      const current = Object.assign({}, original, secondPicks);
      secondPicks = {};
      GAMES.forEach(g => {
        if (isLocked(g.id)) {
          if (current[g.id]) secondPicks[g.id] = current[g.id];
        } else if (TEAM_CODES.indexOf(picksIn[g.id]) >= 0) {
          secondPicks[g.id] = picksIn[g.id];
        }
      });
    } else {
      return err('BAD_REQUEST', 'Unknown bracket.');
    }

    const avatar = String(body.avatar || '').slice(0, 8) || (p && p.avatar) || '⚽';
    if (!p) {
      p = { name: name, key: '' };
      db.players.push(p);
    }
    p.secret = p.secret || secretOf(body);
    p.avatar = avatar;
    p.original = original;
    p.second = secondPicks;
    p.updated = now;
    return { result: state(p.name, body), player: p };
  }

  // ---------- Storage that never throws ----------
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* private mode */ } },
  };

  // ---------- Demo backend (only when config.js has no apiUrl) ----------
  const Demo = {
    DB: 'bc-demo-db',
    NOW: 'bc-demo-now',
    read() {
      try {
        const db = JSON.parse(store.get(this.DB));
        if (db && db.games && db.players) return db;
      } catch (e) { /* fall through */ }
      return {
        games: GAMES.map(g => ({ id: g.id, kickoff: Date.parse(DEFAULT_KICKOFFS[g.id]), winner: '' })),
        players: [],
      };
    },
    write(db) { store.set(this.DB, JSON.stringify(db)); },
    now() { return Number(store.get(this.NOW)) || Date.now(); },
    handle(body) {
      const db = this.read();
      const out = handleRequest(db, this.now(), body);
      if (out.player) this.write(db);
      // Pretend to be a little slow, like the real Google Sheet.
      return new Promise(r => setTimeout(() => r(JSON.parse(JSON.stringify(out.result))), 250));
    },
  };

  async function call(body) {
    if (DEMO) return Demo.handle(body);
    const res = await fetch(CFG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  // ---------- People playing on this device ----------
  const PROFILES = DEMO ? 'bc-demo-profiles' : 'bc-profiles';
  let profiles = (() => {
    try {
      const v = JSON.parse(store.get(PROFILES));
      if (v && Array.isArray(v.list)) return v;
    } catch (e) { /* fall through */ }
    return { current: null, list: [] };
  })();
  const saveProfiles = () => store.set(PROFILES, JSON.stringify(profiles));
  const currentProfile = () => profiles.list.find(p => p.name === profiles.current) || null;
  const sameName = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

  // ---------- App state ----------
  const S = {
    games: Object.fromEntries(GAMES.map(g => [g.id, { kickoff: Date.parse(DEFAULT_KICKOFFS[g.id]), winner: '' }])),
    players: [],
    offset: 0,          // server clock minus this device's clock
    loaded: false,
    error: '',
    me: null,
    view: 'mine',
    boardKind: 'original',
    draft: null,        // { picks, step } while making the original bracket
    second: null,       // second-chance picks being edited
    secondDirty: false,
    joining: false,
    joinName: '',
    joinAvatar: AVATARS[0],
    joinError: '',
    joinSecret: '',
    checking: false,    // checking a secret emoji on the join screen
    modal: null,        // player name whose bracket is open
    saving: false,
    busy: false,        // fetching the latest scoreboard
    teamSort: 'points', // column the Teams comparison table is sorted by
    team: null,         // team shown on the Teams page
  };

  const now = () => Date.now() + S.offset;
  const firstKick = () => Math.min(...GAMES.map(g => S.games[g.id].kickoff));
  const originalLocked = () => now() >= firstKick();
  const isLocked = id => now() >= S.games[id].kickoff;
  const winnerOf = id => S.games[id].winner || '';

  function teamsFor(id, picks, useResults) {
    const g = GAME[id];
    if (g.teams) return g.teams;
    return g.from.map(f => (useResults && winnerOf(f)) || picks[f] || null);
  }

  // Drops picks for teams that can no longer be in a game.
  function prune(picks, useResults, keepLocked) {
    const out = { ...picks };
    GAMES.forEach(g => {
      if (!out[g.id] || (keepLocked && isLocked(g.id))) return;
      if (!teamsFor(g.id, out, useResults).includes(out[g.id])) delete out[g.id];
    });
    return out;
  }

  function eliminated() {
    const out = new Set();
    GAMES.forEach(g => {
      const w = winnerOf(g.id);
      if (w) teamsFor(g.id, {}, true).forEach(t => { if (t && t !== w) out.add(t); });
    });
    return out;
  }

  function score(picks) {
    return GAMES.reduce((sum, g) => sum + (winnerOf(g.id) && picks[g.id] === winnerOf(g.id) ? POINTS[g.round] : 0), 0);
  }

  function possible(picks) {
    const out = eliminated();
    return score(picks) + GAMES.reduce((sum, g) =>
      sum + (!winnerOf(g.id) && picks[g.id] && !out.has(picks[g.id]) ? POINTS[g.round] : 0), 0);
  }

  // ---------- Helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const teamStyle = code => {
    const t = TEAMS[code];
    return `--team-bg:${t.bg};--team-fg:${t.fg};--team-ring:${t.ring}`;
  };
  const fmtTime = ms => new Date(ms).toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  function untilText(ms) {
    let s = Math.max(0, Math.floor((ms - now()) / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d) return `${d} day${d > 1 ? 's' : ''}, ${h} hour${h === 1 ? '' : 's'}`;
    if (h) return `${h} hour${h > 1 ? 's' : ''}, ${m} min`;
    return `${m} min`;
  }
  const pts = n => `${n} point${n === 1 ? '' : 's'}`;

  function badge(code, size) {
    if (!code) return `<span class="badge badge-empty ${size || ''}">?</span>`;
    return `<span class="badge ${size || ''}" style="${teamStyle(code)}" aria-hidden="true">${TEAMS[code].emoji}</span>`;
  }

  let toastTimer;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
  }

  function confetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bits = ['🎉', '⚽', '⭐', '🏆', '🎊', '💜'];
    for (let i = 0; i < 36; i++) {
      const s = document.createElement('span');
      s.className = 'confetti';
      s.textContent = bits[i % bits.length];
      s.style.left = Math.random() * 100 + 'vw';
      s.style.animationDelay = Math.random() * 0.6 + 's';
      s.style.fontSize = 18 + Math.random() * 22 + 'px';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 3500);
    }
  }

  // Number games in the order they're played, so Quarterfinal 1 is the first kickoff.
  function orderGames() {
    const rank = { qf: 0, sf: 1, final: 2 };
    // Ties (like placeholder semifinal times) go to the game whose earlier games start first.
    const feed = g => g.teams ? S.games[g.id].kickoff : Math.min(...g.from.map(f => feed(GAME[f])));
    GAMES.sort((a, b) => rank[a.round] - rank[b.round] || S.games[a.id].kickoff - S.games[b.id].kickoff ||
      feed(a) - feed(b) || a.id.localeCompare(b.id));
    ['qf', 'sf'].forEach(r => GAMES.filter(g => g.round === r).forEach((g, i) => {
      g.label = `${r === 'qf' ? 'Quarterfinal' : 'Semifinal'} ${i + 1}`;
    }));
  }

  // ---------- Talking to the scoreboard ----------
  const auth = prof => prof ? { name: prof.name, key: prof.key, secret: prof.secret } : {};

  function applyState(st) {
    if (!st || !st.ok) throw new Error((st && st.message) || 'Bad response');
    S.offset = Number(st.now) - Date.now();
    st.games.forEach(g => { if (S.games[g.id]) S.games[g.id] = { kickoff: Number(g.kickoff), winner: g.winner || '' }; });
    orderGames();
    S.players = st.players || [];
    const prof = currentProfile();
    if (st.me && prof) {
      S.me = st.me;
      prof.avatar = st.me.avatar;
      saveProfiles();
    } else if (prof) {
      S.me = { name: prof.name, avatar: prof.avatar, original: {}, second: {}, isNew: true };
    } else {
      S.me = null;
    }
    if (!S.secondDirty) S.second = null;
    if (S.draft && originalLocked()) S.draft = null;
  }

  async function load() {
    const prof = currentProfile();
    S.busy = true;
    // Background refreshes only re-render the leaderboard, so typing elsewhere isn't interrupted.
    if (S.loaded && S.view === 'board') render();
    try {
      applyState(await call({ action: 'state', ...auth(prof) }));
      S.error = '';
    } catch (e) {
      S.error = 'We couldn’t reach the scoreboard. Check your internet and try again.';
    }
    S.busy = false;
    S.loaded = true;
    render();
  }

  async function save(kind, picks) {
    const prof = currentProfile();
    if (!prof) return false;
    S.saving = true;
    render();
    try {
      const st = await call({ action: 'save', kind, picks, avatar: prof.avatar, ...auth(prof) });
      if (!st.ok) {
        toast(st.message || 'Something went wrong. Try again!');
        return false;
      }
      if (kind === 'second') S.secondDirty = false;
      applyState(st);
      return true;
    } catch (e) {
      toast('Could not save. Check your internet and try again.');
      return false;
    } finally {
      S.saving = false;
      render();
    }
  }

  // ---------- Views ----------
  function render() {
    const root = document.getElementById('app');
    if (!S.loaded) {
      const prof = currentProfile();
      root.innerHTML = `<div class="loading" role="status">
        <span class="spin" aria-hidden="true">⚽</span>
        <p>${prof ? `Getting ${esc(prof.name)}’s picks…` : 'Loading…'}</p>
      </div>`;
      return;
    }
    const prof = currentProfile();
    let body;
    // The leaderboard, teams and rules are open to anyone; picking needs a name.
    if (S.error) body = viewError();
    else if (S.view === 'board') body = viewBoard();
    else if (S.view === 'teams') body = viewTeams();
    else if (S.view === 'rules') body = viewRules();
    else if (!prof || S.joining) body = viewWelcome();
    else if (S.me && S.me.hasSecret === false) body = viewPickSecret();
    else if (S.view === 'second') body = viewSecond();
    else body = viewMine();

    root.innerHTML = `
      <header class="top">
        <div class="brand">
          <span class="brand-cup" aria-hidden="true">🏆</span>
          <div>
            <h1>NWSL Bracket Challenge</h1>
            <p class="brand-sub">2026 Playoffs</p>
          </div>
        </div>
        ${prof && !S.joining ? `
          <button class="who" data-action="switch-player" aria-label="Switch player">
            <span class="who-avatar">${esc(prof.avatar)}</span>
            <span class="who-name">${esc(prof.name)}</span>
            <span class="who-switch">switch</span>
          </button>` : PUBLIC_VIEWS.includes(S.view) ? `
          <button class="btn primary small" data-action="nav" data-view="mine">Play ⚽</button>` : ''}
      </header>
      ${S.error ? '' : nav()}
      <main class="main">${body}</main>
      ${S.modal ? viewModal() : ''}
    `;
  }

  function nav() {
    const tabs = [
      ['mine', '📝', 'My Bracket'],
      ['second', '🔁', 'Second Chance'],
      ['board', '🏅', 'Leaderboard', 'Leaders'],
      ['teams', '📊', 'Teams'],
      ['rules', '❓', 'How to Play'],
    ];
    return `<nav class="tabs" aria-label="Sections">${tabs.map(([id, icon, label, shortLabel]) => `
      <button class="tab ${S.view === id ? 'active' : ''}" data-action="nav" data-view="${id}" ${S.view === id ? 'aria-current="page"' : ''}>
        <span class="tab-icon" aria-hidden="true">${icon}</span><span class="tab-label">${shortLabel ? `<span class="long">${label}</span><span class="short">${shortLabel}</span>` : label}</span>
      </button>`).join('')}</nav>`;
  }

  function viewError() {
    return `<section class="card center">
      <div class="huge" aria-hidden="true">🙈</div>
      <h2>Uh oh!</h2>
      <p>${esc(S.error)}</p>
      <button class="btn primary" data-action="retry">Try again</button>
    </section>`;
  }

  function viewWelcome() {
    const list = profiles.list;
    const showForm = S.joining || !list.length;
    return `
      <section class="card center hero">
        <div class="huge" aria-hidden="true">⚽🏆⚽</div>
        <h2>Who will win the 2026 NWSL Championship?</h2>
        <p>Pick the winner of every playoff game and see who gets the most points!</p>
        <button class="btn secondary" data-action="nav" data-view="board">🏅 Just looking? See the leaderboard</button>
      </section>
      ${list.length ? `
        <section class="card">
          <h2>Who’s playing?</h2>
          <div class="profile-list">
            ${list.map(p => `
              <button class="profile" data-action="pick-profile" data-name="${esc(p.name)}">
                <span class="profile-avatar">${esc(p.avatar)}</span>${esc(p.name)}
              </button>`).join('')}
            ${showForm ? '' : `<button class="profile add" data-action="new-player"><span class="profile-avatar">➕</span>Someone new</button>`}
          </div>
        </section>` : ''}
      ${showForm ? `
        <form class="card" data-form="join" autocomplete="off">
          <h2>${list.length ? 'Add a player' : 'Let’s get you playing!'}</h2>
          <p class="hint">Already playing on another phone or computer? Type the same name and tap your secret emoji.</p>
          <label class="field-label" for="join-name">What’s your name?</label>
          <input id="join-name" class="input" name="name" maxlength="20" value="${esc(S.joinName)}" placeholder="Type your name" enterkeyhint="done">
          <p class="hint">Your first name is great. Add a last initial if someone has the same name.</p>
          <p class="field-label">Pick your emoji:</p>
          <p class="hint">It shows up next to your name on the leaderboard.</p>
          ${emojiGrid(AVATARS, S.joinAvatar, 'avatar', 'Pick your emoji')}
          <p class="field-label">Pick your secret emoji 🤫</p>
          <p class="hint">Remember it and don’t tell! You’ll tap it to play on another phone or computer.</p>
          ${emojiGrid(SECRETS, S.joinSecret, 'join-secret', 'Pick your secret emoji')}
          ${S.joinError ? `<p class="form-error" role="alert">${esc(S.joinError)}</p>` : ''}
          <div class="row">
            <button class="btn primary big" type="submit" ${S.checking ? 'disabled' : ''}>${S.checking ? '<span class="spin" aria-hidden="true">⚽</span> Checking…' : 'Let’s go! 🚀'}</button>
            ${list.length ? `<button class="btn ghost" type="button" data-action="cancel-join">Cancel</button>` : ''}
          </div>
        </form>` : ''}
    `;
  }

  function emojiGrid(list, current, action, label) {
    return `<div class="avatar-grid" role="radiogroup" aria-label="${label}">
      ${list.map(a => `
        <button type="button" class="avatar ${a === current ? 'on' : ''}" role="radio" aria-checked="${a === current}" data-action="${action}" data-emoji="${a}">${a}</button>`).join('')}
    </div>`;
  }

  // Players who joined before secret emojis existed pick one, once.
  function viewPickSecret() {
    return `<section class="card">
      <h2>Hi ${esc(S.me.name)}! Pick a secret emoji 🤫</h2>
      <p>Now you can play on any phone or computer. Just type your name and tap your secret emoji.</p>
      <p class="hint">Remember it and don’t tell anyone!</p>
      ${emojiGrid(SECRETS, S.joinSecret, 'join-secret', 'Pick your secret emoji')}
      <div class="row">
        <button class="btn primary big" data-action="set-secret" ${!S.joinSecret || S.checking ? 'disabled' : ''}>${S.checking ? '<span class="spin" aria-hidden="true">⚽</span> Saving…' : 'Save my secret emoji'}</button>
      </div>
    </section>`;
  }

  // A reminder, tucked away so it isn't on screen for everyone to see.
  function secretReminder() {
    const prof = currentProfile();
    if (!prof || !prof.secret) return '';
    return `<details class="card secret-note">
      <summary>📱 Play on another phone or computer</summary>
      <p>Type <strong>${esc(prof.name)}</strong> and tap your secret emoji: <span class="secret-emoji">${esc(prof.secret)}</span></p>
    </details>`;
  }

  function lockBanner() {
    if (originalLocked()) return '';
    return `<div class="banner">⏰ Picks lock in <strong>${untilText(firstKick())}</strong>
      <span class="banner-sub">${fmtTime(firstKick())}, when the first game starts</span></div>`;
  }

  function viewMine() {
    const me = S.me;
    if (S.draft) return viewWizard();
    const has = Object.keys(me.original || {}).length > 0;

    if (!has && !originalLocked()) {
      return `${lockBanner()}
        <section class="card center">
          <div class="huge" aria-hidden="true">📝</div>
          <h2>Hi ${esc(me.name)}! Ready to make your picks?</h2>
          <p>There are 7 games. Just tap who you think will win each one.</p>
          <button class="btn primary big" data-action="start-picks">Make my picks! 🏆</button>
        </section>
        ${secretReminder()}`;
    }
    if (!has) {
      return `<section class="card center">
          <div class="huge" aria-hidden="true">⏰</div>
          <h2>The first bracket is locked</h2>
          <p>The games have started, so it’s too late for a first bracket. But you can still play <strong>Second Chance</strong>!</p>
          <button class="btn primary big" data-action="nav" data-view="second">Play Second Chance 🔁</button>
        </section>
        ${secretReminder()}`;
    }

    const champ = me.original.final;
    const decided = GAMES.some(g => winnerOf(g.id));
    return `${lockBanner()}
      <section class="card champ-card" style="${teamStyle(champ)}">
        <p class="eyebrow">Your champion</p>
        <div class="champ">${badge(champ, 'xl')}<span>${esc(TEAMS[champ].name)}</span></div>
        ${eliminated().has(champ) ? '<p class="champ-note">Knocked out, but there are still points to win!</p>' : ''}
      </section>
      ${decided ? scoreStrip(me.original) : ''}
      ${originalLocked() ? '' : `
        <div class="row center-row">
          <button class="btn secondary" data-action="start-picks">✏️ Change my picks</button>
        </div>`}
      ${bracket(me.original, { useResults: false })}
      ${secretReminder()}`;
  }

  function scoreStrip(picks) {
    return `<div class="score-strip">
      <div><span class="score-num">${score(picks)}</span><span class="score-lbl">points</span></div>
      <div><span class="score-num muted">${possible(picks)}</span><span class="score-lbl">still possible</span></div>
      <div><span class="score-num muted">${MAX_POINTS}</span><span class="score-lbl">max</span></div>
    </div>`;
  }

  function viewWizard() {
    const d = S.draft;
    if (d.step >= GAMES.length) return viewReview();
    const g = GAMES[d.step];
    const teams = teamsFor(g.id, d.picks, false);
    const isFinal = g.round === 'final';
    return `
      <section class="card wizard">
        <div class="dots" aria-label="Game ${d.step + 1} of ${GAMES.length}">
          ${GAMES.map((x, i) => `<span class="dot ${i < d.step ? 'done' : ''} ${i === d.step ? 'now' : ''}"></span>`).join('')}
        </div>
        <p class="eyebrow">Game ${d.step + 1} of ${GAMES.length} · ${esc(g.label)} · worth ${pts(POINTS[g.round])}</p>
        <h2 class="wizard-q">${isFinal ? 'Who will be the CHAMPION? 🏆' : 'Who will win?'}</h2>
        <div class="versus">
          ${bigTeam(teams[0], d.picks[g.id])}
          <span class="vs" aria-hidden="true">VS</span>
          ${bigTeam(teams[1], d.picks[g.id])}
        </div>
        <p class="when">${fmtTime(S.games[g.id].kickoff)}${g.round !== 'qf' ? ' (time may change)' : ''}</p>
        <div class="row spread">
          <button class="btn ghost" data-action="wizard-back">← ${d.step ? 'Back' : 'Cancel'}</button>
          ${d.picks[g.id] ? `<button class="btn ghost" data-action="wizard-next">Next →</button>` : ''}
        </div>
      </section>`;
  }

  function bigTeam(code, picked) {
    const t = TEAMS[code];
    return `<button class="big-team ${picked === code ? 'on' : ''}" style="${teamStyle(code)}" data-action="wizard-pick" data-team="${code}">
      <span class="big-emoji" aria-hidden="true">${t.emoji}</span>
      <span class="big-name">${esc(t.name)}</span>
      <span class="big-seed">#${t.seed} seed</span>
      ${picked === code ? '<span class="big-check" aria-hidden="true">✓</span>' : ''}
    </button>`;
  }

  function viewReview() {
    const p = S.draft.picks;
    return `
      <section class="card center champ-card" style="${teamStyle(p.final)}">
        <p class="eyebrow">Your champion</p>
        <div class="champ">${badge(p.final, 'xl')}<span>${esc(TEAMS[p.final].name)}</span></div>
      </section>
      <section class="card center">
        <h2>Look good? 👀</h2>
        <p>Tap any game below to change it. When you’re happy, send your picks!</p>
        <button class="btn primary big" data-action="send-picks" ${S.saving ? 'disabled' : ''}>
          ${S.saving ? 'Sending…' : 'Send my picks! 🚀'}
        </button>
      </section>
      ${bracket(p, { useResults: false, editStep: true })}`;
  }

  function viewSecond() {
    if (!originalLocked()) {
      return `<section class="card center">
        <div class="huge" aria-hidden="true">🔁</div>
        <h2>Second Chance opens soon!</h2>
        <p>When the first game kicks off (<strong>${fmtTime(firstKick())}</strong>), you’ll get a second bracket.</p>
        <p>Then, before each game starts, you can change your pick for that game. It’s a separate score, so your first bracket stays exactly the same.</p>
        <button class="btn secondary" data-action="nav" data-view="mine">Go to my bracket</button>
      </section>`;
    }
    if (!S.second) S.second = prune({ ...S.me.second }, true, true);
    const picks = S.second;
    const open = GAMES.filter(g => !isLocked(g.id));
    const next = open.length ? Math.min(...open.map(g => S.games[g.id].kickoff)) : null;
    const missing = open.filter(g => {
      const t = teamsFor(g.id, picks, true);
      return t[0] && t[1] && !picks[g.id];
    });

    return `
      <section class="card intro">
        <h2>🔁 Second Chance</h2>
        <p>Now that you know who won, you can change your picks for games that haven’t started yet. This is a separate score!</p>
        ${next ? `<p class="hint">Next game starts in <strong>${untilText(next)}</strong>.</p>` : '<p class="hint">All the games have started. No more changes!</p>'}
      </section>
      ${scoreStrip(picks)}
      ${missing.length ? `<div class="banner warn">👉 Tap a team to pick the winner of ${missing.length === 1 ? 'the game' : `${missing.length} games`} marked “Pick one!”</div>` : ''}
      ${bracket(picks, { useResults: true, interactive: true })}
      ${S.secondDirty ? `
        <div class="save-bar">
          <span>You have changes!</span>
          <button class="btn primary" data-action="save-second" ${S.saving ? 'disabled' : ''}>${S.saving ? 'Saving…' : 'Save my changes ✓'}</button>
        </div>` : ''}`;
  }

  // One card per game, grouped by round.
  function bracket(picks, opts) {
    return ROUNDS.map(r => `
      <section class="round">
        <h3 class="round-title">${r.name} <span class="round-pts">${pts(POINTS[r.id])} each</span></h3>
        <div class="round-games ${r.id}">
          ${GAMES.filter(g => g.round === r.id).map(g => matchCard(g, picks, opts)).join('')}
        </div>
      </section>`).join('');
  }

  function matchCard(g, picks, opts) {
    const teams = teamsFor(g.id, picks, opts.useResults);
    const w = winnerOf(g.id);
    const pick = picks[g.id];
    const locked = isLocked(g.id);
    const canPick = opts.interactive && !locked && teams[0] && teams[1];
    const hidden = opts.hidden && opts.hidden(g.id);

    let status = '';
    if (hidden) status = '<span class="mark wait">🔒 secret until kickoff</span>';
    else if (w && pick) status = pick === w ? `<span class="mark good">✓ +${POINTS[g.round]}</span>` : '<span class="mark bad">✗ 0</span>';
    else if (w) status = '<span class="mark bad">No pick</span>';
    else if (locked) status = '<span class="mark wait">⏳ Waiting for result</span>';
    else if (canPick && !pick) status = '<span class="mark todo">Pick one!</span>';
    else if (opts.interactive && !locked) status = '<span class="mark open">Can change</span>';

    const rows = teams.map((t, i) => {
      if (!t) {
        const from = GAME[g.from[i]];
        return `<div class="team-row empty"><span class="badge badge-empty">?</span><span class="team-name">Winner of ${esc(from.label)}</span></div>`;
      }
      const cls = [
        'team-row',
        !hidden && t === pick ? 'picked' : '',
        w && t === w ? 'won' : '',
        w && t !== w && teams.includes(w) ? 'lost' : '',
      ].join(' ');
      const inner = `${badge(t)}<span class="team-name">${esc(TEAMS[t].name)}</span>
        ${!hidden && t === pick ? '<span class="pick-tag">your pick</span>' : ''}
        ${w && t === w ? '<span class="win-tag" title="Won">🏆</span>' : ''}`;
      return canPick
        ? `<button class="${cls} tappable" style="${teamStyle(t)}" data-action="second-pick" data-game="${g.id}" data-team="${t}" aria-pressed="${t === pick}">${inner}</button>`
        : `<div class="${cls}" style="${teamStyle(t)}">${inner}</div>`;
    }).join('');

    const realWinner = w && !teams.includes(w)
      ? `<p class="real">Real winner: ${badge(w, 'sm')} ${esc(TEAMS[w].name)}</p>` : '';
    const tag = opts.editStep ? 'button' : 'article';
    const extra = opts.editStep ? `data-action="wizard-goto" data-step="${GAMES.indexOf(g)}" aria-label="Change ${esc(g.label)}"` : '';

    return `<${tag} class="match ${opts.editStep ? 'editable' : ''}" ${extra}>
      <div class="match-head"><span>${esc(g.label)}</span><span class="match-when">${fmtTime(S.games[g.id].kickoff)}</span></div>
      ${rows}
      ${realWinner}
      ${status ? `<div class="match-foot">${status}</div>` : ''}
    </${tag}>`;
  }

  function standings(kind) {
    const rows = S.players
      .filter(p => kind === 'original' ? p.hasOriginal : true)
      .map(p => {
        const picks = kind === 'original' ? p.original : p.second;
        return { p, picks, pts: score(picks), max: possible(picks) };
      })
      .sort((a, b) => b.pts - a.pts || b.max - a.max || a.p.name.localeCompare(b.p.name));
    rows.forEach((r, i) => { r.rank = i && rows[i - 1].pts === r.pts ? rows[i - 1].rank : i + 1; });
    return rows;
  }

  function viewBoard() {
    const kind = S.boardKind;
    const locked = originalLocked();
    const rows = standings(kind);
    const out = eliminated();
    const me = currentProfile();
    const medal = r => (['🥇', '🥈', '🥉'][r - 1] || r);
    const done = GAMES.filter(g => winnerOf(g.id)).length;

    const results = GAMES.filter(g => winnerOf(g.id)).map(g => {
      const w = winnerOf(g.id);
      const loser = teamsFor(g.id, {}, true).find(t => t && t !== w);
      return `<li>${badge(w, 'sm')} <strong>${esc(TEAMS[w].name)}</strong> beat ${loser ? esc(TEAMS[loser].name) : '…'} <span class="muted">· ${esc(g.label)}</span></li>`;
    }).join('');

    return `
      <div class="seg" role="tablist">
        <button class="seg-btn ${kind === 'original' ? 'on' : ''}" role="tab" aria-selected="${kind === 'original'}" data-action="board-kind" data-kind="original">📝 First Bracket</button>
        <button class="seg-btn ${kind === 'second' ? 'on' : ''}" role="tab" aria-selected="${kind === 'second'}" data-action="board-kind" data-kind="second">🔁 Second Chance</button>
      </div>
      <section class="card board">
        <div class="row spread">
          <h2>${kind === 'original' ? 'First Bracket' : 'Second Chance'} standings</h2>
          <button class="btn ghost small" data-action="refresh" ${S.busy ? 'disabled aria-busy="true"' : ''}>
            ${S.busy ? '<span class="spin" aria-hidden="true">⚽</span> Updating…' : '↻ Refresh'}
          </button>
        </div>
        <p class="hint">${done} of ${GAMES.length} games played · ${MAX_POINTS} points max</p>
        ${!rows.length ? `<p class="empty-note">${kind === 'second' && !locked ? 'Second Chance starts when the first game kicks off.' : 'Nobody has made picks yet. Be the first!'}</p>` : `
        <ol class="ranks">
          ${rows.map(r => {
            const champ = r.picks.final;
            return `<li>
              <button class="rank-row ${me && sameName(me.name, r.p.name) ? 'me' : ''}" data-action="show-player" data-name="${esc(r.p.name)}">
                <span class="rank">${medal(r.rank)}</span>
                <span class="rank-avatar" aria-hidden="true">${esc(r.p.avatar)}</span>
                <span class="rank-name">${esc(r.p.name)}</span>
                <span class="rank-champ" title="Champion pick">${champ ? `<span class="${out.has(champ) ? 'out' : ''}">${badge(champ, 'sm')}</span>` : (locked ? '' : '🔒')}</span>
                <span class="rank-pts"><strong>${r.pts}</strong><small>${r.pts === 1 ? 'pt' : 'pts'}</small></span>
              </button>
            </li>`;
          }).join('')}
        </ol>
        <p class="hint">${locked ? 'Tap a name to see their picks.' : 'Everyone’s picks stay secret until the first game starts. 🤫'}</p>`}
      </section>
      ${results ? `<section class="card"><h2>Real results so far</h2><ul class="results">${results}</ul></section>` : ''}`;
  }

  function viewModal() {
    const p = S.players.find(x => sameName(x.name, S.modal));
    if (!p) return '';
    const kind = S.boardKind;
    const picks = kind === 'original' ? p.original : p.second;
    const hidden = id => kind === 'original' ? !originalLocked() : !isLocked(id);
    return `<div class="modal-back" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(p.name)}’s picks" data-stop>
        <div class="row spread modal-head">
          <h2>${esc(p.avatar)} ${esc(p.name)}</h2>
          <button class="btn ghost small" data-action="close-modal" aria-label="Close">✕</button>
        </div>
        <p class="hint">${kind === 'original' ? 'First Bracket' : 'Second Chance'} · ${score(picks)} points</p>
        ${bracket(picks, { useResults: kind === 'second', hidden })}
      </div>
    </div>`;
  }

  // ---------- Teams page ----------
  const INFO = window.TEAM_INFO || { teams: {} };
  const SEEDED = TEAM_CODES.filter(c => INFO.teams[c]).sort((a, b) => TEAMS[a].seed - TEAMS[b].seed);
  const diff = t => t.scored - t.allowed;
  const signed = n => (n > 0 ? '+' : '') + n;
  const short = c => (INFO.teams[c] && INFO.teams[c].short) || TEAMS[c].name;
  const TEAM_COLS = [
    ['seed', 'Seed', c => TEAMS[c].seed, true],
    ['points', 'Points', c => INFO.teams[c].points],
    ['won', 'Wins', c => INFO.teams[c].won],
    ['tied', 'Ties', c => INFO.teams[c].tied],
    ['lost', 'Losses', c => INFO.teams[c].lost, true],
    ['scored', 'Goals scored', c => INFO.teams[c].scored],
    ['allowed', 'Goals let in', c => INFO.teams[c].allowed, true],
    ['diff', 'Goal difference', c => diff(INFO.teams[c])],
  ];
  const GD_HELP = 'Goals scored minus goals let in. Bigger is better!';

  // Teams that share the best value, e.g. two teams tied for most goals.
  function leaders(get, low) {
    const best = (low ? Math.min : Math.max)(...SEEDED.map(get));
    return SEEDED.filter(c => get(c) === best);
  }
  const names = codes => codes.map(c => esc(TEAMS[c].name)).join(' and ');

  // The quarterfinal each team plays first.
  function firstGame(code) {
    const g = GAMES.find(x => x.teams && x.teams.includes(code));
    const other = g.teams.find(t => t !== code);
    return `${esc(g.label)} vs ${esc(TEAMS[other].name)} · ${fmtTime(S.games[g.id].kickoff)}`;
  }

  // Start on the team you picked to win it all, or the top seed.
  function shownTeam() {
    if (INFO.teams[S.team]) return S.team;
    const champ = S.me && S.me.original && S.me.original.final;
    return INFO.teams[champ] ? champ : SEEDED[0];
  }

  function teamCard(code) {
    const t = INFO.teams[code], team = TEAMS[code];
    const w = winnerOf(GAMES.find(x => x.teams && x.teams.includes(code)).id);
    return `<article class="card team-card" id="team-card" aria-live="polite">
      <header class="team-band" style="${teamStyle(code)}">
        <span class="badge lg" aria-hidden="true">${team.emoji}</span>
        <div>
          <h3>${esc(team.name)}</h3>
          <p>#${team.seed} seed · ${esc(t.home)}</p>
        </div>
      </header>
      <div class="team-body">
        <p class="star-stat"><span aria-hidden="true">⭐</span> <span><strong>Star stat:</strong> ${esc(t.star)}</span></p>
        <div class="record" aria-label="${t.won} wins, ${t.tied} ties, ${t.lost} losses">
          <div class="rec won"><span class="stat-num">${t.won}</span><span class="stat-lbl">Wins</span></div>
          <div class="rec tied"><span class="stat-num">${t.tied}</span><span class="stat-lbl">Ties</span></div>
          <div class="rec lost"><span class="stat-num">${t.lost}</span><span class="stat-lbl">Losses</span></div>
        </div>
        <div class="stat-grid">
          <div><span class="stat-num">${t.points}</span><span class="stat-lbl">Points</span></div>
          <div><span class="stat-num">${team.seed}</span><span class="stat-lbl">Playoff seed</span></div>
          <div><span class="stat-num">${t.scored}</span><span class="stat-lbl">Goals scored</span></div>
          <div><span class="stat-num">${t.allowed}</span><span class="stat-lbl">Goals let in</span></div>
          <div class="wide">
            <span class="stat-num">${signed(diff(t))}</span>
            <details class="gd-help"><summary>Goal difference <span aria-hidden="true">ⓘ</span><span class="sr-only">: what’s that?</span></summary><p>${GD_HELP}</p></details>
          </div>
        </div>
        ${t.lastPlace ? `<p class="stat-group-label">Last year (2025)</p>
        <div class="stat-grid stat-grid-2">
          <div><span class="stat-num">${esc(t.lastPlace)}</span><span class="stat-lbl">Place (out of 14 teams)</span></div>
          <div>
            <span class="stat-num small">${t.lastPlayoffs && t.lastPlayoffs.icon ? `<span aria-hidden="true">${esc(t.lastPlayoffs.icon)}</span> ` : ''}${esc(t.lastPlayoffs ? t.lastPlayoffs.text : '')}</span>
            <span class="stat-lbl">Playoffs</span>
          </div>
        </div>` : ''}
        ${t.watch && t.watch.length ? `<h4><span aria-hidden="true">👀</span> Players to watch</h4>
          <ul class="watch">${t.watch.map(([n, why]) => `<li><strong>${esc(n)}</strong><span>${esc(why)}</span></li>`).join('')}</ul>` : ''}
        ${t.facts && t.facts.length ? `<h4><span aria-hidden="true">💡</span> Did you know?</h4>
          <ul class="facts">${t.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
        ${t.cheer ? `<h4><span aria-hidden="true">📣</span> Why cheer for them?</h4><p>${esc(t.cheer)}</p>` : ''}
        <p class="team-next"><strong>${w ? (w === code ? '✓ Won' : '✗ Lost') : 'First game'}:</strong> ${firstGame(code)}</p>
        ${t.video ? `<a class="btn secondary small video-btn" href="${esc(t.video[1])}" target="_blank" rel="noopener"><span aria-hidden="true">▶</span> ${esc(t.video[0])}</a>` : ''}
      </div>
    </article>`;
  }

  function compareTable() {
    const col = TEAM_COLS.find(c => c[0] === S.teamSort) || TEAM_COLS[1];
    const rows = [...SEEDED].sort((a, b) => (col[3] ? col[2](a) - col[2](b) : col[2](b) - col[2](a)) || TEAMS[a].seed - TEAMS[b].seed);
    return `<div class="table-wrap">
      <table class="compare">
        <thead><tr><th scope="col" class="cmp-head">Team</th>${TEAM_COLS.map(([id, label]) => `
          <th scope="col" aria-sort="${id === col[0] ? (col[3] ? 'ascending' : 'descending') : 'none'}">
            <button data-action="team-sort" data-col="${id}" class="${id === col[0] ? 'on' : ''}">${label}${id === col[0] ? ' ▾' : ''}</button>
          </th>`).join('')}</tr></thead>
        <tbody>${rows.map(c => `<tr>
          <th scope="row"><span class="cmp-team">${badge(c, 'sm')} ${esc(short(c))}</span></th>
          ${TEAM_COLS.map(([id, , get]) => `<td class="${id === col[0] ? 'on' : ''}">${id === 'diff' ? signed(get(c)) : get(c)}</td>`).join('')}
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
  }

  function viewTeams() {
    if (!SEEDED.length) return `<section class="card"><h2>Team info is coming soon!</h2></section>`;
    const T = c => INFO.teams[c];
    const cur = shownTeam();
    const quick = [
      `<span aria-hidden="true">⚽</span> <strong>Most goals:</strong> ${names(leaders(c => T(c).scored))} (${Math.max(...SEEDED.map(c => T(c).scored))})`,
      `<span aria-hidden="true">🧤</span> <strong>Best defense:</strong> ${names(leaders(c => T(c).allowed, true))} (only ${Math.min(...SEEDED.map(c => T(c).allowed))} goals let in)`,
      `<span aria-hidden="true">➕</span> <strong>Best goal difference:</strong> ${names(leaders(c => diff(T(c))))} (${signed(Math.max(...SEEDED.map(c => diff(T(c)))))})`,
      ...(INFO.extraFacts || []).map(esc),
    ];
    return `
      <section class="card intro">
        <h2><span aria-hidden="true">📊</span> Meet the teams</h2>
        ${(INFO.bigPicture || []).map(f => `<p>${esc(f)}</p>`).join('')}
        <p class="field-label">Tap a team to see its stats:</p>
        <div class="team-picker" role="group" aria-label="Pick a team">
          ${SEEDED.map(c => `<button class="pick-chip ${c === cur ? 'on' : ''}" data-action="pick-team" data-team="${c}" aria-pressed="${c === cur}">
            ${badge(c)}<span>${esc(short(c))}</span></button>`).join('')}
        </div>
        <button class="btn ghost small" data-action="jump-compare">📊 Compare all teams ↓</button>
      </section>
      ${teamCard(cur)}
      <section class="card" id="compare">
        <h2>Compare all teams</h2>
        <p class="hint">Tap a column to sort by it.<span class="swipe-hint"> Swipe sideways to see more.</span></p>
        ${compareTable()}
        <p class="hint"><strong>Goal difference:</strong> ${GD_HELP}</p>
        <h3 class="sub-head">Quick stat facts</h3>
        <ul class="facts plain">${quick.map(f => `<li>${f}</li>`).join('')}</ul>
        ${INFO.seasonNote ? `<p class="hint">${esc(INFO.seasonNote)}</p>` : ''}
      </section>`;
  }

  function viewRules() {
    const sched = GAMES.map(g => {
      const t = g.teams ? `${TEAMS[g.teams[0]].emoji} ${esc(TEAMS[g.teams[0]].name)} vs ${TEAMS[g.teams[1]].emoji} ${esc(TEAMS[g.teams[1]].name)}`
        : `Winner of ${esc(GAME[g.from[0]].label)} vs winner of ${esc(GAME[g.from[1]].label)}`;
      return `<li><strong>${esc(g.label)}</strong> · ${fmtTime(S.games[g.id].kickoff)}<br><span class="muted">${t}</span></li>`;
    }).join('');
    return `
      <section class="card rules">
        <h2>How to play</h2>
        <ol class="steps">
          <li><span class="step-ico">👆</span><div><strong>Pick a winner for every game.</strong> There are 7 games: 4 quarterfinals, 2 semifinals and the championship.</div></li>
          <li><span class="step-ico">⏰</span><div><strong>Finish before the first game.</strong> Picks lock on <strong>${fmtTime(firstKick())}</strong>.</div></li>
          <li><span class="step-ico">⭐</span><div><strong>Get points for right answers.</strong>
            <div class="point-table">
              <span>Quarterfinal</span><strong>1 point</strong>
              <span>Semifinal</span><strong>2 points</strong>
              <span>Champion</span><strong>4 points</strong>
            </div>
            The most you can get is ${MAX_POINTS} points.</div></li>
          <li><span class="step-ico">🔁</span><div><strong>Get a Second Chance!</strong> Once the games start, you get a second bracket. Before each game kicks off, you can change your pick for that game. It has its own score and its own leaderboard, so your first bracket never changes.</div></li>
        </ol>
      </section>
      <section class="card">
        <h2>Game schedule</h2>
        <ul class="sched">${sched}</ul>
        <p class="hint">Times are shown in your time zone. Semifinal and final times may change once the league announces them.</p>
      </section>`;
  }

  // ---------- Actions ----------
  function setSecondPick(id, team) {
    S.second = prune({ ...S.second, [id]: team }, true, true);
    S.secondDirty = true;
  }

  // Each tab has its own address (e.g. .../#leaderboard), so refreshing stays put.
  const HASHES = { mine: '', second: '#second-chance', board: '#leaderboard', teams: '#teams', rules: '#how-to-play' };
  const PUBLIC_VIEWS = ['board', 'teams', 'rules'];
  const viewFromHash = () => Object.keys(HASHES).find(v => HASHES[v] && HASHES[v] === location.hash) || 'mine';
  function setHash() {
    try { history.replaceState(null, '', location.pathname + location.search + HASHES[S.view]); } catch (e) { /* ignore */ }
  }

  const actions = {
    retry() { S.error = ''; S.loaded = false; render(); load(); },
    nav(el) {
      S.view = el.dataset.view;
      S.draft = S.view === 'mine' ? S.draft : null;
      setHash(); render(); window.scrollTo(0, 0);
      if (S.view === 'board') load();
    },
    'switch-player'() {
      if (S.secondDirty && !confirm('You have unsaved Second Chance changes. Switch anyway?')) return;
      S.joining = false; S.joinError = ''; S.draft = null; S.second = null; S.secondDirty = false;
      profiles.current = null; saveProfiles(); S.me = null; render();
    },
    'pick-profile'(el) {
      profiles.current = el.dataset.name; saveProfiles();
      S.view = 'mine'; S.joining = false; S.second = null; S.secondDirty = false;
      const p = currentProfile();
      S.me = { name: p.name, avatar: p.avatar, original: {}, second: {}, isNew: true };
      S.loaded = false; render(); load();
    },
    'new-player'() { S.joining = true; S.joinName = ''; S.joinSecret = ''; S.joinError = ''; render(); focusName(); },
    'cancel-join'() { S.joining = false; S.joinError = ''; render(); },
    avatar(el) { S.joinAvatar = el.dataset.emoji; render(); },
    'join-secret'(el) { S.joinSecret = el.dataset.emoji; S.joinError = ''; render(); },
    async 'set-secret'() {
      const prof = currentProfile();
      S.checking = true; render();
      try {
        const st = await call({ action: 'state', ...auth(prof), secret: S.joinSecret });
        if (st.me && st.me.hasSecret) {
          prof.secret = S.joinSecret; saveProfiles();
          applyState(st);
          toast('Secret emoji saved! 🤫');
        } else {
          toast('Something went wrong. Try again!');
        }
      } catch (e) {
        toast('Could not save. Check your internet and try again.');
      }
      S.checking = false; S.joinSecret = ''; render();
    },
    'start-picks'() {
      S.draft = { picks: { ...(S.me.original || {}) }, step: 0 };
      render(); window.scrollTo(0, 0);
    },
    'wizard-pick'(el) {
      const g = GAMES[S.draft.step];
      S.draft.picks = prune({ ...S.draft.picks, [g.id]: el.dataset.team }, false);
      S.draft.step++;
      render(); window.scrollTo(0, 0);
    },
    'wizard-next'() { S.draft.step++; render(); },
    'wizard-back'() {
      if (S.draft.step === 0) S.draft = null; else S.draft.step--;
      render();
    },
    'wizard-goto'(el) { S.draft.step = Number(el.dataset.step); render(); window.scrollTo(0, 0); },
    async 'send-picks'() {
      if (await save('original', S.draft.picks)) {
        S.draft = null;
        render();
        confetti();
        toast('Your picks are in! Good luck! 🍀');
        window.scrollTo(0, 0);
      }
    },
    'second-pick'(el) { setSecondPick(el.dataset.game, el.dataset.team); render(); },
    async 'save-second'() {
      if (await save('second', S.second)) toast('Second Chance picks saved! ✓');
    },
    'board-kind'(el) { S.boardKind = el.dataset.kind; render(); },
    'show-player'(el) {
      if (!originalLocked()) { toast('Picks are secret until the first game starts! 🤫'); return; }
      S.modal = el.dataset.name; render();
    },
    'close-modal'() { S.modal = null; render(); },
    'team-sort'(el) {
      S.teamSort = el.dataset.col; render();
      // On phones the table scrolls sideways; keep the sorted column in view.
      const wrap = document.querySelector('.table-wrap'), th = wrap && wrap.querySelector('thead th[aria-sort="ascending"], thead th[aria-sort="descending"]');
      if (th) wrap.scrollLeft = Math.max(0, th.offsetLeft - wrap.querySelector('thead th').offsetWidth - 8);
    },
    'pick-team'(el) { S.team = el.dataset.team; render(); },
    'jump-compare'() {
      const el = document.getElementById('compare'), tabs = document.querySelector('.tabs');
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - (tabs ? tabs.offsetHeight + 16 : 0));
    },
    refresh() { load(); },
  };

  async function join() {
    const name = S.joinName.trim().replace(/\s+/g, ' ');
    if (!name) { S.joinError = 'Type your name first!'; return render(); }
    if (!S.joinSecret) { S.joinError = 'Tap a secret emoji!'; return render(); }
    const secret = S.joinSecret;
    const taken = S.players.find(p => sameName(p.name, name));
    const local = profiles.list.find(p => sameName(p.name, name));

    if (taken && !taken.hasSecret && !taken.open && !local) {
      S.joinError = `“${taken.name}” hasn’t picked a secret emoji yet. Open the site on the phone or computer you used first, or ask the organizer to reset your name. If you’re someone else, add your last initial, like “${name} B.”`;
      return render();
    }
    if (taken) {
      // Already playing somewhere: the secret emoji (or this device, for older players) has to match.
      S.checking = true; S.joinError = ''; render();
      let st;
      try {
        st = await call({ action: 'state', name: taken.name, key: local && local.key, secret });
      } catch (e) {
        st = null;
      }
      S.checking = false;
      if (!st || !st.ok) { toast('We couldn’t reach the scoreboard. Try again!'); return render(); }
      if (!st.me) {
        S.joinError = `That’s not the secret emoji for “${taken.name}.” Try again! If you’re someone else, add your last initial, like “${name} B.”`;
        return render();
      }
      const prof = local || { name: taken.name };
      if (!local) profiles.list.push(prof);
      prof.name = taken.name; prof.avatar = st.me.avatar; prof.secret = secret;
      profiles.current = prof.name; saveProfiles();
      S.joining = false; S.joinName = ''; S.joinSecret = ''; S.view = 'mine';
      S.second = null; S.secondDirty = false; S.draft = null;
      applyState(st);
      setHash(); render();
      toast(`Welcome back, ${prof.name}! 👋`);
      return;
    }

    // Someone new.
    const prof = local || { name };
    if (!local) profiles.list.push(prof);
    prof.avatar = S.joinAvatar; prof.secret = secret;
    profiles.current = prof.name; saveProfiles();
    S.joining = false; S.joinError = ''; S.joinName = ''; S.joinSecret = ''; S.view = 'mine';
    S.me = { name: prof.name, avatar: prof.avatar, original: {}, second: {}, isNew: true };
    if (!originalLocked()) S.draft = { picks: {}, step: 0 };
    setHash();
    render();
  }

  function focusName() {
    const el = document.getElementById('join-name');
    if (el) el.focus();
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    // Clicks inside the modal shouldn't close it via the backdrop.
    if (el.dataset.action === 'close-modal' && el.classList.contains('modal-back') && e.target.closest('[data-stop]')) return;
    const fn = actions[el.dataset.action];
    if (fn && !el.disabled) { e.preventDefault(); fn(el); }
  });
  document.addEventListener('submit', e => {
    if (e.target.dataset.form === 'join') { e.preventDefault(); join(); }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'join-name') S.joinName = e.target.value;
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && S.modal) { S.modal = null; render(); }
  });

  // Keep countdowns and locks fresh without wiping out typing.
  setInterval(() => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (S.view === 'teams') return; // nothing ticking there, and re-rendering would close an open ⓘ
    render();
  }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.loaded) load(); });

  // ---------- Demo panel ----------
  function renderDemo() {
    const el = document.getElementById('demo');
    if (!DEMO) { el.remove(); return; }
    const db = Demo.read();
    const fakeNow = Number(store.get(Demo.NOW)) || 0;
    const presets = [
      ['', 'Real time right now'],
      ['2026-11-05T17:00:00Z', 'Before any games (Thu Nov 5)'],
      ['2026-11-07T23:00:00Z', 'During quarterfinals (Sat Nov 7)'],
      ['2026-11-10T17:00:00Z', 'After quarterfinals (Tue Nov 10)'],
      ['2026-11-17T17:00:00Z', 'After semifinals (Tue Nov 17)'],
      ['2026-11-22T17:00:00Z', 'After the final (Sun Nov 22)'],
    ];
    const curPreset = presets.find(p => p[0] && Date.parse(p[0]) === fakeNow);
    el.innerHTML = `<details class="demo" ${store.get('bc-demo-open') ? 'open' : ''}>
      <summary>🧪 Demo mode: test it out</summary>
      <p>Nothing here is shared with anyone. Once you paste your Google Sheet link into <code>config.js</code>, this panel goes away.</p>
      <label class="demo-row">Pretend it’s:
        <select data-demo="time">${presets.map(([v, l]) => `<option value="${v}" ${(curPreset ? curPreset[0] : '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </label>
      <p class="demo-label">Game winners (this is what you’ll type in the Google Sheet):</p>
      <div class="demo-grid">${db.games.map(g => `
        <label>${esc(GAME[g.id].label)}
          <select data-demo="winner" data-game="${g.id}">
            <option value="">(not played)</option>
            ${TEAM_CODES.map(c => `<option value="${c}" ${g.winner === c ? 'selected' : ''}>${TEAMS[c].name}</option>`).join('')}
          </select>
        </label>`).join('')}
      </div>
      <div class="row">
        <button class="btn small secondary" data-demo-action="fill">Add 5 pretend players</button>
        <button class="btn small ghost" data-demo-action="reset">Reset demo</button>
      </div>
    </details>`;
  }

  if (DEMO) {
    document.addEventListener('toggle', e => {
      if (e.target.classList && e.target.classList.contains('demo')) {
        if (e.target.open) store.set('bc-demo-open', '1'); else store.del('bc-demo-open');
      }
    }, true);
    document.addEventListener('change', e => {
      const kind = e.target.dataset.demo;
      if (!kind) return;
      if (kind === 'time') {
        if (e.target.value) store.set(Demo.NOW, String(Date.parse(e.target.value))); else store.del(Demo.NOW);
      } else {
        const db = Demo.read();
        db.games.find(g => g.id === e.target.dataset.game).winner = e.target.value;
        Demo.write(db);
      }
      S.secondDirty = false;
      S.second = null;
      load();
    });
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-demo-action]');
      if (!el) return;
      if (el.dataset.demoAction === 'reset') {
        if (!confirm('Erase all demo players and picks?')) return;
        store.del(Demo.DB); store.del(Demo.NOW); store.del(PROFILES);
        profiles = { current: null, list: [] };
        S.draft = null; S.second = null; S.secondDirty = false;
      } else {
        const db = Demo.read();
        const names = [['Grandma', '🐼'], ['Uncle Ray', '🦖'], ['Zoe', '🦄'], ['Leo', '🦁'], ['Aunt Kim', '🌈']];
        names.forEach(([name, avatar]) => {
          if (db.players.some(p => sameName(p.name, name))) return;
          const picks = {};
          GAMES.forEach(g => {
            const t = g.teams || g.from.map(f => picks[f]);
            picks[g.id] = t[Math.random() < 0.5 ? 0 : 1];
          });
          db.players.push({ name, avatar, key: '', secret: SECRETS[0], original: picks, second: {}, updated: Date.now() });
        });
        Demo.write(db);
        toast('Added 5 pretend players.');
      }
      renderDemo();
      load();
    });
  }

  orderGames();
  S.view = viewFromHash();
  window.addEventListener('hashchange', () => { S.view = viewFromHash(); S.draft = null; render(); });
  renderDemo();
  load();
})();
