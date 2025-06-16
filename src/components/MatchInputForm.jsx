import React, { useState } from "react";

const MatchInputForm = ({ onMatchSubmit }) => {
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!player1 || !player2 || isNaN(score1) || isNaN(score2)) return;

    onMatchSubmit({
      player1,
      player2,
      score1: parseInt(score1),
      score2: parseInt(score2),
    });

    setPlayer1("");
    setPlayer2("");
    setScore1("");
    setScore2("");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-xl p-6 max-w-2xl mx-auto mb-8">
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">🎮 Enter Match Result</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Player 1 Name</label>
          <input
            type="text"
            value={player1}
            onChange={(e) => setPlayer1(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Player 1 Score (0–100)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={score1}
            onChange={(e) => setScore1(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Player 2 Name</label>
          <input
            type="text"
            value={player2}
            onChange={(e) => setPlayer2(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Player 2 Score (0–100)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={score2}
            onChange={(e) => setScore2(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        Submit Match
      </button>
    </form>
  );
};

export default MatchInputForm;