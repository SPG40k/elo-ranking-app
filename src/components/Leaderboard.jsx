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
  const [visibleCount, setVisibleCount] = useState(10);
  const [hideNoMatches, setHideNoMatches] = useState(false);

  const sortedPlayers = [...allPlayers].sort((a, b) => b.elo - a.elo);
  const rankMap = new Map(sortedPlayers.map((p, i) => [p.id, i + 1]));

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

  const getRankInfo = (elo, rankPosition) => {
    if (rankPosition > 0 && rankPosition <= 10) {
      return { rank: 'Shark', color: 'bg-red-200 text-red-900' };
    }
    if (elo >= 2000) return { rank: 'Challenger', color: 'bg-white text-black' };
    if (elo >= 1900) return { rank: 'Masters', color: 'bg-purple-200 text-purple-900' };
    if (elo >= 1750) return { rank: 'Diamond', color: 'bg-blue-800 text-white' };
    if (elo >= 1600) return { rank: 'Platinum', color: 'bg-blue-200 text-blue-900' };
    if (elo >= 1450) return { rank: 'Gold', color: 'bg-yellow-200 text-yellow-800' };
    if (elo >= 1300) return { rank: 'Silver', color: 'bg-gray-200 text-gray-800' };
    if (elo >= 1000) return { rank: 'Bronze', color: 'bg-amber-200 text-amber-800' };
    return { rank: 'Iron', color: 'bg-gray-700 text-white' };
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-indigo-700 mb-4">South Pacific War Gaming 40K Leaderboard</h1>

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <input
          type="text"
          placeholder="Search player by name..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setVisibleCount(10);
          }}
          className="w-full sm:w-2/5 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />

        <select
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value);
            setVisibleCount(10);
          }}
          className="w-full sm:w-1/5 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
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

        <label className="flex items-center text-sm gap-2">
          <input
            type="checkbox"
            checked={hideNoMatches}
            onChange={() => setHideNoMatches(!hideNoMatches)}
            className="accent-indigo-600"
          />
          Hide players with no matches
        </label>
      </div>

      <table className="w-full border-collapse bg-white shadow rounded-xl overflow-hidden">
        <thead className="bg-indigo-100 text-indigo-800">
          <tr>
            <th className="text-left px-4 py-2">#</th>
            <th className="text-left px-4 py-2">Rank</th>
            <th className="text-left px-4 py-2">Name</th>
            <th className="text-left px-4 py-2">State</th>
            <th className="text-left px-4 py-2">Elo</th>
            <th className="text-left px-4 py-2">Matches Played</th>
          </tr>
        </thead>
        <tbody>
          {visiblePlayers.map((player) => {
            const rankPosition = rankMap.get(player.id);
            const { rank, color } = getRankInfo(player.elo, rankPosition);
            const stateCode = player.state || '';
            const stateColorClass = stateColors[stateCode.toUpperCase()] || 'text-gray-600';

            return (
              <tr key={player.id} className="border-t hover:opacity-90 transition">
                <td className="px-4 py-2 font-medium">{rankPosition}</td>
                <td className="px-4 py-2">
                  <span className={`text-sm font-semibold px-2 py-1 rounded-full ${color}`}>
                    {rank}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <Link
                    to={`/player/${player.id}`}
                    className="text-indigo-700 hover:underline font-medium"
                  >
                    {player.name}
                  </Link>
                </td>
                <td className="px-4 py-2">
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
                <td className="px-4 py-2">{Math.round(player.elo)}</td>
                <td className="px-4 py-2">{player.matches.length}</td>
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