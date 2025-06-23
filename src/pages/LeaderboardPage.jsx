function Leaderboard({ allPlayers }) {
  const sorted = [...allPlayers].sort((a, b) => b.elo - a.elo);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      <h2 className="text-xl sm:text-2xl font-bold text-indigo-800 mb-4">Leaderboard</h2>
      <div className="overflow-x-auto">
        <table className="w-full table-auto border border-indigo-300 min-w-full">
          <thead className="bg-indigo-100">
            <tr>
              <th className="p-2 text-left text-sm sm:text-base">#</th>
              <th className="p-2 text-left text-sm sm:text-base">Name</th>
              <th className="p-2 text-left text-sm sm:text-base">Elo</th>
              <th className="p-2 text-left text-sm sm:text-base">Matches</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player, index) => (
              <tr key={player.id} className="border-t">
                <td className="p-2 text-sm sm:text-base">{index + 1}</td>
                <td className="p-2 text-sm sm:text-base">{player.name}</td>
                <td className="p-2 text-sm sm:text-base">{Math.round(player.elo)}</td>
                <td className="p-2 text-sm sm:text-base">{player.matches.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Leaderboard;