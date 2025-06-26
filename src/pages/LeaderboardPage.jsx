import React, { useState } from 'react';

function Leaderboard({ allPlayers }) {
  const [hideNoMatches, setHideNoMatches] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('All');

  const sorted = [...allPlayers].sort((a, b) => b.elo - a.elo);

  const filteredPlayers = sorted.filter((player) => {
    const nameMatch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const hasMatches = player.games > 0;
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
    return nameMatch && stateMatch && (hideNoMatches ? hasMatches : true);
  });

  return (
    <div className="w-full max-w-full mx-0 p-0 bg-indigo-950">
      <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-indigo-100 mb-2 sm:mb-3 md:mb-4 pl-2">Leaderboard</h2>
      <div className="w-full overflow-x-auto">
        <table className="min-w-[400px] table-auto border border-indigo-300 text-xs sm:text-sm md:text-base bg-indigo-900 mx-0">
          <thead className="bg-indigo-800">
            <tr>
              <th className="p-1 text-left w-6 sm:w-8 md:w-auto whitespace-nowrap text-indigo-100">#</th>
              <th className="p-1 text-left whitespace-nowrap text-indigo-100">Name</th>
              <th className="p-1 text-left w-10 sm:w-12 md:w-auto whitespace-nowrap text-indigo-100">State</th>
              <th className="p-1 text-left w-10 sm:w-12 md:w-auto whitespace-nowrap text-indigo-100">Elo</th>
              <th className="p-1 text-left w-12 sm:w-16 md:w-auto whitespace-nowrap text-indigo-100">Matches</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player, index) => (
              <tr key={player.id} className="border-t border-indigo-800">
                <td className="p-1 whitespace-nowrap text-indigo-50 text-center">
                  <span
                    className={
                      index + 1 === 1
                        ? 'inline-flex items-center justify-center rounded-full font-bold text-white mr-2 bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-300'
                        : index + 1 === 2
                        ? 'inline-flex items-center justify-center rounded-full font-bold text-white mr-2 bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 bg-gradient-to-br from-gray-200 via-gray-400 to-gray-300'
                        : index + 1 === 3
                        ? 'inline-flex items-center justify-center rounded-full font-bold text-white mr-2 bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 bg-gradient-to-br from-amber-600 via-amber-700 to-yellow-600'
                        : 'font-bold text-white flex items-center justify-center ml-[-8px]'
                    }
                    style={
                      index + 1 === 1 || index + 1 === 2 || index + 1 === 3
                        ? { width: 28, height: 28, minWidth: 28, minHeight: 28, fontSize: 16 }
                        : { fontSize: 16, height: 28, minHeight: 28, width: 28, minWidth: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
                    }
                    title={
                      index + 1 === 1
                        ? '1st Place'
                        : index + 1 === 2
                        ? '2nd Place'
                        : index + 1 === 3
                        ? '3rd Place'
                        : `Rank #${index + 1}`
                    }
                  >
                    {index + 1}
                  </span>
                </td>
                <td className="p-1 truncate whitespace-nowrap text-indigo-50">{player.name}</td>
                <td className="p-1 whitespace-nowrap text-indigo-50">{player.state || ''}</td>
                <td className="p-1 whitespace-nowrap text-indigo-50">{Math.round(player.elo)}</td>
                <td className="p-1 whitespace-nowrap text-indigo-50">{player.matches.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <label className="flex items-center text-sm gap-2 dark:text-gray-200">
          <input
            type="checkbox"
            checked={!hideNoMatches}
            onChange={() => setHideNoMatches(hideNoMatches => !hideNoMatches)}
            className="accent-indigo-600"
          />
          Show players with no matches
        </label>
        <input
          type="text"
          placeholder="Search by name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border border-indigo-300 rounded-md"
        />
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="p-2 border border-indigo-300 rounded-md"
        >
          <option value="All">All States</option>
          <option value="Australia">Australia</option>
          <option value="New Zealand">New Zealand</option>
        </select>
      </div>
    </div>
  );
}

export default Leaderboard;