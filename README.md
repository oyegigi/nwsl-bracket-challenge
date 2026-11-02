# NWSL 2026 Bracket Challenge 🏆

A simple, kid-friendly bracket game for the 2026 NWSL Playoffs, for family and friends.

- **First Bracket:** pick all 7 games before the first kickoff (Fri Nov 6, 10 PM ET).
- **Second Chance:** after games start, re-pick any game that hasn't kicked off yet. It has its own score and leaderboard.
- **Scoring:** Quarterfinal = 1 pt, Semifinal = 2 pts, Champion = 4 pts (12 max).
- No passwords. Players pick a name and a **secret emoji**. To play on another phone or computer, they type the same name and tap the same emoji. The site remembers them after that, and several kids can share one iPad by using "switch".

The site is plain HTML/CSS/JS (no build step). Picks are stored in a Google Sheet that you own.

## Files

| File | What it is |
|---|---|
| `index.html`, `style.css`, `app.js` | The website |
| `config.js` | Where you paste your Google Sheet web-app link |
| `apps-script/Code.gs` | The code you paste into your Google Sheet |

## Step 1: Try it locally (demo mode)

While `config.js` has no link, the site runs in **demo mode**: picks are saved only in your browser, and a yellow test panel at the bottom lets you pretend it's a different day and set game winners.

```bash
python3 -m http.server 8642
```

Then open http://localhost:8642.

## Step 2: Connect the Google Sheet (about 10 minutes)

1. Create a new Google Sheet (name it something like "NWSL Bracket Challenge").
2. Click **Extensions → Apps Script**. Delete what's there, paste in all of `apps-script/Code.gs`, and click **Save** 💾.
3. In the function menu at the top (next to "Debug"), choose **setup**, then click **Run**.
   - Google will ask you to authorize. Choose your account. You'll see **"Google hasn't verified this app"**. That's expected because it's your own script: click **Advanced → Go to (project name) (unsafe) → Allow**.
   - When setup finishes, your Sheet has a **Games** tab and a **Players** tab.
4. Click **Deploy → New deployment**. Click the gear ⚙️ and choose **Web app**. Then set:
   - **Execute as:** Me
   - **Who has access:** Anyone
   - Click **Deploy**, and copy the **Web app URL** (it ends in `/exec`).
5. Paste that URL into `config.js` between the quotes for `apiUrl`.

> If you ever edit `Code.gs` later, use **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** so the link stays the same.

## Running the challenge

- **After each game:** open the **Games** tab and choose the winner from the dropdown in the **Winner** column. Scores update for everyone automatically.
- **Semifinal and final times:** the Games tab starts with placeholder times. Update the **Kickoff** cells once the league announces them, because Second Chance picks lock at kickoff.
- **Fix a typo in a name:** edit the **Name** cell in the Players tab.
- **Remove a test player:** delete their row in the Players tab.
- **Someone forgot their secret emoji:** look in the **Secret emoji** column of the Players tab and tell them.
- **Reset someone's name:** clear both their **Secret emoji** and **Device key** cells. The next person who types that name picks a new secret emoji and gets the existing picks.
- **Players who joined before secret emojis existed** are asked to pick one the next time they open the site on their first device.
- **Game numbers:** the site numbers games by kickoff time, so Quarterfinal 1 is the first game played. The Game column in the Sheet (`qf1`, `qf2`, …) keeps its original ids, so go by the Matchup column when entering winners.

## Step 3: Publish with GitHub Pages

See the steps Claude walks you through, or in short:

```bash
gh repo create nwsl-bracket-challenge --public --source=. --push
```

Then on GitHub go to **Settings → Pages**, choose **Deploy from a branch → main → / (root)**, and save. The site will be at `https://<your-username>.github.io/nwsl-bracket-challenge/`.
