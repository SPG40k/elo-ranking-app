import React, { useState, useEffect } from 'react';
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

// Function to normalize faction names by consolidating sub-factions
function normalizeFactionName(factionName) {
  const factionMap = {
    'Ultramarines': 'Space Marines (Astartes)',
    'Salamanders': 'Space Marines (Astartes)',
    'Iron Hands': 'Space Marines (Astartes)',
    'Farsight Enclaves': 'T\'au Empire',
    'Steel Legion': 'Astra Militarum',
    'Hive Fleet Leviathan': 'Tyranids',
    'Hive Fleet Hydra': 'Tyranids',
    'Hive Fleet Hyrda': 'Tyranids',
    'Forces of the Hive Mind': 'Tyranids',
    'Maynarkh': 'Necrons',
    'Deathwing': 'Dark Angels',
    'Iron Warriors': 'Chaos Space Marines',
    'Alpha Legion': 'Chaos Space Marines',
    'Khorne Daemons': 'Chaos Daemons',
    'Adeptus Titanticus': 'Adeptus Titanicus'
  };
  
  // Try exact match first
  if (factionMap[factionName]) {
    return factionMap[factionName];
  }
  
  // Try case-insensitive match
  const lowerFactionName = factionName.toLowerCase();
  for (const [key, value] of Object.entries(factionMap)) {
    if (key.toLowerCase() === lowerFactionName) {
      return value;
    }
  }
  
  return factionName;
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

export default function FactionSpecificLeaderboard({ factionName }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [players, setPlayers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [visibleCount, setVisibleCount] = useState(25);
  const [hideNoMatches, setHideNoMatches] = useState(false);
  const [factionStats, setFactionStats] = useState({ wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 });

  // Function to create faction showcase card
  const createFactionShowcaseCard = () => {
    const stats = factionStats;
    const winRate = stats.totalGames > 0 ? ((stats.wins / stats.totalGames) * 100).toFixed(1) : 0;
    
    return (
      <div className="mb-8 flex justify-center">
        <div 
          className="relative overflow-hidden rounded-lg shadow-2xl" 
          style={{height:'296px', width: '840px'}}
        >
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: `url('/images/${factionName}.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          ></div>
          {/* Win Rate Dial - top right */}
          <div className="absolute top-1/2 right-8 transform -translate-y-1/2">
            <div className="relative w-32 h-32">
              {/* Frosted glass background circle */}
              <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
              <svg className="w-32 h-32 transform -rotate-90 relative z-10" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none" />
                <circle cx="64" cy="64" r="56" stroke="url(#gradient)" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 56}`} strokeDashoffset={`${2 * Math.PI * 56 * (1 - parseFloat(winRate) / 100)}`} className="transition-all duration-1000 ease-out" />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white drop-shadow-lg leading-none">
                    {winRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Content */}
          <div className="relative flex flex-col h-full p-8 pt-8">
            <div className="flex-1">
              <div className="text-4xl font-bold leading-tight text-white drop-shadow-lg">
                {factionName}
              </div>
            </div>
            {/* Stats at bottom */}
            <div className="mt-auto">
              <div className="flex gap-6 mb-4">
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-3 px-6 text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {stats.wins}
                  </div>
                  <div className="text-lg text-gray-200">Wins</div>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-3 px-6 text-center">
                  <div className="text-3xl font-bold text-red-400">
                    {stats.losses}
                  </div>
                  <div className="text-lg text-gray-200">Losses</div>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-3 px-6 text-center">
                  <div className="text-3xl font-bold text-yellow-400">
                    {stats.draws}
                  </div>
                  <div className="text-lg text-gray-200">Draws</div>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-3 px-6 text-center">
                  <div className="text-3xl font-bold text-blue-400">
                    {stats.totalGames}
                  </div>
                  <div className="text-lg text-gray-200">Games</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    async function fetchData() {
      if (!factionName) return;
      
      setLoading(true);
      try {
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

        // Filter matches to only include those where the target faction was used
        const factionMatches = allMatches.filter(match => {
          const p1Faction = normalizeFactionName(match.player1Faction);
          const p2Faction = normalizeFactionName(match.player2Faction);
          return p1Faction === factionName || p2Faction === factionName;
        });

        // Calculate faction-specific Elo for all players from scratch
        const eloMap = {};
        const statsMap = {};
        const matchesMap = {};
        
        // First, calculate overall ELO for all players (same as overall leaderboard)
        const overallEloMap = {};
        const overallStatsMap = {};
        const overallMatchesMap = {};
        
        allMatches.forEach(match => {
          const { player1_id, player2_id, score1, score2, date, player1Faction, player2Faction, isTeams, teamscore1, teamscore2 } = match;
          if (!overallEloMap[player1_id]) overallEloMap[player1_id] = 1500;
          if (!overallEloMap[player2_id]) overallEloMap[player2_id] = 1500;
          if (!overallStatsMap[player1_id]) overallStatsMap[player1_id] = { wins: 0, losses: 0, draws: 0, games: 0 };
          if (!overallStatsMap[player2_id]) overallStatsMap[player2_id] = { wins: 0, losses: 0, draws: 0, games: 0 };
          if (!overallMatchesMap[player1_id]) overallMatchesMap[player1_id] = [];
          if (!overallMatchesMap[player2_id]) overallMatchesMap[player2_id] = [];
          
          // Determine result
          let result1, result2;
          if (score1 > score2) {
            result1 = 1; result2 = 0;
            overallStatsMap[player1_id].wins++;
            overallStatsMap[player2_id].losses++;
          } else if (score1 < score2) {
            result1 = 0; result2 = 1;
            overallStatsMap[player2_id].wins++;
            overallStatsMap[player1_id].losses++;
          } else {
            result1 = 0.5; result2 = 0.5;
            overallStatsMap[player1_id].draws++;
            overallStatsMap[player2_id].draws++;
          }
          overallStatsMap[player1_id].games++;
          overallStatsMap[player2_id].games++;
          
          // Update Elo
          let newElo1, newElo2, eloChange1, eloChange2;
          if (isTeams) {
            eloChange1 = calculateTeamEloForMatch(overallEloMap[player1_id], overallEloMap[player2_id], score1, score2, teamscore1, teamscore2);
            eloChange2 = calculateTeamEloForMatch(overallEloMap[player2_id], overallEloMap[player1_id], score2, score1, teamscore2, teamscore1);
            newElo1 = overallEloMap[player1_id] + eloChange1;
            newElo2 = overallEloMap[player2_id] + eloChange2;
          } else {
            [newElo1, newElo2] = calculateEloForMatch(overallEloMap[player1_id], overallEloMap[player2_id], score1, score2);
            eloChange1 = newElo1 - overallEloMap[player1_id];
            eloChange2 = newElo2 - overallEloMap[player2_id];
          }
          
          // Save match info for overall leaderboard
          overallMatchesMap[player1_id].push({
            date, opponentId: player2_id, opponentName: playerMap[player2_id]?.name || player2_id, score: score1, opponentScore: score2, playerFaction: player1Faction, opponentFaction: player2Faction, result: result1 === 1 ? 'Win' : result1 === 0 ? 'Loss' : 'Draw', eloBefore: overallEloMap[player1_id], eloAfter: newElo1, eloChange: eloChange1, matchType: isTeams ? 'Teams' : 'Singles', teamscore1, teamscore2
          });
          overallMatchesMap[player2_id].push({
            date, opponentId: player1_id, opponentName: playerMap[player1_id]?.name || player1_id, score: score2, opponentScore: score1, playerFaction: player2Faction, opponentFaction: player1Faction, result: result2 === 1 ? 'Win' : result2 === 0 ? 'Loss' : 'Draw', eloBefore: overallEloMap[player2_id], eloAfter: newElo2, eloChange: eloChange2, matchType: isTeams ? 'Teams' : 'Singles', teamscore1: teamscore2, teamscore2: teamscore1
          });
          
          overallEloMap[player1_id] = newElo1;
          overallEloMap[player2_id] = newElo2;
        });
        
        // Now extract faction-specific data using the overall ELO calculations
        factionMatches.forEach(match => {
          const { player1_id, player2_id, score1, score2, date, player1Faction, player2Faction, isTeams, teamscore1, teamscore2 } = match;
          const p1Faction = normalizeFactionName(player1Faction);
          const p2Faction = normalizeFactionName(player2Faction);
          
          // Only include players who actually played AS the target faction
          let shouldIncludePlayer1 = p1Faction === factionName;
          let shouldIncludePlayer2 = p2Faction === factionName;
          
          if (!shouldIncludePlayer1 && !shouldIncludePlayer2) return;
          
          // Find the corresponding match in overall matches to get the exact ELO changes
          const player1Match = overallMatchesMap[player1_id]?.find(m => 
            m.date === date && m.opponentId === player2_id && m.score === score1 && m.opponentScore === score2
          );
          const player2Match = overallMatchesMap[player2_id]?.find(m => 
            m.date === date && m.opponentId === player1_id && m.score === score2 && m.opponentScore === score1
          );
          
          if (shouldIncludePlayer1) {
            if (!eloMap[player1_id]) eloMap[player1_id] = 1500;
            if (!statsMap[player1_id]) statsMap[player1_id] = { wins: 0, losses: 0, draws: 0, games: 0 };
            if (!matchesMap[player1_id]) matchesMap[player1_id] = [];
            
            // Add stats
            if (score1 > score2) {
              statsMap[player1_id].wins++;
            } else if (score1 < score2) {
              statsMap[player1_id].losses++;
            } else {
              statsMap[player1_id].draws++;
            }
            statsMap[player1_id].games++;
            
            // Add ELO change from overall calculation
            if (player1Match) {
              eloMap[player1_id] += player1Match.eloChange;
              matchesMap[player1_id].push({
                ...player1Match,
                eloBefore: eloMap[player1_id] - player1Match.eloChange,
                eloAfter: eloMap[player1_id]
              });
            }
          }
          
          if (shouldIncludePlayer2) {
            if (!eloMap[player2_id]) eloMap[player2_id] = 1500;
            if (!statsMap[player2_id]) statsMap[player2_id] = { wins: 0, losses: 0, draws: 0, games: 0 };
            if (!matchesMap[player2_id]) matchesMap[player2_id] = [];
            
            // Add stats
            if (score2 > score1) {
              statsMap[player2_id].wins++;
            } else if (score2 < score1) {
              statsMap[player2_id].losses++;
            } else {
              statsMap[player2_id].draws++;
            }
            statsMap[player2_id].games++;
            
            // Add ELO change from overall calculation
            if (player2Match) {
              eloMap[player2_id] += player2Match.eloChange;
              matchesMap[player2_id].push({
                ...player2Match,
                eloBefore: eloMap[player2_id] - player2Match.eloChange,
                eloAfter: eloMap[player2_id]
              });
            }
          }
        });

        // Build leaderboard array - only include players who have played this faction
        const leaderboardArr = Object.keys(eloMap)
          .filter(pid => statsMap[pid] && statsMap[pid].games > 0)
          .map(pid => ({
            player_id: pid,
            name: playerMap[pid]?.name || playerMap[pid]?.id || pid,
            state: playerMap[pid]?.state || '',
            elo: Math.round(eloMap[pid]),
            ...statsMap[pid],
            matches: matchesMap[pid] || [],
          }));
        
        leaderboardArr.sort((a, b) => b.elo - a.elo);

        // Calculate faction-specific stats for the showcase card
        const factionStatsData = { wins: 0, losses: 0, draws: 0, totalGames: 0 };
        factionMatches.forEach(match => {
          const p1Faction = normalizeFactionName(match.player1Faction);
          const p2Faction = normalizeFactionName(match.player2Faction);
          
          if (p1Faction === factionName || p2Faction === factionName) {
            factionStatsData.totalGames++;
            
            if (match.score1 > match.score2) {
              if (p1Faction === factionName) {
                factionStatsData.wins++;
              } else {
                factionStatsData.losses++;
              }
            } else if (match.score1 < match.score2) {
              if (p2Faction === factionName) {
                factionStatsData.wins++;
              } else {
                factionStatsData.losses++;
              }
            } else {
              factionStatsData.draws++;
            }
          }
        });
        setFactionStats(factionStatsData);

        setLeaderboard(leaderboardArr);
        setLoading(false);
      } catch (err) {
        setError('Error loading faction leaderboard: ' + err.message);
        setLoading(false);
      }
    }
    fetchData();
  }, [factionName]);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, [factionName]);

  // Filtering and search logic
  const sortedPlayers = [...leaderboard];
  const top10Ids = new Set(sortedPlayers.slice(0, 10).map(p => p.player_id));
  
  // Create global rank map from all players
  const globalRankMap = new Map(sortedPlayers.map((p, i) => [p.player_id, i + 1]));
  
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading {factionName} leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!factionName) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>Please select a faction to view its leaderboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {createFactionShowcaseCard()}
      <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">
        All players who have played {factionName}, ranked by faction-specific ELO rating
      </p>
      
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
      
      {leaderboard.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400 text-lg">
            No players have played {factionName} yet.
          </div>
        </div>
      ) : (
        <>
          <table className="w-full border-collapse bg-white dark:bg-gray-900 shadow rounded-xl overflow-hidden">
            <thead className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
              <tr>
                <th className="text-left px-4 py-2">#</th>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-center px-4 py-2">State</th>
                <th className="text-center px-4 py-2">Elo</th>
                <th className="text-center px-4 py-2">Winrate</th>
                <th className="text-center px-4 py-2">Games</th>
              </tr>
            </thead>
            <tbody>
              {visiblePlayers.map((player, idx) => {
                // Use global ranking for 'All' filter and name searches, contextual ranking only for state filters
                const rankPosition = (stateFilter === 'All' || searchTerm !== '' || hideNoMatches)
                  ? globalRankMap.get(player.player_id) 
                  : idx + 1;
                const stateCode = player.state || '';
                const stateColorClass = stateColors[stateCode.toUpperCase()] || 'text-gray-600 dark:text-gray-300';
                const winrate = player.games > 0 ? ((player.wins / player.games) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={player.player_id} className="border-t border-gray-200 dark:border-gray-700 hover:opacity-90 transition">
                    <td className="px-4 py-2 font-medium text-gray-800 dark:text-white">{rankPosition}</td>
                    <td className="px-4 py-2">
                      <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                        {player.name}
                      </span>
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
        </>
      )}

      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Showing {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''} who have played {factionName}</p>
        <p className="mt-1">ELO ratings are calculated using only matches where players used {factionName}</p>
      </div>
    </div>
  );
} 