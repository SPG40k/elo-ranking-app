import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const stateColors = {
  ACT: 'bg-blue-900 text-white',         // Dark Blue
  NSW: 'bg-blue-300 text-blue-900',      // Light Blue
  NT: 'bg-red-800 text-white',            // Red Ochre
  QLD: 'bg-red-900 text-white',           // Maroon
  SA: 'bg-red-600 text-white',            // Red
  TAS: 'bg-green-800 text-white',         // Bottle Green
  VIC: 'bg-blue-800 text-white',          // Navy Blue
  WA: 'bg-yellow-300 text-yellow-900',    // Yellow
  NZN: 'bg-gray-300 text-gray-800',       // Light Grey
  NZS: 'bg-gray-700 text-white',          // Dark Grey
};

// Define groups for filtering
const australiaStates = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
const newZealandStates = ['NZN', 'NZS'];

export default function Leaderboard({ allPlayers }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [visibleCount, setVisibleCount] = useState(25);
  const [hideNoMatches, setHideNoMatches] = useState(false);

  const sortedPlayers = [...allPlayers].sort((a, b) => b.elo - a.elo);
  
  // Create global rank map from all players
  const globalRankMap = new Map(sortedPlayers.map((p, i) => [p.id, i + 1]));

  const filteredPlayers = sortedPlayers.filter((player) => {
    const nameMatch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const hasMatches = player.matches && player.matches.length > 0;

    // Determine if player state matches filter
    const stateCode = player.state ? player.state.toUpperCase() : '';

    let stateMatch = false;
    if (stateFilter === 'All') {
      stateMatch = true;
    } else if (stateFilter === 'Australia') {
      stateMatch = australiaStates.includes(stateCode);
    } else if (stateFilter === 'New Zealand') {
      stateMatch = newZealandStates.includes(stateCode);
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

  // Get the top 10 player IDs by global Elo
  const top10Ids = new Set(sortedPlayers.slice(0, 10).map(p => p.id));

  const getRankLabel = (elo, playerId) => {
    if (top10Ids.has(playerId)) return 'War-Master';
    if (elo >= 2000) return 'Chapter-Master';
    if (elo >= 1900) return 'War-Lord';
    if (elo >= 1750) return 'Captain';
    if (elo >= 1600) return 'Lieutenant';
    if (elo >= 1450) return 'Sergeant';
    if (elo >= 1300) return 'Trooper';
    if (elo >= 1000) return 'Scout';
    return 'Scout';
  };

  const getRankInfo = (elo, playerId) => {
    const rank = getRankLabel(elo, playerId);
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
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-indigo-700 dark:text-indigo-200 mb-4">Singles Leaderboard</h1>

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
            <th className="text-center px-4 py-2">Matches Played</th>
          </tr>
        </thead>
        <tbody>
          {visiblePlayers.map((player, idx) => {
            // Use global ranking for 'All' filter and name searches, contextual ranking only for state filters
            const rankPosition = (stateFilter === 'All' || searchTerm !== '' || hideNoMatches)
              ? globalRankMap.get(player.id) 
              : idx + 1;
            const { rank, color } = getRankInfo(player.elo, player.id);
            const stateCode = player.state || '';
            const stateColorClass = stateColors[stateCode.toUpperCase()] || 'text-gray-600 dark:text-gray-300';

            return (
              <tr key={player.id} className="border-t border-gray-200 dark:border-gray-700 hover:opacity-90 transition">
                <td className="px-4 py-2 font-medium text-gray-800 dark:text-white text-center">
                  <span
                    className={
                      rankPosition === 1
                        ? 'inline-flex items-center justify-center rounded-full font-bold text-white mr-2 bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-300'
                        : rankPosition === 2
                        ? 'inline-flex items-center justify-center rounded-full font-bold text-white mr-2 bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 bg-gradient-to-br from-gray-200 via-gray-400 to-gray-300'
                        : rankPosition === 3
                        ? 'inline-flex items-center justify-center rounded-full font-bold text-white mr-2 bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 bg-gradient-to-br from-amber-600 via-amber-700 to-yellow-600'
                        : 'font-bold text-white flex items-center justify-center ml-[-8px]'
                    }
                    style={
                      rankPosition === 1 || rankPosition === 2 || rankPosition === 3
                        ? { width: 28, height: 28, minWidth: 28, minHeight: 28, fontSize: 16 }
                        : { fontSize: 16, height: 28, minHeight: 28, width: 28, minWidth: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
                    }
                    title={
                      rankPosition === 1
                        ? '1st Place'
                        : rankPosition === 2
                        ? '2nd Place'
                        : rankPosition === 3
                        ? '3rd Place'
                        : `Rank #${rankPosition}`
                    }
                  >
                    {rankPosition}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className={`text-sm font-semibold px-2 py-1 rounded-full ${color}`}>
                    {rank}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <Link
                    to={`/player/${player.id}`}
                    className="text-indigo-700 dark:text-indigo-300 hover:underline font-medium"
                  >
                    {player.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-center">
                  {stateCode ? (
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${stateColorClass}`}
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
                <td className="px-4 py-2 text-gray-800 dark:text-white text-center">{player.matches.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {filteredPlayers.length === 0 && (
        <p className="mt-4 text-gray-500">No players found.</p>
      )}

      {filteredPlayers.length > visiblePlayers.length && (
        <div className="flex gap-4 justify-center mt-6">
          <button
            onClick={handleShowMore}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Show More
          </button>

          {visibleCount + 10 < filteredPlayers.length && (
            <button
              onClick={handleShowAll}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              Show All
            </button>
          )}
        </div>
      )}
    </div>
  );
}