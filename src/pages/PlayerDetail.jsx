import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

// State color mapping (copied from Leaderboard)
const stateColors = {
  ACT: 'bg-blue-900 text-white',
  NSW: 'bg-blue-300 text-blue-900',
  NT: 'bg-red-800 text-white',
  QLD: 'bg-red-900 text-white',
  SA: 'bg-red-600 text-white',
  TAS: 'bg-green-800 text-white',
  VIC: 'bg-blue-800 text-white',
  WA: 'bg-yellow-300 text-yellow-900',
  NZN: 'bg-gray-300 text-gray-800',
  NZS: 'bg-gray-700 text-white',
};

export default function PlayerDetail({ allPlayers }) {
  const { id } = useParams();
  const [showMoreMatches, setShowMoreMatches] = useState(false);
  const [showStats, setShowStats] = useState(false);
  // For background image
  const [factionBgImage, setFactionBgImage] = useState(null);

  const player = allPlayers.find((p) => p.id === id);

  // Helper to get possible image filenames from faction name
  function getFactionImageCandidates(faction) {
    if (!faction) return [];
    const trimmed = faction.trim();
    const noParens = trimmed.replace(/[()']/g, '');
    const noSpecial = noParens.replace(/[^a-zA-Z0-9 \-_]/g, '');
    const underscore = noSpecial.replace(/\s+/g, '_');
    const noSpace = noSpecial.replace(/\s+/g, '');
    const lower = noSpecial.toLowerCase();
    const upper = noSpecial.toUpperCase();
    const variations = [
      trimmed,
      noParens,
      noSpecial,
      underscore,
      noSpace,
      lower,
      upper
    ];
    const extensions = ['.jpg', '.jpeg', '.png'];
    const candidates = [];
    for (const v of variations) {
      for (const ext of extensions) {
        candidates.push(`/images/${v}${ext}`);
      }
    }
    console.log('Faction image candidates for', faction, ':', candidates);
    window.factionImageCandidates = candidates; // For manual inspection
    return candidates;
  }

  // Calculate most played faction logic only if player exists
  let mostPlayedFactions = '';
  let mainFaction = null;
  if (player) {
    const factionCount = {};
    player.matches.forEach((m) => {
      const faction = m.playerFaction;
      if (faction) {
        factionCount[faction] = (factionCount[faction] || 0) + 1;
      }
    });
    const maxPlays = Math.max(...Object.values(factionCount), 0);
    mostPlayedFactions = Object.entries(factionCount)
      .filter(([_, count]) => count === maxPlays)
      .map(([faction]) => faction)
      .join(' & ');
    mainFaction = mostPlayedFactions.split(' & ')[0] || null;
  }

  useEffect(() => {
    if (!mainFaction) {
      setFactionBgImage(null);
      return;
    }
    const candidates = getFactionImageCandidates(mainFaction);
    let found = false;
    (async () => {
      for (const url of candidates) {
        try {
          const res = await fetch(url, { method: 'HEAD' });
          if (res.ok) {
            setFactionBgImage(url);
            found = true;
            console.log('Faction image found:', url);
            break;
          }
        } catch (e) { console.log('Error fetching', url, e); }
      }
      if (!found) {
        setFactionBgImage(null);
        console.log('No faction image found for', mainFaction);
      }
    })();
  }, [mainFaction]);

  if (!player) return <div className="p-6">Player not found.</div>;

  const getRankLabel = (elo, rankPosition = null) => {
    if (rankPosition && rankPosition > 0 && rankPosition <= 10) return 'War-Master';
    if (elo >= 2000) return 'Chapter-Master';
    if (elo >= 1900) return 'War-Lord';
    if (elo >= 1750) return 'Captain';
    if (elo >= 1600) return 'Lieutenant';
    if (elo >= 1450) return 'Sergeant';
    if (elo >= 1300) return 'Trooper';
    if (elo >= 1000) return 'Scout';
    return 'Scout';
  };

  const getRankInfo = (elo, rankPosition) => {
    const rank = getRankLabel(elo, rankPosition);
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
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      {/* Player Info Header */}
      <div
        className="shadow-lg rounded-2xl p-4 sm:p-6 mb-6 border border-gray-200 dark:border-gray-700 relative overflow-hidden"
        style={factionBgImage ? {
          minHeight: '280px',
          backgroundColor: 'transparent',
          backgroundImage: `url('${factionBgImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        } : {
          minHeight: '280px',
          backgroundColor: 'transparent'
        }}
      >
        {/* Rank badge and Elo */}
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex flex-col items-end gap-1 sm:gap-2">
          <span className={`px-4 sm:px-8 py-2 sm:py-3 rounded-full font-bold text-sm sm:text-lg shadow ${color}`}>{rank}</span>
          <span className="text-lg sm:text-xl font-bold text-white border-white rounded px-2 sm:px-4 py-1 shadow border mt-1">Elo: {Math.round(player.elo)}</span>
        </div>
        {/* Player name and location */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white mb-1 pr-20 sm:pr-0">{player.name}</h1>
        {player.state && (
          <div className="my-2 sm:my-4">
            <span
              className={`inline-block px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-sm sm:text-lg font-bold ${stateColors[player.state.toUpperCase()] || 'text-gray-600 dark:text-gray-300'}`}
              style={{ minWidth: 60, textAlign: 'center' }}
              title={player.state}
            >
              {player.state}
            </span>
          </div>
        )}

        {/* Avg Opponent Elo as a pill */}
        <div className="mb-2 sm:mb-4">
          {(() => {
            const { color } = getRankInfo(averageOpponentElo, null);
            return (
              <span
                className={`inline-block px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-sm sm:text-lg font-bold ${color}`}
                style={{ minWidth: 60, textAlign: 'center' }}
                title={`Avg. Opponent Elo: ${averageOpponentElo}`}
              >
                <span className="hidden sm:inline">Avg. Opponent Elo: </span>
                <span className="sm:hidden">Avg Opp: </span>
                {averageOpponentElo}
              </span>
            );
          })()}
        </div>

        <div className={`inline-block px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-sm sm:text-lg font-bold ${color} mb-4`} style={{ minWidth: 60, textAlign: 'center' }}>
          Winrate: {winrate}%
        </div>
      </div>

      {/* Show More Stats button and dropdown as a separate card */}
      <div className="flex justify-center">
        <button
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-4 text-sm sm:text-base"
          onClick={() => setShowStats(!showStats)}
        >
          {showStats ? 'Hide Stats' : 'Show More Stats'}
        </button>
      </div>
      {showStats && (
        <div className="space-y-4 mt-0 mb-6 bg-white dark:bg-gray-900 rounded-2xl shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          {/* Highest Achieved Elo and Rank */}
          <div className="mb-2">
            {(() => {
              // Find highest Elo and its rank
              let maxElo = player.elo;
              let runningElo = player.elo;
              let minIdx = player.matches.length - 1;
              for (let i = player.matches.length - 1; i >= 0; i--) {
                runningElo -= player.matches[i].eloChange || 0;
                if (runningElo > maxElo) {
                  maxElo = runningElo;
                  minIdx = i;
                }
              }
              // If player is currently War-Master (top 10), show that as highest achieved rank
              let highestRank;
              let color;
              if (rankPosition > 0 && rankPosition <= 10) {
                highestRank = 'War-Master';
                color = getRankInfo(maxElo, 1).color; // Use War-Master color
              } else {
                highestRank = getRankLabel(maxElo, null);
                color = getRankInfo(maxElo, null).color;
              }
              return (
                <div className="bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 rounded-lg px-3 sm:px-4 py-3 font-bold text-base sm:text-lg text-center flex flex-col items-center gap-2">
                  <span className={`inline-block px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-sm sm:text-lg font-bold ${color}`}
                    style={{ minWidth: 60, textAlign: 'center' }}
                    title={highestRank}
                  >
                    {highestRank}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-indigo-900 dark:text-indigo-100">Peak Elo: {Math.round(maxElo)}</span>
                </div>
              );
            })()}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-2 sm:p-3 rounded-lg text-gray-800 dark:text-gray-100">
              <p className="text-xs sm:text-sm text-gray-500">Games Played</p>
              <p className="text-lg sm:text-xl font-bold">{totalMatches}</p>
            </div>
            <div className="bg-green-100 p-2 sm:p-3 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">Wins</p>
              <p className="text-lg sm:text-xl font-bold text-green-800">{totalWins}</p>
            </div>
            <div className="bg-red-100 p-2 sm:p-3 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">Losses</p>
              <p className="text-lg sm:text-xl font-bold text-red-700">{totalLosses}</p>
            </div>
            <div className="bg-yellow-100 p-2 sm:p-3 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">Draws</p>
              <p className="text-lg sm:text-xl font-bold text-yellow-700">{totalDraws}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4 text-center">
            <div className="bg-green-50 p-2 sm:p-3 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">Longest Win Streak</p>
              <p className="text-lg sm:text-xl font-bold">{maxWinStreak}</p>
            </div>
            <div className="bg-rose-50 p-2 sm:p-3 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">Longest Loss Streak</p>
              <p className="text-lg sm:text-xl font-bold">{maxLossStreak}</p>
            </div>
          </div>

          {bestWin && (
            <div className="bg-green-100 p-2 sm:p-3 rounded-lg text-center">
              <p className="text-xs sm:text-sm text-gray-600">
                Best Win: +{bestWin.eloChange} Elo vs {bestWin.opponentName}
              </p>
            </div>
          )}

          {worstLoss && (
            <div className="bg-red-100 p-2 sm:p-3 rounded-lg text-center">
              <p className="text-xs sm:text-sm text-gray-600">
                Worst Loss: {worstLoss.eloChange} Elo vs {worstLoss.opponentName}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Elo Progression Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 sm:p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg sm:text-xl font-bold text-gray-700 dark:text-white mb-4">Elo Progression</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={eloHistory}>
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <XAxis dataKey="match" tick={{ fill: '#6b7280' }} />
            <YAxis domain={['auto', 'auto']} tick={{ fill: '#6b7280' }} />
            <Tooltip contentStyle={{ background: '#1a1a1a', color: '#fff', border: '1px solid #374151' }} labelStyle={{ color: '#fff' }} wrapperStyle={{ zIndex: 50 }} />
            <Line type="monotone" dataKey="elo" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#fff' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Match History */}
      <div className="bg-white dark:bg-gray-900 shadow rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg sm:text-xl font-bold text-gray-700 dark:text-white mb-4">Match History</h2>
        <ul className="space-y-3">
          {(showMoreMatches ? annotatedMatches.slice().reverse() : annotatedMatches.slice().reverse().slice(0, 3)).map((match, idx) => {
            let resultClass = 'bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600';
            if (match.result === 'Win') resultClass = 'bg-green-200 border-green-400 dark:bg-green-900 dark:border-green-500';
            else if (match.result === 'Loss') resultClass = 'bg-red-200 border-red-400 dark:bg-red-900 dark:border-red-500';

            // Calculate Elo for player and opponent before this match
            let playerEloBefore = match.cumulativeElo - (match.eloChange || 0);
            let opponentEloBefore = match.opponentElo;
            // If opponentElo is not present, fallback to 1500
            if (opponentEloBefore === undefined) opponentEloBefore = 1500;
            const playerRankAtMatch = getRankLabel(playerEloBefore, null);
            const opponentRankAtMatch = getRankLabel(opponentEloBefore, null);
            const { color: opponentRankColor } = getRankInfo(opponentEloBefore, null);

            return (
              <li key={idx} className={`border rounded-lg p-2 sm:p-3 flex justify-between items-start ${resultClass}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-white">
                    vs {match.opponentName}
                    <span className={`ml-2 sm:ml-4 inline-flex items-center justify-center px-1 sm:px-2 py-0.5 rounded-full text-xs font-bold ${opponentRankColor}`}
                      style={{ minWidth: 40, textAlign: 'center' }}
                      title={opponentRankAtMatch}
                    >
                      {opponentRankAtMatch}
                    </span>
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-1 mt-1">
                    ({match.playerFaction} vs {match.opponentFaction})
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    {new Date(match.date).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })} | Game {match.gameNumber || idx + 1} {match.eventName && `| ${match.eventName}`}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-200">
                    Score: {match.score} - {match.opponentScore}
                  </p>
                  {match.rankNote && (() => {
                    // Parse the rankNote, e.g., 'Promoted to War-Master' or 'Demoted to Chapter-Master'
                    const matchNoteMatch = match.rankNote.match(/(Promoted|Demoted) to (.+)/);
                    if (matchNoteMatch) {
                      const [, action, newRank] = matchNoteMatch;
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
                      const color = colorMap[newRank] || 'bg-gray-300 text-black';
                      return (
                        <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold mr-2 mt-2 mb-2 ${color}`}
                          style={{ minWidth: 60, textAlign: 'center' }}
                          title={newRank}
                        >
                          {action} to <span className="ml-1">{newRank}</span>
                        </span>
                      );
                    } else {
                      // fallback to plain text if parsing fails
                      return (
                        <span className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-200 font-medium">{match.rankNote}</span>
                      );
                    }
                  })()}
                </div>
                <div className="text-right text-xs sm:text-sm ml-2 flex-shrink-0">
                  <p className={`font-bold ${match.eloChange >= 0 ? 'text-green-800 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {match.eloChange >= 0 ? '📈 +' : '📉 '}{match.eloChange}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-200">Elo: {match.cumulativeElo}</p>
                </div>
              </li>
            );
          })}
        </ul>
        {annotatedMatches.length > 3 && (
          <div className="flex justify-center">
            <button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mt-4 text-sm sm:text-base"
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