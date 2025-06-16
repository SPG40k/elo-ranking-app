import React, { useState } from 'react';
import Papa from 'papaparse';
import { calculateElo, getRankFromElo } from '../utils/eloUtils';

function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export default function UploadCSV({ setAllPlayers }) {
  const [playersFile, setPlayersFile] = useState(null);
  const [matchesFile, setMatchesFile] = useState(null);

  const handleSubmitAll = () => {
    if (!playersFile || !matchesFile) {
      alert('Please upload both Players and Matches CSV files.');
      return;
    }

    Papa.parse(playersFile, {
      header: true,
      skipEmptyLines: true,
      complete: (playerResults) => {
        const players = playerResults.data
          .filter((row) => row.id && row.name)
          .map((row) => ({
            id: safeTrim(row.id),
            name: safeTrim(row.name),
            elo: Number(row.elo) || 1200,
            state: safeTrim(row.state) || null,
            country: safeTrim(row.country) || null,
            matches: [],
          }));

        const playerMap = {};
        players.forEach((p) => (playerMap[p.id] = p));

        Papa.parse(matchesFile, {
          header: true,
          skipEmptyLines: true,
          complete: (matchResults) => {
            const matches = matchResults.data;
            const seenMatches = new Set(); // 👈 Deduplication tracker

            matches.forEach((match) => {
              const p1Id = safeTrim(match.player1_id);
              const p2Id = safeTrim(match.player2_id);
              const score1 = Number(match.score1);
              const score2 = Number(match.score2);
              const matchDate = match.date || new Date().toISOString().split('T')[0];
              const eventName = safeTrim(match.eventName) || 'Unknown Event';
              const gameNumber = match.gameNumber || null;
              const p1Faction = safeTrim(match.player1Faction) || 'Unknown';
              const p2Faction = safeTrim(match.player2Faction) || 'Unknown';

              if (!p1Id || !p2Id || isNaN(score1) || isNaN(score2)) {
                console.warn('Skipping invalid match row:', match);
                return;
              }

              const matchKey = `${p1Id}_${p2Id}_${gameNumber}_${eventName}`; // 👈 Unique match key
              if (seenMatches.has(matchKey)) {
                console.warn('Skipping duplicate match:', matchKey);
                return;
              }
              seenMatches.add(matchKey); // 👈 Register this match

              const p1 = playerMap[p1Id];
              const p2 = playerMap[p2Id];

              if (!p1 || !p2) {
                console.warn('Skipping match with missing players:', match);
                return;
              }

              const isDraw = score1 === score2;
              const winner = score1 > score2 ? p1 : p2;
              const loser = score1 > score2 ? p2 : p1;
              const winnerScore = Math.max(score1, score2);
              const loserScore = Math.min(score1, score2);

              const p1OldRank = getRankFromElo(p1.elo);
              const p2OldRank = getRankFromElo(p2.elo);

              const eloChange = isDraw
                ? 0
                : calculateElo(winner.elo, loser.elo, winnerScore, loserScore);

              if (!isDraw) {
                winner.elo += eloChange;
                loser.elo -= eloChange;
              }

              const p1NewRank = getRankFromElo(p1.elo);
              const p2NewRank = getRankFromElo(p2.elo);

              const p1RankChange =
                p1OldRank !== p1NewRank ? `${p1OldRank} → ${p1NewRank}` : null;
              const p2RankChange =
                p2OldRank !== p2NewRank ? `${p2OldRank} → ${p2NewRank}` : null;

              // Add structured match data
              p1.matches.push({
                gameNumber: gameNumber,
                playerFaction: p1Faction,
                opponentFaction: p2Faction,
                opponentId: p2.id,
                opponentName: p2.name,
                opponentElo: p2.elo,
                score: score1,
                opponentScore: score2,
                result: isDraw ? 'Draw' : score1 > score2 ? 'Win' : 'Loss',
                eloChange: isDraw ? 0 : score1 > score2 ? +eloChange : -eloChange,
                date: matchDate,
                eventName: eventName,
                rankChange: p1RankChange,
              });

              p2.matches.push({
                gameNumber: gameNumber,
                playerFaction: p2Faction,
                opponentFaction: p1Faction,
                opponentId: p1.id,
                opponentName: p1.name,
                opponentElo: p1.elo,
                score: score2,
                opponentScore: score1,
                result: isDraw ? 'Draw' : score2 > score1 ? 'Win' : 'Loss',
                eloChange: isDraw ? 0 : score2 > score1 ? +eloChange : -eloChange,
                date: matchDate,
                eventName: eventName,
                rankChange: p2RankChange,
              });
            });

            console.log('Final players with match data:', players);
            setAllPlayers(players);
            alert('Players and Matches loaded, Elo updated successfully!');
          },
          error: (error) => {
            alert('Error parsing matches CSV: ' + error.message);
          },
        });
      },
      error: (error) => {
        alert('Error parsing players CSV: ' + error.message);
      },
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h3 className="font-bold mb-2">Step 1: Upload Players CSV</h3>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setPlayersFile(e.target.files[0])}
        />
      </div>

      <div>
        <h3 className="font-bold mb-2">Step 2: Upload Matches CSV</h3>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setMatchesFile(e.target.files[0])}
        />
      </div>

      {playersFile && matchesFile && (
        <button
          onClick={handleSubmitAll}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Submit All Data
        </button>
      )}
    </div>
  );
}