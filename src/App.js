import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
} from 'react-router-dom';

import Leaderboard from './components/Leaderboard';
import TeamsLeaderboard from './components/TeamsLeaderboard';
import FactionWinrates from './components/FactionWinrates';
import SubmitMatch from './pages/SubmitMatch';
import UploadCSV from './components/UploadCSV';
import PlayerDetail from './pages/PlayerDetail';
import TeamsPlayerDetail from './pages/TeamsPlayerDetail';
import MatchManager from './pages/MatchManager';
import Papa from 'papaparse';
import { calculateElo, getRankFromElo, calculateTeamEloForMatch } from './utils/eloUtils';
import OverallLeaderboard from './components/OverallLeaderboard';
import OverallPlayerDetail from './pages/OverallPlayerDetail';

function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export default function App() {
  const [allPlayers, setAllPlayers] = useState([]);
  const [allTeamsPlayers, setAllTeamsPlayers] = useState([]);

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
        // Load players data
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
        
        // Load singles matches
        const matches = await fetchCSV('/singles_matches.csv');
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

        // Load teams data
        const teamsPlayers = (await fetchCSV('/players.csv'))
          .filter((row) => row.id && row.name)
          .map((row) => ({
            id: safeTrim(row.id),
            name: safeTrim(row.name),
            elo: Number(row.elo) || 1200,
            state: safeTrim(row.state) || null,
            country: safeTrim(row.country) || null,
            matches: [],
          }));
        
        const teamsPlayerMap = {};
        teamsPlayers.forEach((p) => (teamsPlayerMap[p.id] = p));
        
        // Load teams matches
        const teamsMatches = await fetchCSV('/teams_matches.csv');
        const seenTeamsMatches = new Set();
        teamsMatches.forEach((match) => {
          const p1Id = safeTrim(match.player1_id);
          const p2Id = safeTrim(match.player2_id);
          const score1 = Number(match.score1);
          const score2 = Number(match.score2);
          const matchDate = match.date || new Date().toISOString().split('T')[0];
          const eventName = safeTrim(match.eventName) || safeTrim(match.event_name) || 'Unknown Event';
          const gameNumber = match.gameNumber || match.game_number || null;
          const tableNumber = match.tableNumber || match.table_number || null;
          const p1Faction = safeTrim(match.player1Faction) || safeTrim(match.player1_faction) || 'Unknown';
          const p2Faction = safeTrim(match.player2Faction) || safeTrim(match.player2_faction) || 'Unknown';
          const teamScore1 = Number(match.teamscore1) || 0;
          const teamScore2 = Number(match.teamscore2) || 0;
          
          if (!p1Id || !p2Id || isNaN(score1) || isNaN(score2)) return;
          const matchKey = `${p1Id}_${p2Id}_${gameNumber}_${tableNumber}_${eventName}`;
          if (seenTeamsMatches.has(matchKey)) return;
          seenTeamsMatches.add(matchKey);
          
          const p1 = teamsPlayerMap[p1Id];
          const p2 = teamsPlayerMap[p2Id];
          if (!p1 || !p2) return;
          
          // Use new team Elo calculation
          const p1EloChange = calculateTeamEloForMatch(p1.elo, p2.elo, score1, score2, teamScore1, teamScore2);
          const p2EloChange = calculateTeamEloForMatch(p2.elo, p1.elo, score2, score1, teamScore2, teamScore1);
          p1.elo += p1EloChange;
          p2.elo += p2EloChange;

          const p1OldRank = getRankFromElo(p1.elo - p1EloChange);
          const p2OldRank = getRankFromElo(p2.elo - p2EloChange);
          const p1NewRank = getRankFromElo(p1.elo);
          const p2NewRank = getRankFromElo(p2.elo);
          const p1RankChange = p1OldRank !== p1NewRank ? `${p1OldRank} → ${p1NewRank}` : null;
          const p2RankChange = p2OldRank !== p2NewRank ? `${p2OldRank} → ${p2NewRank}` : null;
          
          p1.matches.push({
            gameNumber: gameNumber,
            tableNumber: tableNumber,
            playerFaction: p1Faction,
            opponentFaction: p2Faction,
            opponentId: p2.id,
            opponentName: p2.name,
            opponentElo: p2.elo - p2EloChange,
            score: score1,
            opponentScore: score2,
            teamScore: teamScore1,
            opponentTeamScore: teamScore2,
            result: score1 === score2 ? 'Draw' : score1 > score2 ? 'Win' : 'Loss',
            eloChange: p1EloChange,
            date: matchDate,
            eventName: eventName,
            rankChange: p1RankChange,
          });
          p2.matches.push({
            gameNumber: gameNumber,
            tableNumber: tableNumber,
            playerFaction: p2Faction,
            opponentFaction: p1Faction,
            opponentId: p1.id,
            opponentName: p1.name,
            opponentElo: p1.elo - p1EloChange,
            score: score2,
            opponentScore: score1,
            teamScore: teamScore2,
            opponentTeamScore: teamScore1,
            result: score2 === score1 ? 'Draw' : score2 > score1 ? 'Win' : 'Loss',
            eloChange: p2EloChange,
            date: matchDate,
            eventName: eventName,
            rankChange: p2RankChange,
          });
        });
        setAllTeamsPlayers(teamsPlayers);
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
      <nav className="p-4 bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {/* Logo */}
          <Link to="/" className="hover:text-indigo-300 flex items-center">
            <img src="/logos/SPG40klogo.png" alt="Logo" style={{ height: '64px', marginRight: '10px' }} />
          </Link>
          
          {/* Navigation Links with Borders */}
          <div className="flex items-center space-x-0">
            <Link 
              to="/overall-leaderboard" 
              className="px-4 py-2 border border-indigo-300 dark:border-indigo-600 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors duration-200 rounded-l-lg"
            >
              Overall Leaderboard
            </Link>
            <Link 
              to="/" 
              className="px-4 py-2 border-t border-b border-indigo-300 dark:border-indigo-600 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors duration-200"
            >
              Singles Leaderboard
            </Link>
            <Link 
              to="/teams" 
              className="px-4 py-2 border-t border-b border-indigo-300 dark:border-indigo-600 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors duration-200"
            >
              Teams Leaderboard
            </Link>
            <Link 
              to="/faction-winrates" 
              className="px-4 py-2 border border-indigo-300 dark:border-indigo-600 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors duration-200 rounded-r-lg"
            >
              Faction Winrates
            </Link>
          </div>
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
          <Route path="/teams" element={<TeamsLeaderboard allPlayers={allTeamsPlayers} />} />
          <Route path="/faction-winrates" element={<FactionWinrates />} />
          <Route path="/teams/player/:id" element={<TeamsPlayerDetail allPlayers={allTeamsPlayers} />} />
          <Route path="/submit" element={<SubmitMatch allPlayers={allPlayers} setAllPlayers={setAllPlayers} />} />
          <Route path="/upload" element={<UploadCSV setAllPlayers={setAllPlayers} />} />
          <Route path="/player/:id" element={<PlayerDetail allPlayers={allPlayers} />} />
          <Route path="/manage" element={<MatchManager allPlayers={allPlayers} setAllPlayers={setAllPlayers} />} />
          <Route path="/overall-leaderboard" element={<OverallLeaderboard />} />
          <Route path="/overall-player/:id" element={<OverallPlayerDetail />} />
        </Routes>
      </div>
    </Router>
  );
}