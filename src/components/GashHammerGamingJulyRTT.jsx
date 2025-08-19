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

export default function GashHammerGamingJulyRTT() {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [factionImages, setFactionImages] = useState({});

  const [roundCount, setRoundCount] = useState(0);
  useEffect(() => {
    async function fetchRounds() {
      const matchesResp = await fetch(process.env.PUBLIC_URL + '/singles_matches.csv');
      const matchesText = await matchesResp.text();
      const parsedMatches = Papa.parse(matchesText, { header: true, skipEmptyLines: true });
      const rounds = new Set();
      parsedMatches.data.forEach(row => {
        if (row.eventName === 'Gash Hammer Gaming July RTT') {
          rounds.add(row.gameNumber);
        }
      });
      setRoundCount(rounds.size);
    }
    fetchRounds();
  }, []);

  const { roundNum } = useParams();
  const location = useLocation();
  let currentRound = null;
  if (roundNum) {
    currentRound = parseInt(roundNum, 10);
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const playersResp = await fetch(process.env.PUBLIC_URL + '/players.csv');
        const playersText = await playersResp.text();
        const parsedPlayers = Papa.parse(playersText, { header: true, skipEmptyLines: true });
        const playerMap = {};
        for (const row of parsedPlayers.data) {
          playerMap[row.id] = row.name;
        }
        setPlayers(playerMap);

        const matchesResp = await fetch(process.env.PUBLIC_URL + '/singles_matches.csv');
        const matchesText = await matchesResp.text();
        const parsedMatches = Papa.parse(matchesText, { header: true, skipEmptyLines: true });
        setMatches(parsedMatches.data);

        const allFactions = new Set();
        parsedMatches.data.forEach(m => {
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
  }, []);

  const filteredMatches = currentRound
    ? matches.filter(row =>
        String(row.gameNumber) === String(currentRound) &&
        row.eventName === 'Gash Hammer Gaming July RTT')
    : [];

  let placings = [];
  if (location.pathname === '/events/gash-hammer-gaming-july-rtt') {
    const eventMatches = matches.filter(row => row.eventName === 'Gash Hammer Gaming July RTT');
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

  const navBar = (
    <div className="flex flex-wrap gap-2 mb-6">
      {[...Array(roundCount)].map((_, i) => {
        const roundNum = i + 1;
        const to = `/events/gash-hammer-gaming-july-rtt-round/${roundNum}`;
        const isActive = location.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${isActive ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100 hover:bg-indigo-200 dark:hover:bg-indigo-800'}`}
          >
            {`Round ${roundNum}`}
          </Link>
        );
      })}
      <Link
        to="/events/gash-hammer-gaming-july-rtt"
        className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${location.pathname === '/events/gash-hammer-gaming-july-rtt' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100 hover:bg-indigo-200 dark:hover:bg-indigo-800'}`}
      >
        Results
      </Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-indigo-700 dark:text-indigo-200 mb-4">Gash Hammer Gaming July RTT</h1>
      {navBar}
      {location.pathname === '/events/gash-hammer-gaming-july-rtt' ? (
        <div>
          {placings.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-3 text-indigo-700 dark:text-indigo-200">Player Placings</h2>
              <div className="grid grid-cols-1 gap-4 mb-6">
                {placings.slice(0, 3).map((p, idx) => {
                  const bgUrl = p.mainFaction && factionImages[p.mainFaction] ? factionImages[p.mainFaction] : undefined;
                  const rounds = Array.from({length: roundCount}, (_, i) => i + 1);
                  const eventMatches = matches.filter(row => row.eventName === 'Gash Hammer Gaming July RTT');
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
                      const eventMatches = matches.filter(row => row.eventName === 'Gash Hammer Gaming July RTT');
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
                    style={{height: '72px'}}
                  >
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
        </div>
      )}
    </div>
  );
} 