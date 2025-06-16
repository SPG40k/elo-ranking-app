import React from 'react';
import Papa from 'papaparse';
import { calculateElo } from '../utils/elo'; // Correct import

function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export default function LoadMatchesCSV({ allPlayers, setAllPlayers }) {
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,

      step: function(results, parser) {
        const row = results.data;
        // console.log('Parsed row:', row); // Keep for debugging if needed

        if (
          !safeTrim(row.player1_id) ||
          !safeTrim(row.player2_id) ||
          !safeTrim(row.score1) ||
          !safeTrim(row.score2)
        ) {
          console.warn('Row with missing required fields (player1_id, player2_id, score1, score2):', row);
        }
      },

      complete: (results) => {
        const validRows = results.data.filter(row => {
          const p1 = safeTrim(row.player1_id);
          const p2 = safeTrim(row.player2_id);
          const s1 = safeTrim(row.score1);
          const s2 = safeTrim(row.score2);
          return p1 !== '' && p2 !== '' && s1 !== '' && s2 !== '';
        });

        // Create a deep copy of allPlayers to ensure immutability and correct updates
        const newPlayers = allPlayers.map(player => ({
          ...player,
          matches: [...(player.matches || [])], // Ensure matches array is also copied
          // Also include state and country safely if missing (optional)
          state: player.state || null,
          country: player.country || null,
        }));

        validRows.forEach(row => {
          const player1_id = safeTrim(row.player1_id);
          const player2_id = safeTrim(row.player2_id);
          const score1 = safeTrim(row.score1);
          const score2 = safeTrim(row.score2);
          const date = safeTrim(row.date);
          const eventName = safeTrim(row.eventName);
          const gameNumber = parseInt(safeTrim(row.gameNumber), 10);
          const player1Faction = safeTrim(row.player1Faction);
          const player2Faction = safeTrim(row.player2Faction);

          const p1Index = newPlayers.findIndex(p => p.id === player1_id);
          const p2Index = newPlayers.findIndex(p => p.id === player2_id);

          if (p1Index === -1 || p2Index === -1) {
            console.warn(`Player IDs not found in current players list: ${player1_id}, ${player2_id}. Skipping row.`);
            return;
          }

          // Get references to the *mutable copies* of players from newPlayers
          const p1 = newPlayers[p1Index];
          const p2 = newPlayers[p2Index];

          const p1Score = parseInt(score1, 10);
          const p2Score = parseInt(score2, 10);

          if (isNaN(p1Score) || isNaN(p2Score)) {
            console.warn(`Invalid scores for players ${player1_id} and ${player2_id}. Skipping row.`);
            return;
          }

          const matchDate = date || new Date().toISOString().split('T')[0]; // Use current date if not provided

          // Common match details
          const baseMatch = {
            date: matchDate,
            gameNumber: isNaN(gameNumber) ? null : gameNumber,
            eventName: eventName || null,
            score1: p1Score, // Store original scores from CSV
            score2: p2Score,
            player1_id: player1_id,
            player2_id: player2_id
          };

          if (p1Score === p2Score) { // Draw
            const eloChange = 0; // No Elo change for a draw

            // Player 1's perspective
            p1.matches.unshift({
              ...baseMatch,
              opponent: p2.name,
              result: 'Draw',
              score: `${p1Score}-${p2Score}`, // P1's score - P2's score
              eloChange: eloChange,
              playerFaction: player1Faction,
              opponentFaction: player2Faction,
              opponentElo: p2.elo // Opponent's Elo before this match
            });

            // Player 2's perspective
            p2.matches.unshift({
              ...baseMatch,
              opponent: p1.name,
              result: 'Draw',
              score: `${p2Score}-${p1Score}`, // P2's score - P1's score
              eloChange: eloChange,
              playerFaction: player2Faction,
              opponentFaction: player1Faction,
              opponentElo: p1.elo // Opponent's Elo before this match
            });

          } else { // Win/Loss
            let winnerPlayer, loserPlayer, winnerScore, loserScore;

            if (p1Score > p2Score) {
              winnerPlayer = p1;
              loserPlayer = p2;
              winnerScore = p1Score;
              loserScore = p2Score;
            } else {
              winnerPlayer = p2;
              loserPlayer = p1;
              winnerScore = p2Score;
              loserScore = p1Score;
            }

            // Calculate Elo change using the correct function name
            const eloChange = calculateElo(winnerPlayer.elo, loserPlayer.elo, winnerScore, loserScore);

            // Update Elos (on the mutable copies)
            winnerPlayer.elo += eloChange;
            loserPlayer.elo -= eloChange;

            // Winner's match log
            winnerPlayer.matches.unshift({
              ...baseMatch,
              opponent: loserPlayer.name,
              result: 'Win',
              score: `${winnerScore}-${loserScore}`,
              eloChange: +eloChange,
              playerFaction: winnerPlayer === p1 ? player1Faction : player2Faction,
              opponentFaction: winnerPlayer === p1 ? player2Faction : player1Faction,
              opponentElo: loserPlayer.elo // Opponent's Elo before this match
            });

            // Loser's match log
            loserPlayer.matches.unshift({
              ...baseMatch,
              opponent: winnerPlayer.name,
              result: 'Loss',
              score: `${loserScore}-${winnerScore}`,
              eloChange: -eloChange,
              playerFaction: loserPlayer === p1 ? player1Faction : player2Faction,
              opponentFaction: loserPlayer === p1 ? player2Faction : player1Faction,
              opponentElo: winnerPlayer.elo // Opponent's Elo before this match
            });
          }
        });

        setAllPlayers(newPlayers); // Update the state with the modified player data
      },
      error: (error) => {
        alert('Error parsing CSV: ' + error.message);
      },
    });
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Load Match Results from CSV</h2>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="border p-2 w-full"
      />
      <p className="mt-2 text-sm text-gray-600">
        CSV format: player1_id, player2_id, score1, score2, date (optional), eventName (optional), gameNumber (optional), player1Faction (optional), player2Faction (optional)
      </p>
    </div>
  );
}