function Leaderboard({ allPlayers }) {
  const sorted = [...allPlayers].sort((a, b) => b.elo - a.elo);

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h2 className="text-2xl font-bold text-indigo-800 mb-4">Leaderboard</h2>
      <table className="w-full table-auto border border-indigo-300">
        <thead className="bg-indigo-100">
          <tr>
            <th className="p-2 text-left">#</th>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Elo</th>
            <th className="p-2 text-left">Matches Played</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((player, index) => (
            <tr key={player.id} className="border-t">
              <td className="p-2">{index + 1}</td>
              <td className="p-2">{player.name}</td>
              <td className="p-2">{Math.round(player.elo)}</td>
              <td className="p-2">{player.matches.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard;