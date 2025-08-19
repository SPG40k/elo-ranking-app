import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { Link, useLocation, useParams } from 'react-router-dom';

function getFactionImage(faction) {
  if (!faction) return null;
  if (faction.trim().replace(/[’']/g, '') === "Emperors Children") {
    return ["/images/Emperors Children.png"];
  }
  if (faction.trim() === "Genestealer Cult") {
    return ["/images/Genestealer Cult.png"];
  }
  const trimmed = faction.trim().replace(/\s+/g, ' ');
  const candidates = [];
  const variants = [
    trimmed,
    trimmed.replace(/'/g, "%27"),
    trimmed.replace(/'/g, ''),
    trimmed.replace(/\s/g, '_'),
    trimmed.replace(/'/g, '').replace(/\s/g, '_'),
    trimmed.toLowerCase(),
    trimmed.toLowerCase().replace(/'/g, "%27"),
    trimmed.toLowerCase().replace(/'/g, ''),
    trimmed.toLowerCase().replace(/\s/g, '_'),
    trimmed.toLowerCase().replace(/'/g, '').replace(/\s/g, '_'),
  ];
  for (const v of variants) {
    candidates.push(`/images/${v}.jpg`);
    candidates.push(`/images/${v}.png`);
  }
  return candidates;
}

function getRowGradient(score1, score2) {
  if (score1 === score2) {
    return 'bg-[linear-gradient(90deg,_rgba(191,219,254,1)_0%,_rgba(191,219,254,1)_40%,_rgba(147,197,253,1)_50%,_rgba(191,219,254,1)_60%,_rgba(191,219,254,1)_100%)] dark:bg-[linear-gradient(90deg,_rgba(30,58,138,1)_0%,_rgba(30,58,138,1)_40%,_rgba(59,130,246,1)_50%,_rgba(30,58,138,1)_60%,_rgba(30,58,138,1)_100%)]';
  }
  const leftWin = score1 > score2;
  if (leftWin) {
    return 'bg-[linear-gradient(90deg,_rgba(34,197,94,1)_0%,_rgba(220,252,231,1)_40%,_rgba(239,68,68,0.10)_60%,_rgba(239,68,68,1)_100%)] dark:bg-[linear-gradient(90deg,_rgba(34,197,94,1)_0%,_rgba(52,211,153,0.18)_40%,_rgba(239,68,68,0.10)_60%,_rgba(239,68,68,1)_100%)]';
  } else {
    return 'bg-[linear-gradient(90deg,_rgba(239,68,68,1)_0%,_rgba(239,68,68,0.10)_40%,_rgba(220,252,231,1)_60%,_rgba(34,197,94,1)_100%)] dark:bg-[linear-gradient(90deg,_rgba(239,68,68,1)_0%,_rgba(239,68,68,0.10)_40%,_rgba(52,211,153,0.18)_60%,_rgba(34,197,94,1)_100%)]';
  }
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function dateToDDMMYY(dateStr) {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

export default function EventPage() {
  const { eventSlug, eventDate, roundNum } = useParams();
  const location = useLocation();
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [factionImages, setFactionImages] = useState({});
  const [eventName, setEventName] = useState('');
  const [eventDateStr, setEventDateStr] = useState('');
  const [roundCount, setRoundCount] = useState(0);
  const [teamNames, setTeamNames] = useState({});

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // Load players
        const playersResp = await fetch(process.env.PUBLIC_URL + '/players.csv');
        const playersText = await playersResp.text();
        const parsedPlayers = Papa.parse(playersText, { header: true, skipEmptyLines: true });
        const playerMap = {};
        for (const row of parsedPlayers.data) {
          playerMap[row.id] = row.name;
        }
        setPlayers(playerMap);

        // Load team names
        const masterTeamsResp = await fetch(process.env.PUBLIC_URL + '/master_teams.csv');
        const masterTeamsText = await masterTeamsResp.text();
        const parsedTeams = Papa.parse(masterTeamsText, { header: true, skipEmptyLines: true });
        const teamMap = {};
        for (const row of parsedTeams.data) {
          if (row.id && row.name) teamMap[row.id] = row.name;
        }
        setTeamNames(teamMap);

        // Load matches from both singles and teams CSVs
        const [singlesResp, teamsResp] = await Promise.all([
          fetch(process.env.PUBLIC_URL + '/singles_matches.csv'),
          fetch(process.env.PUBLIC_URL + '/teams_matches.csv'),
        ]);
        const [singlesText, teamsText] = await Promise.all([
          singlesResp.text(),
          teamsResp.text(),
        ]);
        const singlesMatches = Papa.parse(singlesText, { header: true, skipEmptyLines: true }).data;
        const teamsMatches = Papa.parse(teamsText, { header: true, skipEmptyLines: true }).data;
        const allMatches = [...singlesMatches, ...teamsMatches];
        setMatches(allMatches);

        // Find the event name and date from the matches (search both sources)
        const eventMatch = allMatches.find(row => slugify(row.eventName) === eventSlug && dateToDDMMYY(row.date) === eventDate);
        if (eventMatch) {
          setEventName(eventMatch.eventName);
          setEventDateStr(eventMatch.date);
        }

        // Determine round count for this event instance
        const rounds = new Set();
        allMatches.forEach(row => {
          if (slugify(row.eventName) === eventSlug && dateToDDMMYY(row.date) === eventDate) {
            rounds.add(row.gameNumber);
          }
        });
        setRoundCount(rounds.size);

        // Preload faction images
        const allFactions = new Set();
        allMatches.forEach(m => {
          if (m.player1Faction) allFactions.add(m.player1Faction);
          if (m.player2Faction) allFactions.add(m.player2Faction);
        });
        const imgMap = {};
        for (const faction of allFactions) {
          const candidates = getFactionImage(faction);
          let found = false;
          for (const url of candidates) {
            try {
              await fetch(url, { method: 'HEAD' });
              imgMap[faction] = url;
              found = true;
              break;
            } catch {}
          }
          if (!found) imgMap[faction] = null;
        }
        setFactionImages(imgMap);
      } catch (e) {
        setError('Failed to load event data.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [eventSlug, eventDate]);

  // Filter matches for this event instance
  const eventMatches = matches.filter(row => slugify(row.eventName) === eventSlug && dateToDDMMYY(row.date) === eventDate);
  const filteredMatches = roundNum
    ? eventMatches.filter(row => String(row.gameNumber) === String(roundNum))
    : [];

  // Compute placings for Results page
  let placings = [];
  if (!roundNum) {
    // If teams event (all matches score1+score2==20), show team placings
    if (eventMatches.length > 0 && eventMatches.every(m => Number(m.score1) + Number(m.score2) === 20)) {
      // Group by round (gameNumber), then by team-vs-team
      const rounds = {};
      eventMatches.forEach(m => {
        const rnd = m.gameNumber;
        if (!rounds[rnd]) rounds[rnd] = [];
        rounds[rnd].push(m);
      });
      // For each round, determine which team won
      const teamStats = {};
      Object.values(rounds).forEach(roundMatches => {
        // Group by team-vs-team
        const teamPairs = {};
        roundMatches.forEach(m => {
          const key = `${m.player1team_id} vs ${m.player2team_id}`;
          if (!teamPairs[key]) teamPairs[key] = { team1: m.player1team_id, team2: m.player2team_id, score1: 0, score2: 0 };
          teamPairs[key].score1 += Number(m.score1);
          teamPairs[key].score2 += Number(m.score2);
        });
        const is8Player = isEightPlayerEvent(roundMatches);
        const totalScore = roundMatches.reduce((sum, m) => sum + Number(m.score1) + Number(m.score2), 0);
        console.log(`Round ${roundMatches[0].gameNumber} total score: ${totalScore}, is8Player: ${is8Player}`);
        // Process each unique team pairing only once per round
        const processedPairs = new Set();
        Object.values(teamPairs).forEach(pair => {
          const pairKey = `${pair.team1}-${pair.team2}`;
          if (processedPairs.has(pairKey)) return;
          processedPairs.add(pairKey);
          
          // Update stats for both teams
          if (!teamStats[pair.team1]) teamStats[pair.team1] = { id: pair.team1, name: teamNames[pair.team1] || `Team ${pair.team1}`, roundWins: 0, totalPoints: 0 };
          if (!teamStats[pair.team2]) teamStats[pair.team2] = { id: pair.team2, name: teamNames[pair.team2] || `Team ${pair.team2}`, roundWins: 0, totalPoints: 0 };
          teamStats[pair.team1].totalPoints += pair.score1;
          teamStats[pair.team2].totalPoints += pair.score2;
          
          const diff = Math.abs(pair.score1 - pair.score2);
          console.log(`Round ${roundMatches[0].gameNumber}: ${teamNames[pair.team1] || pair.team1} (${pair.score1}) vs ${teamNames[pair.team2] || pair.team2} (${pair.score2}), diff: ${diff}, is8Player: ${is8Player}`);
          if (diff <= 10) {
            // Draw, no round win
            console.log(`  -> Draw (10-point rule)`);
          } else if (pair.score1 > pair.score2) {
            teamStats[pair.team1].roundWins += 1;
            console.log(`  -> ${teamNames[pair.team1] || pair.team1} wins`);
          } else if (pair.score2 > pair.score1) {
            teamStats[pair.team2].roundWins += 1;
            console.log(`  -> ${teamNames[pair.team2] || pair.team2} wins`);
          } else {
            console.log(`  -> Draw (exact tie)`);
          }
          // Regular draws (exact tie) also get no round win
        });
      });
      console.log('Final team stats:', Object.values(teamStats).map(t => ({ name: t.name, roundWins: t.roundWins, totalPoints: t.totalPoints })));
      placings = Object.values(teamStats).sort((a, b) => b.roundWins - a.roundWins || b.totalPoints - a.totalPoints);
    } else {
      // Singles: original logic
      const playerStats = {};
      eventMatches.forEach(row => {
        if (!playerStats[row.player1_id]) playerStats[row.player1_id] = { name: players[row.player1_id] || row.player1_id, wins: 0, totalScore: 0, games: 0, factions: {} };
        playerStats[row.player1_id].totalScore += Number(row.score1);
        playerStats[row.player1_id].games += 1;
        if (Number(row.score1) > Number(row.score2)) playerStats[row.player1_id].wins += 1;
        const f1 = row.player1Faction;
        if (f1) playerStats[row.player1_id].factions[f1] = (playerStats[row.player1_id].factions[f1] || 0) + 1;
        if (!playerStats[row.player2_id]) playerStats[row.player2_id] = { name: players[row.player2_id] || row.player2_id, wins: 0, totalScore: 0, games: 0, factions: {} };
        playerStats[row.player2_id].totalScore += Number(row.score2);
        playerStats[row.player2_id].games += 1;
        if (Number(row.score2) > Number(row.score1)) playerStats[row.player2_id].wins += 1;
        const f2 = row.player2Faction;
        if (f2) playerStats[row.player2_id].factions[f2] = (playerStats[row.player2_id].factions[f2] || 0) + 1;
      });
      placings = Object.values(playerStats)
        .map(p => {
          let mainFaction = null, maxCount = 0;
          for (const [f, count] of Object.entries(p.factions)) {
            if (count > maxCount) { mainFaction = f; maxCount = count; }
          }
          return { ...p, mainFaction };
        })
        .sort((a, b) => b.wins - a.wins || b.totalScore - a.totalScore);
    }
  }

  // Navigation bar (always rendered)
  const navBar = (
    <div className="flex flex-wrap gap-2 mb-6">
      {[...Array(roundCount)].map((_, i) => {
        const roundNumNav = i + 1;
        const to = `/events/${eventSlug}/${eventDate}/round/${roundNumNav}`;
        const isActive = location.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${isActive ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100 hover:bg-indigo-200 dark:hover:bg-indigo-800'}`}
          >
            {`Round ${roundNumNav}`}
          </Link>
        );
      })}
      <Link
        to={`/events/${eventSlug}/${eventDate}`}
        className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${!roundNum && location.pathname === `/events/${eventSlug}/${eventDate}` ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100 hover:bg-indigo-200 dark:hover:bg-indigo-800'}`}
      >
        Results
      </Link>
    </div>
  );

  // Helper: is 8-player event (sum of all scores in a round is 160)
  function isEightPlayerEvent(roundMatches) {
    const total = roundMatches.reduce((sum, m) => sum + Number(m.score1) + Number(m.score2), 0);
    return total === 160;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-indigo-700 dark:text-indigo-200 mb-4">{eventName || 'Event'}</h1>
      {navBar}
      {!roundNum ? (
        <div>
          {placings.length > 0 && (
            <div className="mt-8">
              {eventMatches.length > 0 && eventMatches.every(m => Number(m.score1) + Number(m.score2) === 20) ? (
                <>
                  <h2 className="text-xl font-bold mb-3 text-indigo-700 dark:text-indigo-200">Team Placings</h2>
                  <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
                    <ol className="ml-0">
                      {placings.map((team, idx) => {
                        // Calculate team results for each round
                        const rounds = Array.from({length: roundCount}, (_, i) => i + 1);
                        const teamResults = rounds.map(rnd => {
                          // Get all matches for this round
                          const roundMatches = eventMatches.filter(row => String(row.gameNumber) === String(rnd));
                          
                          // Find the team's opponent in this round
                          const teamMatch = roundMatches.find(row => 
                            row.player1team_id === team.id || row.player2team_id === team.id
                          );
                          
                          if (!teamMatch) return null;
                          
                          // Group by team-vs-team to get aggregated scores (same logic as results)
                          const teamPairs = {};
                          roundMatches.forEach(m => {
                            const key = `${m.player1team_id} vs ${m.player2team_id}`;
                            if (!teamPairs[key]) teamPairs[key] = { team1: m.player1team_id, team2: m.player2team_id, score1: 0, score2: 0 };
                            teamPairs[key].score1 += Number(m.score1);
                            teamPairs[key].score2 += Number(m.score2);
                          });
                          
                          // Find the team's aggregated result
                          const teamPair = Object.values(teamPairs).find(pair => 
                            pair.team1 === team.id || pair.team2 === team.id
                          );
                          
                          if (!teamPair) return null;
                          
                          // Determine if this team is team1 or team2
                          const isTeam1 = teamPair.team1 === team.id;
                          const teamScore = isTeam1 ? teamPair.score1 : teamPair.score2;
                          const opponentScore = isTeam1 ? teamPair.score2 : teamPair.score1;
                          
                          // Check if this is an 8-player event (total score 160) and if it's a draw (within 10 points)
                          const totalScore = teamPair.score1 + teamPair.score2;
                          const is8Player = totalScore === 160;
                          const scoreDiff = Math.abs(teamScore - opponentScore);
                          const isDraw8Player = scoreDiff <= 10;
                          
                          // Use the same logic as the results: round wins
                          if (teamScore === opponentScore || isDraw8Player) {
                            return 'draw'; // Blue circle
                          } else if (teamScore > opponentScore) {
                            return 'win'; // Green circle
                          } else {
                            return 'loss'; // Red circle
                          }
                        });
                        
                        return (
                          <li key={team.id} className={`mb-1 flex items-center text-gray-900 dark:text-gray-100 py-2${idx < placings.length - 1 ? ' border-b border-gray-200 dark:border-gray-700' : ''}`}>
                            <span className="text-lg font-extrabold text-indigo-200 bg-indigo-800 bg-opacity-80 rounded-full px-1.5 py-0.5 shadow mr-3" style={{minWidth:'2.5rem',textAlign:'center'}}>{idx + 1}</span>
                            <span className="flex flex-col mr-2">
                              <span className="font-bold">{team.name}</span>
                              <span className="text-xs text-gray-500 mt-0.5">Game Wins: {team.roundWins}, Total Points: {team.totalPoints}</span>
                            </span>
                            <span className="flex gap-1 ml-auto">
                              {teamResults.map((result, i) => result === null ? null : (
                                <span key={i} className={`inline-block w-3 h-3 rounded-full ${
                                  result === 'win' ? 'bg-green-400' : 
                                  result === 'loss' ? 'bg-red-500' : 
                                  'bg-blue-400'
                                }`}></span>
                              ))}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold mb-3 text-indigo-700 dark:text-indigo-200">Player Placings</h2>
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    {placings.slice(0, 3).map((p, idx) => {
                      const bgUrl = p.mainFaction && factionImages[p.mainFaction] ? factionImages[p.mainFaction] : undefined;
                      const rounds = Array.from({length: roundCount}, (_, i) => i + 1);
                      const playerResults = rounds.map(rnd => {
                        const match = eventMatches.find(row => String(row.gameNumber) === String(rnd) && (row.player1_id === p.name || row.player2_id === p.name || players[row.player1_id] === p.name || players[row.player2_id] === p.name));
                        if (!match) return null;
                        let win = false;
                        if (match.player1_id === p.name || players[match.player1_id] === p.name) {
                          win = Number(match.score1) > Number(match.score2);
                        } else {
                          win = Number(match.score2) > Number(match.score1);
                        }
                        return win;
                      });
                      let podiumClass = '';
                      let podiumStyle = { width: 28, height: 28, minWidth: 28, minHeight: 28, fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' };
                      if (idx === 0) {
                        podiumClass = 'inline-flex items-center justify-center rounded-full font-bold text-white mr-3 bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-300';
                      } else if (idx === 1) {
                        podiumClass = 'inline-flex items-center justify-center rounded-full font-bold text-white mr-3 bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 bg-gradient-to-br from-gray-200 via-gray-400 to-gray-300';
                      } else if (idx === 2) {
                        podiumClass = 'inline-flex items-center justify-center rounded-full font-bold text-white mr-3 bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 bg-gradient-to-br from-amber-600 via-amber-700 to-yellow-600';
                      }
                      return (
                        <div key={p.name} className="relative rounded-xl shadow-lg overflow-hidden min-h-[45px] flex flex-col justify-end" style={{background: bgUrl ? `url('${bgUrl}') center/cover no-repeat` : '#222'}}>
                          <div className="p-2 z-10 flex items-center">
                            <span className={podiumClass} style={podiumStyle}>{idx + 1}</span>
                            <span className="flex flex-col mr-2">
                              <Link to={`/player/${p.id || Object.keys(players).find(pid => players[pid] === p.name) || ''}`} className="hover:underline">
                                <span className="text-base font-bold text-white drop-shadow">{p.name}</span>
                              </Link>
                            </span>
                            <span className="absolute bottom-2 right-3 flex gap-1">
                              {playerResults.map((win, i) => win === null ? null : (
                                <span key={i} className={`inline-block w-3 h-3 rounded-full ${win ? 'bg-green-400' : 'bg-red-500'}`}></span>
                              ))}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {placings.length > 3 && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
                      <ol className="ml-0">
                        {placings.slice(3).map((p, idx, arr) => {
                          const rounds = Array.from({length: roundCount}, (_, i) => i + 1);
                          const playerResults = rounds.map(rnd => {
                            const match = eventMatches.find(row => String(row.gameNumber) === String(rnd) && (row.player1_id === p.name || row.player2_id === p.name || players[row.player1_id] === p.name || players[row.player2_id] === p.name));
                            if (!match) return null;
                            let win = false;
                            if (match.player1_id === p.name || players[match.player1_id] === p.name) {
                              win = Number(match.score1) > Number(match.score2);
                            } else {
                              win = Number(match.score2) > Number(match.score1);
                            }
                            return win;
                          });
                          return (
                            <li key={p.name} className={`mb-1 flex items-center text-gray-900 dark:text-gray-100 py-2${idx < arr.length - 1 ? ' border-b border-gray-200 dark:border-gray-700' : ''}`}>
                              <span className="text-lg font-extrabold text-indigo-200 bg-indigo-800 bg-opacity-80 rounded-full px-1.5 py-0.5 shadow mr-3" style={{minWidth:'2.5rem',textAlign:'center'}}>{idx + 4}</span>
                              <span className="flex flex-col mr-2">
                                <Link to={`/player/${p.id || Object.keys(players).find(pid => players[pid] === p.name) || ''}`} className="hover:underline">
                                  <span className="font-bold">{p.name}</span>
                                </Link>
                                {p.mainFaction ? <span className="text-xs text-gray-500 mt-0.5">{p.mainFaction}</span> : null}
                              </span>
                              <span className="flex gap-1 ml-auto">
                                {playerResults.map((win, i) => win === null ? null : (
                                  <span key={i} className={`inline-block w-3 h-3 rounded-full ${win ? 'bg-green-400' : 'bg-red-500'}`}></span>
                                ))}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="text-gray-600 dark:text-gray-300">Loading matches...</div>
      ) : error ? (
        <div className="text-red-600 dark:text-red-400">{error}</div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-gray-600 dark:text-gray-300">No matches found for this round.</div>
      ) : (
        <div className="overflow-x-auto">
          {/* Teams grouping logic */}
          {filteredMatches.length > 0 && filteredMatches.every(m => Number(m.score1) + Number(m.score2) === 20) ? (
            // Teams event: group by team vs team
            Array.from(
              Object.values(
                filteredMatches.reduce((acc, m) => {
                  const key = `${m.player1team_id} vs ${m.player2team_id}`;
                  if (!acc[key]) acc[key] = { matches: [], player1team_id: m.player1team_id, player2team_id: m.player2team_id, teamscore1: 0, teamscore2: 0 };
                  acc[key].matches.push(m);
                  acc[key].teamscore1 += Number(m.score1);
                  acc[key].teamscore2 += Number(m.score2);
                  return acc;
                }, {}))
            ).map((group, i) => {
              // Determine winner for this group
              const team1Wins = group.teamscore1 > group.teamscore2;
              const team2Wins = group.teamscore2 > group.teamscore1;
              const isDraw = group.teamscore1 === group.teamscore2;
              // Check if this is an 8-player event (total score 160) and if it's a draw (within 10 points)
              const totalScore = group.matches.reduce((sum, m) => sum + Number(m.score1) + Number(m.score2), 0);
              const is8Player = totalScore === 160;
              const scoreDiff = Math.abs(group.teamscore1 - group.teamscore2);
              const isDraw8Player = is8Player && scoreDiff <= 10;
              const finalIsDraw = isDraw || isDraw8Player;
              const finalTeam1Wins = !finalIsDraw && team1Wins;
              const finalTeam2Wins = !finalIsDraw && team2Wins;

              return (
                <div key={i} className="mb-8">
                  <table className="w-full border-collapse bg-white dark:bg-gray-900 shadow rounded-xl overflow-hidden">
                    <thead className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                      <tr>
                        <th className={`text-left px-4 py-3 text-lg font-bold ${finalTeam1Wins ? 'text-green-700 dark:text-green-300' : finalIsDraw ? 'text-yellow-700 dark:text-yellow-300' : ''}`}>{teamNames[group.player1team_id] || `Team ${group.player1team_id}`}
                          {finalTeam1Wins && <span className="ml-2 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">Winner</span>}
                          {finalIsDraw && <span className="ml-2 text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded">Draw</span>}
                        </th>
                        <th className={`text-center px-4 py-3 text-lg font-bold ${finalTeam1Wins ? 'text-green-700 dark:text-green-300' : finalIsDraw ? 'text-yellow-700 dark:text-yellow-300' : ''}`}>{group.teamscore1}</th>
                        <th className="text-center px-4 py-3 text-lg font-bold">Score</th>
                        <th className={`text-center px-4 py-3 text-lg font-bold ${finalTeam2Wins ? 'text-green-700 dark:text-green-300' : finalIsDraw ? 'text-yellow-700 dark:text-yellow-300' : ''}`}>{group.teamscore2}</th>
                        <th className={`text-right px-4 py-3 text-lg font-bold ${finalTeam2Wins ? 'text-green-700 dark:text-green-300' : finalIsDraw ? 'text-yellow-700 dark:text-yellow-300' : ''}`}>{teamNames[group.player2team_id] || `Team ${group.player2team_id}`}
                          {finalTeam2Wins && <span className="ml-2 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">Winner</span>}
                          {finalIsDraw && <span className="ml-2 text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded">Draw</span>}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.matches.map((m, idx) => {
                        const s1 = Number(m.score1);
                        const s2 = Number(m.score2);
                        const p1bg = factionImages[m.player1Faction] ? {
                          backgroundImage: `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url('${factionImages[m.player1Faction]}')`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          color: 'white',
                          borderRadius: '0.5rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          minHeight: '64px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                        } : { background: '#222', color: 'white', borderRadius: '0.5rem', minHeight: '64px', display: 'flex', flexDirection: 'column', justifyContent: 'center' };
                        const p2bg = factionImages[m.player2Faction] ? {
                          backgroundImage: `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url('${factionImages[m.player2Faction]}')`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          color: 'white',
                          borderRadius: '0.5rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          minHeight: '64px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          transform: 'scaleX(-1)',
                        } : { background: '#222', color: 'white', borderRadius: '0.5rem', minHeight: '64px', display: 'flex', flexDirection: 'column', justifyContent: 'center' };
                        return (
                          <tr key={idx} className={`border-t border-gray-200 dark:border-gray-700 hover:opacity-90 transition ${getRowGradient(s1, s2)}`}
                            style={{height: '72px'}}>
                            <td className="px-4 py-3 align-middle bg-transparent" colSpan={1}>
                              <Link to={`/player/${m.player1_id}`}>
                                <div style={{...p1bg, width: '265px'}} className="flex flex-col items-start justify-center p-2 h-full">
                                  <span className="font-medium text-white drop-shadow-md" style={{textShadow:'0 2px 8px #000,0 0 2px #000'}}>{players[m.player1_id] || m.player1_id}</span>
                                  <span className="text-xs text-gray-200/90 dark:text-gray-100/80 mt-0.5" style={{textShadow:'0 1px 4px #000'}}>{m.player1Faction}</span>
                                </div>
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-center text-lg font-bold w-16 bg-transparent text-white">{m.score1}</td>
                            <td className="px-4 py-3 text-center text-lg font-bold w-16 bg-transparent text-white">vs</td>
                            <td className="px-4 py-3 text-center text-lg font-bold w-16 bg-transparent text-white">{m.score2}</td>
                            <td className="px-4 py-3 align-middle text-right bg-transparent" colSpan={1}>
                              <Link to={`/player/${m.player2_id}`}>
                                <div style={{...p2bg, width: '265px', marginLeft: 'auto'}} className="flex flex-col items-end justify-center p-2 h-full w-full text-right">
                                  <span className="font-medium text-white drop-shadow-md w-full text-right" style={{textShadow:'0 2px 8px #000,0 0 2px #000', transform: 'scaleX(-1)'}}>{players[m.player2_id] || m.player2_id}</span>
                                  <span className="text-xs text-gray-200/90 dark:text-gray-100/80 mt-0.5 w-full text-right" style={{textShadow:'0 1px 4px #000', transform: 'scaleX(-1)'}}>{m.player2Faction}</span>
                                </div>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })
          ) : (
            // Singles event: original table
            <table className="w-full border-collapse bg-white dark:bg-gray-900 shadow rounded-xl overflow-hidden">
              <thead className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                <tr>
                  <th className="text-left px-4 py-3">Player 1</th>
                  <th className="text-center px-4 py-3" colSpan="2">Score</th>
                  <th className="text-right px-4 py-3">Player 2</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map((m, idx) => {
                  const s1 = Number(m.score1);
                  const s2 = Number(m.score2);
                  const p1bg = factionImages[m.player1Faction] ? {
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url('${factionImages[m.player1Faction]}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    color: 'white',
                    borderRadius: '0.5rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    minHeight: '64px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  } : { background: '#222', color: 'white', borderRadius: '0.5rem', minHeight: '64px', display: 'flex', flexDirection: 'column', justifyContent: 'center' };
                  const p2bg = factionImages[m.player2Faction] ? {
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url('${factionImages[m.player2Faction]}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    color: 'white',
                    borderRadius: '0.5rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    minHeight: '64px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    transform: 'scaleX(-1)',
                  } : { background: '#222', color: 'white', borderRadius: '0.5rem', minHeight: '64px', display: 'flex', flexDirection: 'column', justifyContent: 'center' };
                  return (
                    <tr key={idx} className={`border-t border-gray-200 dark:border-gray-700 hover:opacity-90 transition ${getRowGradient(s1, s2)}`}
                      style={{height: '72px'}}>
                      <td className="px-4 py-3 align-middle bg-transparent">
                        <Link to={`/player/${m.player1_id}`}>
                          <div style={{...p1bg, width: '265px'}} className="flex flex-col items-start justify-center p-2 h-full">
                            <span className="font-medium text-white drop-shadow-md" style={{textShadow:'0 2px 8px #000,0 0 2px #000'}}>{players[m.player1_id] || m.player1_id}</span>
                            <span className="text-xs text-gray-200/90 dark:text-gray-100/80 mt-0.5" style={{textShadow:'0 1px 4px #000'}}>{m.player1Faction}</span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center text-lg font-bold w-16 bg-transparent text-white">{m.score1}</td>
                      <td className="px-4 py-3 text-center text-lg font-bold w-16 bg-transparent text-white">{m.score2}</td>
                      <td className="px-4 py-3 align-middle text-right bg-transparent">
                        <Link to={`/player/${m.player2_id}`}>
                          <div style={{...p2bg, width: '265px', marginLeft: 'auto'}} className="flex flex-col items-end justify-center p-2 h-full w-full text-right">
                            <span className="font-medium text-white drop-shadow-md w-full text-right" style={{textShadow:'0 2px 8px #000,0 0 2px #000', transform: 'scaleX(-1)'}}>{players[m.player2_id] || m.player2_id}</span>
                            <span className="text-xs text-gray-200/90 dark:text-gray-100/80 mt-0.5 w-full text-right" style={{textShadow:'0 1px 4px #000', transform: 'scaleX(-1)'}}>{m.player2Faction}</span>
                          </div>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
} 