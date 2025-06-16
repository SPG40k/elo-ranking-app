import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

export default function PlayerDetail({ allPlayers }) {
  const { id } = useParams();
  const player = allPlayers.find((p) => p.id === id);
  const [showMoreMatches, setShowMoreMatches] = useState(false);
  const [showStats, setShowStats] = useState(false);

  if (!player) return <div className="p-6">Player not found.</div>;

  const getRankLabel = (elo, rankPosition = null) => {
    if (rankPosition && rankPosition > 0 && rankPosition <= 10) return 'Shark';
    if (elo >= 2000) return 'Challenger';
    if (elo >= 1900) return 'Masters';
    if (elo >= 1750) return 'Diamond';
    if (elo >= 1600) return 'Platinum';
    if (elo >= 1450) return 'Gold';
    if (elo >= 1300) return 'Silver';
    if (elo >= 1000) return 'Bronze';
    return 'Iron';
  };

  const getRankInfo = (elo, rankPosition) => {
    const rank = getRankLabel(elo, rankPosition);
    const colorMap = {
      Shark: 'bg-red-300 text-red-900',
      Challenger: 'bg-white text-black',
      Masters: 'bg-purple-300 text-purple-900',
      Diamond: 'bg-blue-800 text-white',
      Platinum: 'bg-blue-300 text-blue-900',
      Gold: 'bg-yellow-300 text-yellow-800',
      Silver: 'bg-gray-300 text-gray-800',
      Bronze: 'bg-amber-300 text-amber-800',
      Iron: 'bg-gray-700 text-white',
    };
    return { rank, color: colorMap[rank] || 'bg-gray-300 text-black' };
  };

  const sortedByElo = [...allPlayers].sort((a, b) => b.elo - a.elo);
  const rankPosition = sortedByElo.findIndex((p) => p.id === player.id) + 1;
  const { rank, color } = getRankInfo(player.elo, rankPosition);

  const totalMatches = player.matches.length;
  const totalWins = player.matches.filter((m) => m.result === 'Win').length;
  const totalLosses = player.matches.filter((m) => m.result === 'Loss').length;
  const totalDraws = player.matches.filter((m) => m.result === 'Draw').length;
  const winrate = totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : '0.0';

  // Calculate Average Opponent Elo
  const totalOpponentElo = player.matches.reduce((sum, match) => {
    return sum + (match.opponentElo || 0);
  }, 0);
  const averageOpponentElo = totalMatches > 0 ? Math.round(totalOpponentElo / totalMatches) : 0;

  const factionCount = {};
  player.matches.forEach((m) => {
    const faction = m.playerFaction;
    if (faction) {
      factionCount[faction] = (factionCount[faction] || 0) + 1;
    }
  });

  const maxPlays = Math.max(...Object.values(factionCount), 0);
  const mostPlayedFactions = Object.entries(factionCount)
    .filter(([_, count]) => count === maxPlays)
    .map(([faction]) => faction)
    .join(' & ');

  // Sort matches oldest first, then by game number ascending
  const sortedMatchesChronological = [...player.matches].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    return (a.gameNumber || 0) - (b.gameNumber || 0);
  });

  // Calculate initial Elo for Elo History
  let initialEloForHistory = player.elo;
  for (let i = sortedMatchesChronological.length - 1; i >= 0; i--) {
    initialEloForHistory -= sortedMatchesChronological[i].eloChange || 0;
  }

  // Build Elo history for chart
  let cumulativeEloForHistory = initialEloForHistory;
  const eloHistory = sortedMatchesChronological.map((match, i) => {
    cumulativeEloForHistory += match.eloChange || 0;
    return { match: `Game ${i + 1}`, elo: Math.round(cumulativeEloForHistory) };
  });

  // Annotate matches with rank notes and adjusted scores
  let runningEloForAnnotation = initialEloForHistory;
  const annotatedMatches = sortedMatchesChronological.map((match) => {
    const prevElo = runningEloForAnnotation;
    runningEloForAnnotation += match.eloChange || 0;
    const newRank = getRankLabel(runningEloForAnnotation);
    const prevRank = getRankLabel(prevElo);
    let rankNote = '';
    if (prevRank !== newRank) {
      rankNote = (match.eloChange > 0 ? 'Promoted to' : 'Demoted to') + ` ${newRank}`;
    }

    let score = match.score;
    let opponentScore = match.opponentScore;
    if (score === undefined || opponentScore === undefined) {
      if (match.player1_id === player.id) {
        score = match.score1;
        opponentScore = match.score2;
      } else {
        score = match.score2;
        opponentScore = match.score1;
      }
    }

    return {
      ...match,
      score,
      opponentScore,
      rankNote,
      cumulativeElo: Math.round(runningEloForAnnotation),
    };
  });

  // Calculate win/loss streaks
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let winStreak = 0;
  let lossStreak = 0;
  sortedMatchesChronological.forEach((match) => {
    if (match.result === 'Win') {
      winStreak++;
      lossStreak = 0;
    } else if (match.result === 'Loss') {
      lossStreak++;
      winStreak = 0;
    } else {
      winStreak = 0;
      lossStreak = 0;
    }
    maxWinStreak = Math.max(maxWinStreak, winStreak);
    maxLossStreak = Math.max(maxLossStreak, lossStreak);
  });

  const bestWin = player.matches.filter(m => m.result === 'Win')
    .reduce((prev, curr) => (curr.eloChange > (prev?.eloChange || -Infinity) ? curr : prev), null);

  const worstLoss = player.matches.filter(m => m.result === 'Loss')
    .reduce((prev, curr) => (curr.eloChange < (prev?.eloChange || Infinity) ? curr : prev), null);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Player Info Header */}
      <div className="bg-white shadow-lg rounded-2xl p-6 mb-6 border border-gray-200 relative">
        {/* Rank badge */}
        <div className={`absolute top-4 right-4 px-8 py-3 rounded-full font-bold text-lg shadow ${color}`}>
          {rank}
        </div>
        {/* Player name and location */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-800 mb-1">{player.name}</h1>
        {(player.state || player.country) && (
          <p className="text-xl text-gray-600 mb-2">
            {player.state && <span>{player.state}</span>}
            {player.state && player.country && <span>, </span>}
            {player.country && <span>{player.country}</span>}
          </p>
        )}
        {/* Elo */}
        <p className="text-2xl font-bold text-indigo-700 mb-2">Elo: {Math.round(player.elo)}</p>

        {/* Avg Opponent Elo */}
        <p className="text-lg text-gray-600 mb-2">Avg. Opponent Elo: {averageOpponentElo}</p>

        {mostPlayedFactions && (
          <p className="text-xl font-semibold text-gray-700 mb-4">{mostPlayedFactions}</p>
        )}

        <div className="bg-blue-100 text-blue-900 rounded-lg px-4 py-2 inline-block font-medium text-lg mb-4">
          Winrate: {winrate}%
        </div>

        {/* Show More Stats button */}
        <div className="flex justify-center">
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mt-2"
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? 'Hide Stats' : 'Show More Stats'}
          </button>
        </div>

        {/* Stats Section */}
        {showStats && (
          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Games Played</p>
                <p className="text-xl font-bold">{totalMatches}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Wins</p>
                <p className="text-xl font-bold text-green-800">{totalWins}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Losses</p>
                <p className="text-xl font-bold text-red-700">{totalLosses}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Draws</p>
                <p className="text-xl font-bold text-yellow-700">{totalDraws}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Longest Win Streak</p>
                <p className="text-xl font-bold">{maxWinStreak}</p>
              </div>
              <div className="bg-rose-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Longest Loss Streak</p>
                <p className="text-xl font-bold">{maxLossStreak}</p>
              </div>
            </div>

            {bestWin && (
              <div className="bg-green-100 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-600">
                  Best Win: +{bestWin.eloChange} Elo vs {bestWin.opponentName}
                </p>
              </div>
            )}

            {worstLoss && (
              <div className="bg-red-100 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-600">
                  Worst Loss: {worstLoss.eloChange} Elo vs {worstLoss.opponentName}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Elo Progression Chart */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-700 mb-4">Elo Progression</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={eloHistory}>
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <XAxis dataKey="match" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Line type="monotone" dataKey="elo" stroke="#8884d8" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Match History */}
      <div className="bg-white shadow rounded-2xl p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-700 mb-4">Match History</h2>
        <ul className="space-y-3">
          {(showMoreMatches ? annotatedMatches.slice().reverse() : annotatedMatches.slice().reverse().slice(0, 3)).map((match, idx) => {
            let resultClass = 'bg-gray-100 border-gray-300';
            if (match.result === 'Win') resultClass = 'bg-green-200 border-green-400';
            else if (match.result === 'Loss') resultClass = 'bg-red-200 border-red-400';

            return (
              <li key={idx} className={`border rounded-lg p-3 flex justify-between items-start ${resultClass}`}>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    vs {match.opponentName} ({match.playerFaction} vs {match.opponentFaction})
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(match.date).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })} | Game {match.gameNumber || idx + 1} {match.eventName && `| ${match.eventName}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    Score: {match.score} - {match.opponentScore}
                  </p>
                  {match.rankNote && (
                    <p className="text-sm text-yellow-700 font-medium">{match.rankNote}</p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p className={`font-bold ${match.eloChange >= 0 ? 'text-green-800' : 'text-red-700'}`}>
                    {match.eloChange >= 0 ? '📈 +' : '📉 '}{match.eloChange}
                  </p>
                  <p className="text-xs text-gray-500">Elo: {match.cumulativeElo}</p>
                </div>
              </li>
            );
          })}
        </ul>
        {annotatedMatches.length > 3 && (
          <div className="flex justify-center">
            <button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mt-4"
              onClick={() => setShowMoreMatches(!showMoreMatches)}
            >
              {showMoreMatches ? 'Show Less Matches' : 'Show More Matches'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}