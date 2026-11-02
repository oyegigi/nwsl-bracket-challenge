/**
 * NWSL 2026 Bracket Challenge: Google Sheets backend.
 *
 * Setup (full steps in README.md):
 *   1. In your Google Sheet: Extensions > Apps Script, paste this whole file.
 *   2. Choose "setup" in the function menu and click Run (once).
 *   3. Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
 *   4. Copy the Web app URL into config.js.
 *
 * Day to day: type each game's winner into the "Games" tab. That's it.
 */

const TEAM_CODES = ['GFC', 'SEA', 'KC', 'LA', 'SD', 'UTA', 'WAS', 'POR'];
const TEAM_NAMES = {
  GFC: 'Gotham FC', SEA: 'Seattle Reign', KC: 'KC Current', LA: 'Angel City',
  SD: 'San Diego Wave', UTA: 'Utah Royals', WAS: 'Washington Spirit', POR: 'Portland Thorns',
};
const GAMES = [
  { id: 'qf1', round: 'qf', label: 'Quarterfinal 1', teams: ['GFC', 'SEA'] },
  { id: 'qf2', round: 'qf', label: 'Quarterfinal 2', teams: ['KC', 'LA'] },
  { id: 'qf3', round: 'qf', label: 'Quarterfinal 3', teams: ['SD', 'UTA'] },
  { id: 'qf4', round: 'qf', label: 'Quarterfinal 4', teams: ['WAS', 'POR'] },
  { id: 'sf1', round: 'sf', label: 'Semifinal 1', from: ['qf1', 'qf2'] },
  { id: 'sf2', round: 'sf', label: 'Semifinal 2', from: ['qf3', 'qf4'] },
  { id: 'final', round: 'final', label: 'Championship', from: ['sf1', 'sf2'] },
];
const DEFAULT_KICKOFFS = {
  qf1: '2026-11-08T17:30:00Z',
  qf2: '2026-11-07T17:00:00Z',
  qf3: '2026-11-07T03:00:00Z',
  qf4: '2026-11-08T20:00:00Z',
  sf1: '2026-11-13T17:00:00Z',
  sf2: '2026-11-13T17:00:00Z',
  final: '2026-11-21T17:00:00Z',
};
const MATCHUPS = {
  qf1: 'Gotham FC (GFC) vs Seattle Reign (SEA)',
  qf2: 'KC Current (KC) vs Angel City (LA)',
  qf3: 'San Diego Wave (SD) vs Utah Royals (UTA)',
  qf4: 'Washington Spirit (WAS) vs Portland Thorns (POR)',
  sf1: 'Winner of QF1 vs winner of QF2',
  sf2: 'Winner of QF3 vs winner of QF4',
  final: 'Winner of SF1 vs winner of SF2',
};
const PLAYER_HEADERS = ['Name', 'Avatar', 'Champion pick', 'First bracket', 'Second Chance', 'Last saved', 'Device key (clear to let them use a new device)'];

// ---------- One-time setup ----------
function setup() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone('America/New_York');

  let games = ss.getSheetByName('Games');
  if (!games) {
    games = ss.insertSheet('Games');
    games.getRange(1, 1, 1, 5)
      .setValues([['Game', 'Matchup', 'Kickoff (Eastern time)', 'Winner (pick from the list)', 'Notes']])
      .setFontWeight('bold').setBackground('#ECE7FF');
    games.getRange(2, 1, GAMES.length, 4).setValues(GAMES.map(g => [g.id, MATCHUPS[g.id], new Date(DEFAULT_KICKOFFS[g.id]), '']));
    games.getRange(6, 5, 3, 1).setValues([['Placeholder time: update when the league announces it'], ['Placeholder time: update when the league announces it'], ['Time TBA: update when announced']]);
    games.getRange(2, 3, GAMES.length, 1).setNumberFormat('ddd mmm d, yyyy h:mm am/pm');
    games.getRange(2, 4, GAMES.length, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(TEAM_CODES, true).setAllowInvalid(false).build());
    games.setFrozenRows(1);
    games.autoResizeColumns(1, 5);
  }

  let players = ss.getSheetByName('Players');
  if (!players) {
    players = ss.insertSheet('Players');
    players.getRange(1, 1, 1, PLAYER_HEADERS.length).setValues([PLAYER_HEADERS]).setFontWeight('bold').setBackground('#ECE7FF');
    players.setFrozenRows(1);
  }

  const blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 2 && blank.getLastRow() === 0) ss.deleteSheet(blank);
}

// ---------- Web app ----------
function doGet() {
  return respond(run({ action: 'state' }));
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return respond({ ok: false, error: 'BAD_REQUEST', message: 'Bad request.' });
  }
  return respond(run(body));
}

function run(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const db = readDb();
    const out = handleRequest(db, Date.now(), body);
    if (out.player) writePlayer(out.player);
    return out.result;
  } catch (err) {
    return { ok: false, error: 'SERVER', message: 'The scoreboard had a hiccup. Please try again.' };
  } finally {
    lock.releaseLock();
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- Reading and writing the sheet ----------
function readDb() {
  const ss = SpreadsheetApp.getActive();
  const gameRows = ss.getSheetByName('Games').getRange(2, 1, GAMES.length, 4).getValues();
  const games = GAMES.map(g => {
    const row = gameRows.find(r => String(r[0]).trim() === g.id);
    const raw = row ? row[2] : DEFAULT_KICKOFFS[g.id];
    const kickoff = raw instanceof Date ? raw.getTime() : Date.parse(raw) || Date.parse(DEFAULT_KICKOFFS[g.id]);
    const winner = row ? String(row[3]).trim().toUpperCase() : '';
    return { id: g.id, kickoff: kickoff, winner: TEAM_CODES.indexOf(winner) >= 0 ? winner : '' };
  });

  const sheet = ss.getSheetByName('Players');
  const last = sheet.getLastRow();
  const rows = last > 1 ? sheet.getRange(2, 1, last - 1, PLAYER_HEADERS.length).getValues() : [];
  const players = [];
  rows.forEach((r, i) => {
    if (!String(r[0]).trim()) return;
    players.push({
      row: i + 2,
      name: String(r[0]).trim(),
      avatar: String(r[1] || '⚽'),
      original: parsePicks(r[3]),
      second: parsePicks(r[4]),
      key: String(r[6] || ''),
    });
  });
  return { games: games, players: players };
}

function parsePicks(v) {
  try {
    const o = JSON.parse(v || '{}');
    return o && typeof o === 'object' ? o : {};
  } catch (err) {
    return {};
  }
}

function writePlayer(p) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Players');
  const champ = p.original && p.original.final ? TEAM_NAMES[p.original.final] : '';
  const values = [[p.name, p.avatar, champ, JSON.stringify(p.original || {}), JSON.stringify(p.second || {}), new Date(p.updated), p.key]];
  if (p.row) {
    sheet.getRange(p.row, 1, 1, values[0].length).setValues(values);
  } else {
    sheet.appendRow(values[0]);
  }
}

// ---------- Rules ----------
// Same function as in app.js. Keep the two copies in sync.
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
  const state = (name, key) => {
    const p = name ? find(name) : null;
    const mine = p && p.key && p.key === key ? p : null;
    return {
      ok: true,
      now: now,
      games: db.games.map(g => ({ id: g.id, kickoff: g.kickoff, winner: g.winner || '' })),
      players: db.players.map(q => ({
        name: q.name,
        avatar: q.avatar,
        hasOriginal: Object.keys(q.original).length > 0,
        open: !q.key,
        original: now >= firstKick ? q.original : {},
        second: lockedOnly(second(q)),
      })),
      me: mine ? { name: mine.name, avatar: mine.avatar, original: mine.original, second: second(mine) } : null,
    };
  };

  if (body.action === 'state') {
    // A name the organizer reset (blank device key) goes to the next device that asks for it.
    const p = body.name ? find(body.name) : null;
    if (p && !p.key && String(body.key || '').length >= 8) {
      p.key = String(body.key);
      p.updated = now;
      return { result: state(p.name, p.key), player: p };
    }
    return { result: state(body.name, body.key), player: null };
  }
  if (body.action !== 'save') return err('BAD_REQUEST', 'Unknown request.');

  const name = norm(body.name);
  const key = String(body.key || '');
  if (!name || name.length > 20) return err('BAD_NAME', 'Names need between 1 and 20 letters.');
  if (key.length < 8) return err('BAD_REQUEST', 'Missing device key.');
  let p = find(name);
  if (p && p.key && p.key !== key) {
    return err('NAME_TAKEN', 'Someone is already playing as "' + p.name + '". Try adding your last initial!');
  }
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
    p = { name: name, key: key };
    db.players.push(p);
  }
  p.key = key;
  p.avatar = avatar;
  p.original = original;
  p.second = secondPicks;
  p.updated = now;
  return { result: state(p.name, key), player: p };
}
