function Leaderboard({ allPlayers }) {
  const sorted = [...allPlayers].sort((a, b) => b.elo - a.elo);

  return (
    <div className="w-full max-w-3xl mx-auto p-1 sm:p-2 md:p-4 lg:p-8">
      <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-indigo-800 mb-2 sm:mb-3 md:mb-4">Leaderboard</h2>
      <div className="w-full overflow-x-auto">
        <table className="w-full table-auto border border-indigo-300 text-xs sm:text-sm md:text-base">
          <thead className="bg-indigo-100">
            <tr>
              <th className="p-1 text-left w-6 sm:w-8 md:w-auto whitespace-nowrap">#</th>
              <th className="p-1 text-left whitespace-nowrap">Name</th>
              <th className="p-1 text-left w-10 sm:w-12 md:w-auto whitespace-nowrap">State</th>
              <th className="p-1 text-left w-10 sm:w-12 md:w-auto whitespace-nowrap">Elo</th>
              <th className="p-1 text-left w-16 sm:w-20 md:w-auto whitespace-nowrap">Matches Played</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player, index) => (
              <tr key={player.id} className="border-t">
                <td className="p-1 whitespace-nowrap">{index + 1}</td>
                <td className="p-1 truncate whitespace-nowrap">{player.name}</td>
                <td className="p-1 whitespace-nowrap">{player.state || ''}</td>
                <td className="p-1 whitespace-nowrap">{Math.round(player.elo)}</td>
                <td className="p-1 whitespace-nowrap">{player.matches.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Leaderboard;