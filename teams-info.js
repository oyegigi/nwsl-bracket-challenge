// Team facts for the Teams page. Edit freely: the page reads everything from here.
// short: name used in the team picker and table. lastPlace / lastPlayoffs: the 2025 season. cheer: the "Why cheer for them?" line.
// Stats are the 2026 regular season final table (30 games each).
window.TEAM_INFO = {
  bigPicture: [
    'Eight teams made the playoffs. Lose once and you’re out!',
    'The last two teams standing play for the 2026 NWSL Championship on Nov 21 at Audi Field in Washington, D.C.',
  ],
  seasonNote: '2026 was the first season with 16 teams, so everyone played 30 games. In 2025 there were 14 teams and only 26 games, so comparing points across the two years isn’t quite fair.',
  extraFacts: [
    '🚀 Biggest glow-up: Angel City jumped from 11th last year to 5th. Utah jumped from 12th to 7th.',
    '📉 Biggest drop: KC Current went from 1st last year to 4th.',
    '😬 Tiebreaker drama: Utah and Seattle both finished with 47 points. Utah got 7th because of goal difference.',
  ],
  teams: {
    GFC: {
      home: 'New Jersey & New York',
      short: 'Gotham',
      lastPlace: '8th', lastPlayoffs: { icon: '🏆', text: 'Champions' },
      won: 18, tied: 7, lost: 5, points: 61, scored: 39, allowed: 23,
      star: 'Club-record 61 points and their first-ever Shield',
      facts: [
        'They won the Shield, which goes to the team with the best regular season.',
        'Their 61 points broke the club record of 56 from 2024.',
        'Last year they won the championship as the 8th seed, the lowest team in the playoffs.',
        'They get to play at home all through the playoffs.',
      ],
      watch: [
        ['Jaedyn Shaw', 'Back from injury. She scored one of the goals that clinched the Shield.'],
        ['Guro Reiten', 'Scored the other goal that clinched the Shield.'],
        ['Rose Lavelle', 'Back from injury and ready for the playoffs.'],
      ],
      cheer: 'Last year they were the underdogs. This year they’re the team everyone’s chasing.',
      video: ['Highlights: Gotham’s 2-0 win at Chicago (Apr 29)', 'https://www.gothamfc.com/news/extended-match-highlights-gotham-fc-wins-in-the-windy-city-20'],
    },
    SD: {
      home: 'San Diego, California',
      short: 'Wave',
      lastPlace: '6th', lastPlayoffs: { icon: '', text: 'Quarterfinals' },
      won: 18, tied: 4, lost: 8, points: 58, scored: 45, allowed: 31,
      star: 'Club records for wins (18) and points (58)',
      facts: [
        'They came into the playoffs without losing in their last 7 games.',
        'Mimi Van Zanten scored in the 9th minute on the last day of the season to lock up 2nd place.',
      ],
      watch: [
        ['Dudinha', 'A 21-year-old left winger who kicks with her left foot. Her birthday is the Fourth of July!'],
        ['Mimi Van Zanten', 'Scored the winner that clinched 2nd place.'],
      ],
      video: ['San Diego Wave 2026 highlights (Fox Sports)', 'https://www.foxsports.com/soccer/san-diego-wave-fc-team-highlights'],
    },
    WAS: {
      home: 'Washington, D.C.',
      short: 'Spirit',
      lastPlace: '2nd', lastPlayoffs: { icon: '🥈', text: 'Runner-up' },
      won: 17, tied: 4, lost: 9, points: 55, scored: 43, allowed: 28,
      star: 'Trinity Rodman scored her 12th goal of the season on the last day',
      facts: [
        'The championship game is at their home stadium, Audi Field!',
      ],
      watch: [
        ['Trinity Rodman', 'Scored her 12th goal of the season on the last day of the season.'],
      ],
      video: ['Washington Spirit’s best plays from September (YouTube)', 'https://www.youtube.com/watch?v=sT5QkW9KrWE'],
    },
    KC: {
      home: 'Kansas City',
      short: 'Current',
      lastPlace: '1st', lastPlayoffs: { icon: '', text: 'Quarterfinals' },
      won: 16, tied: 5, lost: 9, points: 53, scored: 54, allowed: 39,
      star: 'Never lost at home all season: 11 wins, 4 ties',
      facts: [
        'They finished the season with 5 wins in a row.',
        'They tied Angel City for the most goals in the league (54).',
      ],
      watch: [
        ['Temwa Chawinga', 'Won NWSL MVP (best player) two years in a row. She scored the first hat trick (3 goals in one game) of 2026.'],
      ],
      video: ['KC Current highlights (YouTube)', 'https://youtu.be/OL23ZgfHiaA'],
    },
    LA: {
      home: 'Los Angeles',
      short: 'Angel City',
      lastPlace: '11th', lastPlayoffs: { icon: '', text: 'Didn’t make it' },
      won: 15, tied: 7, lost: 8, points: 52, scored: 54, allowed: 32,
      star: 'Taylor Suarez scored 21 seconds after coming in, an NWSL record for a sub',
      facts: [
        'They came into the playoffs without losing in their last 10 games.',
        'Best goal difference in the league: +22.',
      ],
      watch: [
        ['Taylor Suarez', 'A rookie who scored just 21 seconds after coming off the bench. That’s the fastest ever for a sub in the NWSL!'],
        ['Ally Sentnor', 'Attacker to watch.'],
        ['Ary Borges', 'Attacker to watch.'],
        ['Angelina Anderson', 'Goalkeeper who saved a penalty kick against Gotham.'],
      ],
      video: ['Angel City highlights (YouTube)', 'https://youtu.be/k6JbxviohCs'],
    },
    POR: {
      home: 'Portland, Oregon',
      short: 'Thorns',
      lastPlace: '3rd', lastPlayoffs: { icon: '', text: 'Semifinals' },
      won: 14, tied: 8, lost: 8, points: 50, scored: 50, allowed: 41,
      star: 'Sophia Wilson scored 15 goals, 3rd most in the league',
      facts: [],
      watch: [
        ['Sophia Wilson', 'Scored 15 goals in 28 games, including 2 on the last day of the season.'],
        ['Olivia Moultrie', 'In May she was tied for the league lead in assists (passes that set up a goal).'],
      ],
      video: ['Portland Thorns highlights (YouTube)', 'https://youtu.be/ev5LAToNdrA'],
    },
    UTA: {
      home: 'Utah',
      short: 'Royals',
      lastPlace: '12th', lastPlayoffs: { icon: '', text: 'Didn’t make it' },
      won: 14, tied: 5, lost: 11, points: 47, scored: 44, allowed: 39,
      star: 'Five shutouts in a row, from April 3 to May 10',
      facts: [
        'This is their first time ever in the playoffs!',
        'A player said their superpower is that they like each other.',
      ],
      watch: [
        ['Mina Tanaka', 'Forward to watch.'],
        ['Kaleigh Riehl', 'Defender who helped get five shutouts in a row.'],
        ['Kate Del Fava', 'Defender who helped get five shutouts in a row.'],
      ],
      video: ['Utah Royals highlights (YouTube)', 'https://youtu.be/DW-vn5xhOS4'],
    },
    SEA: {
      home: 'Seattle, Washington',
      short: 'Reign',
      lastPlace: '5th', lastPlayoffs: { icon: '', text: 'Quarterfinals' },
      won: 14, tied: 5, lost: 11, points: 47, scored: 37, allowed: 33,
      star: 'A season-high crowd of 16,095 watched them clinch the last playoff spot',
      facts: [
        'This year they win with strong defense and teamwork more than lots of goals.',
      ],
      watch: [
        ['Jordyn Bugg', 'Young center back who scored in the 68th minute to clinch a playoff spot.'],
        ['Jess Fishlock', 'Team captain, retiring after this season. The clinching game was her last regular-season home game.'],
      ],
      cheer: 'Every playoff game could be Jess Fishlock’s last. Seattle is playing for her.',
      video: ['Goal: Jess Fishlock’s 50th career goal (YouTube)', 'https://youtu.be/18SeE9MDjo4'],
    },
  },
};
