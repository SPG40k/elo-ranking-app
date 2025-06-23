import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
} from 'react-router-dom';

import Leaderboard from './components/Leaderboard';
import SubmitMatch from './pages/SubmitMatch';
import UploadCSV from './components/UploadCSV';
import PlayerDetail from './pages/PlayerDetail';
import MatchManager from './pages/MatchManager';
import Papa from 'papaparse';
import { calculateElo, getRankFromElo } from './utils/eloUtils';

function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export default function App() {
  const [allPlayers, setAllPlayers] = useState([]);

  // Load player/match data from CSVs on app start
  useEffect(() => {
    const fetchCSV = async (path) => {
      const response = await fetch(path);
      const text = await response.text();
      return new Promise((resolve, reject) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error),
        });
      });
    };
    const loadData = async () => {
      try {
        const players = (await fetchCSV('/players.csv'))
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
        const matches = await fetchCSV('/matches.csv');
        const seenMatches = new Set();
        matches.forEach((match) => {
          const p1Id = safeTrim(match.player1_id);
          const p2Id = safeTrim(match.player2_id);
          const score1 = Number(match.score1);
          const score2 = Number(match.score2);
          const matchDate = match.date || new Date().toISOString().split('T')[0];
          const eventName = safeTrim(match.eventName) || safeTrim(match.event_name) || 'Unknown Event';
          const gameNumber = match.gameNumber || match.game_number || null;
          const p1Faction = safeTrim(match.player1Faction) || safeTrim(match.player1_faction) || 'Unknown';
          const p2Faction = safeTrim(match.player2Faction) || safeTrim(match.player2_faction) || 'Unknown';
          if (!p1Id || !p2Id || isNaN(score1) || isNaN(score2)) return;
          const matchKey = `${p1Id}_${p2Id}_${gameNumber}_${eventName}`;
          if (seenMatches.has(matchKey)) return;
          seenMatches.add(matchKey);
          const p1 = playerMap[p1Id];
          const p2 = playerMap[p2Id];
          if (!p1 || !p2) return;
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
        setAllPlayers(players);
      } catch (err) {
        // eslint-disable-next-line no-alert
        alert('Error loading CSV data: ' + err.message);
      }
    };
    loadData();
  }, []);

  // Theme state: 'light' or 'dark'
  const [theme, setTheme] = useState(() => {
    // Load saved theme from localStorage or default to 'dark'
    return localStorage.getItem('theme') || 'dark';
  });

  // Apply Tailwind dark mode class to <body> whenever theme changes
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle handler
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <Router>
      <nav className="p-4 bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100 space-x-6 flex justify-between items-center">
        <div>
          <Link to="/" className="hover:text-indigo-300">Leaderboard</Link>
          {/* {allPlayers.length > 0 && (
            <Link to="/submit" className="hover:text-indigo-300 ml-4">Submit Match</Link>
          )}
          <Link to="/upload" className="hover:text-indigo-300 ml-4">Upload CSV</Link>
          <Link to="/manage" className="hover:text-indigo-300 ml-4">Manage Matches</Link> */}
        </div>

        {/* Theme toggle button */}
        <button
          onClick={toggleTheme}
          className="ml-4 px-3 py-1 border rounded"
          aria-label="Toggle light/dark mode"
        >
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </nav>

      <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
        <Routes>
          <Route path="/" element={<Leaderboard allPlayers={allPlayers} />} />
          <Route path="/submit" element={<SubmitMatch allPlayers={allPlayers} setAllPlayers={setAllPlayers} />} />
          <Route path="/upload" element={<UploadCSV setAllPlayers={setAllPlayers} />} />
          <Route path="/player/:id" element={<PlayerDetail allPlayers={allPlayers} />} />
          <Route path="/manage" element={<MatchManager allPlayers={allPlayers} setAllPlayers={setAllPlayers} />} />
        </Routes>
      </div>
    </Router>
  );
}