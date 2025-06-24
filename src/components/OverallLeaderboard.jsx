import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { Link } from 'react-router-dom';
import { calculateEloForMatch, calculateTeamEloForMatch } from '../utils/eloUtils';

const SINGLES_CSV = process.env.PUBLIC_URL + '/singles_matches.csv';
const TEAMS_CSV = process.env.PUBLIC_URL + '/teams_matches.csv';
const PLAYERS_CSV = process.env.PUBLIC_URL + '/players.csv';

const stateColors = {
  ACT: 'bg-blue-900 text-white',
  NSW: 'bg-blue-300 text-blue-900',
  NT: 'bg-red-800 text-white',
  QLD: 'bg-red-900 text-white',
  SA: 'bg-red-600 text-white',
  TAS: 'bg-green-800 text-white',
  VIC: 'bg-blue-800 text-white',
  WA: 'bg-yellow-300 text-yellow-900',
  NZN: 'bg-gray-300 text-gray-800',
  NZS: 'bg-gray-700 text-white',
};

function normalizeSinglesMatch(row) {
  return {
    date: row.date,
    player1_id: row.player1_id,
    player2_id: row.player2_id,
    score1: Number(row.score1),
    score2: Number(row.score2),
    player1Faction: row.player1Faction,
    player2Faction: row.player2Faction,
  };
}

function normalizeTeamsMatch(row) {
  return {
    date: row.date,
    player1_id: row.player1_id,
    player2_id: row.player2_id,
    score1: Number(row.score1),
    score2: Number(row.score2),
    player1Faction: row.player1Faction,
    player2Faction: row.player2Faction,
    teamscore1: row.teamscore1 !== undefined ? Number(row.teamscore1) : undefined,
    teamscore2: row.teamscore2 !== undefined ? Number(row.teamscore2) : undefined,
    isTeams: true,
  };
}

function getRankLabel(elo, playerId, top10Ids) {
  if (top10Ids && top10Ids.has(playerId)) return 'War-Master';
  if (elo >= 2000) return 'Chapter-Master';
  if (elo >= 1900) return 'War-Lord';
  if (elo >= 1750) return 'Captain';
  if (elo >= 1600) return 'Lieutenant';
  if (elo >= 1450) return 'Sergeant';
  if (elo >= 1300) return 'Trooper';
  if (elo >= 1000) return 'Scout';
  return 'Scout';
}

function getRankInfo(elo, playerId, top10Ids) {
  const rank = getRankLabel(elo, playerId, top10Ids);
  const colorMap = {
    'War-Master': 'bg-black/70 text-white',
    'Chapter-Master': 'bg-purple-400/80 text-white',
    'War-Lord': 'bg-red-400/80 text-white',
    'Captain': 'bg-green-400/80 text-white',
    'Lieutenant': 'bg-orange-300/80 text-white',
    'Sergeant': 'bg-yellow-200/80 text-black',
    'Trooper': 'bg-gray-200/80 text-black',
    'Scout': 'bg-white/80 text-black border border-gray-300',
  };
  return { rank, color: colorMap[rank] || 'bg-gray-300 text-black' };
}

export default function OverallLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [players, setPlayers] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [visibleCount, setVisibleCount] = useState(25);
  const [hideNoMatches, setHideNoMatches] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // Load players
      const playersData = await fetch(PLAYERS_CSV).then(r => r.text());
      const parsedPlayers = Papa.parse(playersData, { header: true }).data;
      const playerMap = {};
      parsedPlayers.forEach(p => { playerMap[p.id] = p; });
      setPlayers(playerMap);

      // Load singles matches
      const singlesData = await fetch(SINGLES_CSV).then(r => r.text());
      const singlesMatches = Papa.parse(singlesData, { header: true }).data
        .filter(row => row.player1_id && row.player2_id)
        .map(normalizeSinglesMatch);

      // Load teams matches
      const teamsData = await fetch(TEAMS_CSV).then(r => r.text());
      const teamsMatches = Papa.parse(teamsData, { header: true }).data
        .filter(row => row.player1_id && row.player2_id)
        .map(normalizeTeamsMatch);

      // Merge and sort all matches by date
      const allMatches = [
        ...singlesMatches.map(m => ({ ...m, isTeams: false })),
        ...teamsMatches
      ].sort((a, b) => new Date(a.date) - new Date(b.date));

      // Recalculate Elo for all players from scratch
      const eloMap = {};
      const statsMap = {};
      const matchesMap = {};
      allMatches.forEach(match => {
        const { player1_id, player2_id, score1, score2, date, player1Faction, player2Faction, isTeams, teamscore1, teamscore2 } = match;
        if (!eloMap[player1_id]) eloMap[player1_id] = 1500;
        if (!eloMap[player2_id]) eloMap[player2_id] = 1500;
        if (!statsMap[player1_id]) statsMap[player1_id] = { wins: 0, losses: 0, draws: 0, games: 0 };
        if (!statsMap[player2_id]) statsMap[player2_id] = { wins: 0, losses: 0, draws: 0, games: 0 };
        if (!matchesMap[player1_id]) matchesMap[player1_id] = [];
        if (!matchesMap[player2_id]) matchesMap[player2_id] = [];
        // Determine result
        let result1, result2;
        if (score1 > score2) {
          result1 = 1; result2 = 0;
          statsMap[player1_id].wins++;
          statsMap[player2_id].losses++;
        } else if (score1 < score2) {
          result1 = 0; result2 = 1;
          statsMap[player2_id].wins++;
          statsMap[player1_id].losses++;
        } else {
          result1 = 0.5; result2 = 0.5;
          statsMap[player1_id].draws++;
          statsMap[player2_id].draws++;
        }
        statsMap[player1_id].games++;
        statsMap[player2_id].games++;
        // Update Elo
        let newElo1, newElo2, eloChange1, eloChange2;
        if (isTeams) {
          // Use team Elo logic
          eloChange1 = calculateTeamEloForMatch(eloMap[player1_id], eloMap[player2_id], score1, score2, teamscore1, teamscore2);
          eloChange2 = calculateTeamEloForMatch(eloMap[player2_id], eloMap[player1_id], score2, score1, teamscore2, teamscore1);
          newElo1 = eloMap[player1_id] + eloChange1;
          newElo2 = eloMap[player2_id] + eloChange2;
        } else {
          [newElo1, newElo2] = calculateEloForMatch(eloMap[player1_id], eloMap[player2_id], score1, score2);
          eloChange1 = newElo1 - eloMap[player1_id];
          eloChange2 = newElo2 - eloMap[player2_id];
        }
        // Save match info for player detail
        matchesMap[player1_id].push({
          date, opponentId: player2_id, opponentName: players[player2_id]?.name || player2_id, score: score1, opponentScore: score2, playerFaction: player1Faction, opponentFaction: player2Faction, result: result1 === 1 ? 'Win' : result1 === 0 ? 'Loss' : 'Draw', eloBefore: eloMap[player1_id], eloAfter: newElo1, eloChange: eloChange1, matchType: isTeams ? 'Teams' : 'Singles', teamscore1, teamscore2
        });
        matchesMap[player2_id].push({
          date, opponentId: player1_id, opponentName: players[player1_id]?.name || player1_id, score: score2, opponentScore: score1, playerFaction: player2Faction, opponentFaction: player1Faction, result: result2 === 1 ? 'Win' : result2 === 0 ? 'Loss' : 'Draw', eloBefore: eloMap[player2_id], eloAfter: newElo2, eloChange: eloChange2, matchType: isTeams ? 'Teams' : 'Singles', teamscore1: teamscore2, teamscore2: teamscore1
        });
        eloMap[player1_id] = newElo1;
        eloMap[player2_id] = newElo2;
      });

      // Build leaderboard array
      const leaderboardArr = Object.keys(eloMap).map(pid => ({
        player_id: pid,
        name: playerMap[pid]?.name || playerMap[pid]?.id || pid,
        state: playerMap[pid]?.state || '',
        elo: Math.round(eloMap[pid]),
        ...statsMap[pid],
        matches: matchesMap[pid] || [],
      }));
      leaderboardArr.sort((a, b) => b.elo - a.elo);
      setLeaderboard(leaderboardArr);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Filtering and search logic
  const sortedPlayers = [...leaderboard];
  const top10Ids = new Set(sortedPlayers.slice(0, 10).map(p => p.player_id));
  const filteredPlayers = sortedPlayers.filter((player) => {
    const nameMatch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const hasMatches = player.matches && player.matches.length > 0;
    const stateCode = player.state ? player.state.toUpperCase() : '';
    let stateMatch = false;
    if (stateFilter === 'All') {
      stateMatch = true;
    } else if (stateFilter === 'Australia') {
      stateMatch = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'].includes(stateCode);
    } else if (stateFilter === 'New Zealand') {
      stateMatch = ['NZN', 'NZS'].includes(stateCode);
    } else {
      stateMatch = stateCode === stateFilter;
    }
    return nameMatch && stateMatch && (!hideNoMatches || hasMatches);
  });
  const visiblePlayers = filteredPlayers.slice(0, visibleCount);

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + 10, filteredPlayers.length));
  };
  const handleShowAll = () => {
    setVisibleCount(filteredPlayers.length);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-indigo-700 dark:text-indigo-200 mb-4">Overall Leaderboard</h1>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <input
          type="text"
          placeholder="Search player by name..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setVisibleCount(25);
          }}
          className="w-full sm:w-2/5 p-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-900 dark:text-gray-100"
        />
        <select
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value);
            setVisibleCount(25);
          }}
          className="w-full sm:w-1/5 p-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="All">All</option>
          <option value="Australia">Australia</option>
          <option value="New Zealand">New Zealand</option>
          <option value="ACT">ACT</option>
          <option value="NSW">NSW</option>
          <option value="NT">NT</option>
          <option value="QLD">QLD</option>
          <option value="SA">SA</option>
          <option value="TAS">TAS</option>
          <option value="VIC">VIC</option>
          <option value="WA">WA</option>
          <option value="NZN">NZN</option>
          <option value="NZS">NZS</option>
        </select>
        <label className="flex items-center text-sm gap-2 dark:text-gray-200">
          <input
            type="checkbox"
            checked={hideNoMatches}
            onChange={() => setHideNoMatches(!hideNoMatches)}
            className="accent-indigo-600"
          />
          Hide players with no matches
        </label>
      </div>
      <table className="w-full border-collapse bg-white dark:bg-gray-900 shadow rounded-xl overflow-hidden">
        <thead className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
          <tr>
            <th className="text-left px-4 py-2">#</th>
            <th className="text-left px-4 py-2">Rank</th>
            <th className="text-left px-4 py-2">Name</th>
            <th className="text-center px-4 py-2">State</th>
            <th className="text-center px-4 py-2">Elo</th>
            <th className="text-center px-4 py-2">Winrate</th>
            <th className="text-center px-4 py-2">Games</th>
          </tr>
        </thead>
        <tbody>
          {visiblePlayers.map((player, idx) => {
            const rankPosition = idx + 1;
            const { rank, color } = getRankInfo(player.elo, player.player_id, top10Ids);
            const stateCode = player.state || '';
            const stateColorClass = stateColors[stateCode.toUpperCase()] || 'text-gray-600 dark:text-gray-300';
            const winrate = player.games > 0 ? ((player.wins / player.games) * 100).toFixed(1) : '0.0';
            return (
              <tr key={player.player_id} className="border-t border-gray-200 dark:border-gray-700 hover:opacity-90 transition">
                <td className="px-4 py-2 font-medium text-gray-800 dark:text-white">{rankPosition}</td>
                <td className="px-4 py-2">
                  <span className={`text-sm font-semibold px-2 py-1 rounded-full ${color}`}>{rank}</span>
                </td>
                <td className="px-4 py-2">
                  <Link to={`/overall-player/${player.player_id}`} className="text-indigo-700 dark:text-indigo-300 hover:underline font-medium">
                    {player.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-center">
                  {stateCode ? (
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${stateColorClass}`}
                      style={{ minWidth: 50, textAlign: 'center' }}
                      title={stateCode}
                    >
                      {stateCode}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-2 text-gray-800 dark:text-white text-center">{Math.round(player.elo)}</td>
                <td className="px-4 py-2 text-gray-800 dark:text-white text-center">{winrate}%</td>
                <td className="px-4 py-2 text-gray-800 dark:text-white text-center">{player.games}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filteredPlayers.length === 0 && (
        <p className="mt-4 text-gray-500">No players found.</p>
      )}
      {filteredPlayers.length > visiblePlayers.length && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleShowMore}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Show More
          </button>
          <button
            onClick={handleShowAll}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Show All ({filteredPlayers.length})
          </button>
        </div>
      )}
    </div>
  );
} 