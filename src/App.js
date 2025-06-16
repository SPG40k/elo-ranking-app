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

export default function App() {
  const [allPlayers, setAllPlayers] = useState([]);

  // Theme state: 'light' or 'dark'
  const [theme, setTheme] = useState(() => {
    // Load saved theme from localStorage or default to 'light'
    return localStorage.getItem('theme') || 'light';
  });

  // Apply theme class to <body> element whenever theme changes
  useEffect(() => {
    document.body.className = theme;
    // Save preference
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle handler
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <Router>
      <nav className="p-4 bg-indigo-100 text-indigo-900 space-x-6 flex justify-between items-center">
        <div>
          <Link to="/" className="hover:text-indigo-300">Leaderboard</Link>
          {allPlayers.length > 0 && (
            <Link to="/submit" className="hover:text-indigo-300 ml-4">Submit Match</Link>
          )}
          <Link to="/upload" className="hover:text-indigo-300 ml-4">Upload CSV</Link>
          <Link to="/manage" className="hover:text-indigo-300 ml-4">Manage Matches</Link>
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

      <Routes>
        <Route path="/" element={<Leaderboard allPlayers={allPlayers} />} />
        <Route path="/submit" element={<SubmitMatch allPlayers={allPlayers} setAllPlayers={setAllPlayers} />} />
        <Route path="/upload" element={<UploadCSV setAllPlayers={setAllPlayers} />} />
        <Route path="/player/:id" element={<PlayerDetail allPlayers={allPlayers} />} />
        <Route path="/manage" element={<MatchManager allPlayers={allPlayers} setAllPlayers={setAllPlayers} />} />
      </Routes>
    </Router>
  );
}