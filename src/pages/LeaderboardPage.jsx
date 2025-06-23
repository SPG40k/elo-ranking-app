function Leaderboard({ allPlayers }) {
  const sorted = [...allPlayers].sort((a, b) => b.elo - a.elo);

  return (
    <div className="w-full max-w-3xl mx-auto p-2 sm:p-4 md:p-8">
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-indigo-800 mb-3 sm:mb-4">Leaderboard</h2>
      <div className="w-full overflow-hidden">
        <table className="w-full table-auto border border-indigo-300">
          <thead className="bg-indigo-100">
            <tr>
              <th className="p-1 sm:p-2 text-left text-xs sm:text-sm md:text-base w-8 sm:w-auto">#</th>
              <th className="p-1 sm:p-2 text-left text-xs sm:text-sm md:text-base">Name</th>
              <th className="p-1 sm:p-2 text-left text-xs sm:text-sm md:text-base w-12 sm:w-auto">Elo</th>
              <th className="p-1 sm:p-2 text-left text-xs sm:text-sm md:text-base w-12 sm:w-auto">Matches</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player, index) => (
              <tr key={player.id} className="border-t">
                <td className="p-1 sm:p-2 text-xs sm:text-sm md:text-base">{index + 1}</td>
                <td className="p-1 sm:p-2 text-xs sm:text-sm md:text-base truncate">{player.name}</td>
                <td className="p-1 sm:p-2 text-xs sm:text-sm md:text-base">{Math.round(player.elo)}</td>
                <td className="p-1 sm:p-2 text-xs sm:text-sm md:text-base">{player.matches.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Leaderboard;