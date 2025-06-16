import { useState } from 'react';
import { calculateElo } from '../utils/eloUtils';

function SubmitMatch({ allPlayers, setAllPlayers }) {
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [resultSubmitted, setResultSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!player1 || !player2 || player1 === player2) {
      alert('Please select two different players.');
      return;
    }

    if (isNaN(score1) || isNaN(score2)) {
      alert('Please enter valid numeric scores.');
      return;
    }

    const p1Index = allPlayers.findIndex(p => p.name === player1);
    const p2Index = allPlayers.findIndex(p => p.name === player2);

    if (p1Index === -1 || p2Index === -1) {
      alert('Players not found.');
      return;
    }

    const updatedPlayers = [...allPlayers];
    const p1 = { ...updatedPlayers[p1Index] };
    const p2 = { ...updatedPlayers[p2Index] };

    const p1Score = parseInt(score1, 10);
    const p2Score = parseInt(score2, 10);

    const winner = p1Score > p2Score ? p1 : p2;
    const loser = p1Score > p2Score ? p2 : p1;
    const winnerScore = Math.max(p1Score, p2Score);
    const loserScore = Math.min(p1Score, p2Score);

    const eloChange = calculateElo(winner.elo, loser.elo, winnerScore, loserScore);

    winner.elo += eloChange;
    loser.elo -= eloChange;

    const today = new Date().toISOString().split('T')[0];

    winner.matches.unshift({
      opponent: loser.name,
      result: 'Win',
      date: today,
      score: `${winnerScore}-${loserScore}`,
      eloChange: +eloChange,
    });

    loser.matches.unshift({
      opponent: winner.name,
      result: 'Loss',
      date: today,
      score: `${loserScore}-${winnerScore}`,
      eloChange: -eloChange,
    });

    updatedPlayers[p1Index] = p1;
    updatedPlayers[p2Index] = p2;
    setAllPlayers(updatedPlayers);

    setResultSubmitted(true);
    setPlayer1('');
    setPlayer2('');
    setScore1('');
    setScore2('');
  };

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-indigo-900 mb-6">Submit Match Result</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-indigo-700 font-semibold mb-1">Player 1</label>
          <select
            value={player1}
            onChange={(e) => setPlayer1(e.target.value)}
            className="w-full p-2 border rounded-lg"
          >
            <option value="">Select Player 1</option>
            {allPlayers.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-indigo-700 font-semibold mb-1">Player 2</label>
          <select
            value={player2}
            onChange={(e) => setPlayer2(e.target.value)}
            className="w-full p-2 border rounded-lg"
          >
            <option value="">Select Player 2</option>
            {allPlayers.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="block text-indigo-700 font-semibold mb-1">Score {player1 || 'Player 1'}</label>
            <input
              type="number"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div className="flex-1">
            <label className="block text-indigo-700 font-semibold mb-1">Score {player2 || 'Player 2'}</label>
            <input
              type="number"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-indigo-700 text-white px-6 py-2 rounded-lg hover:bg-indigo-800 transition"
        >
          Submit Match
        </button>
      </form>

      {resultSubmitted && (
        <p className="mt-6 text-green-600 font-semibold">
          Match submitted successfully!
        </p>
      )}
    </div>
  );
}

export default SubmitMatch;