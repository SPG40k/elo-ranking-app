import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';

function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Function to normalize faction names by consolidating sub-factions
function normalizeFactionName(factionName) {
  const factionMap = {
    'Ultramarines': 'Space Marines (Astartes)',
    'Salamanders': 'Space Marines (Astartes)',
    'Iron Hands': 'Space Marines (Astartes)',
    'Farsight Enclaves': 'T\'au Empire',
    'Steel Legion': 'Astra Militarum',
    'Hive Fleet Leviathan': 'Tyranids',
    'Hive Fleet Hydra': 'Tyranids',
    'Hive Fleet Hyrda': 'Tyranids',
    'Forces of the Hive Mind': 'Tyranids',
    'Maynarkh': 'Necrons',
    'Deathwing': 'Dark Angels',
    'Iron Warriors': 'Chaos Space Marines',
    'Alpha Legion': 'Chaos Space Marines',
    'Khorne Daemons': 'Chaos Daemons',
    'Adeptus Titanticus': 'Adeptus Titanicus'
  };
  
  // Try exact match first
  if (factionMap[factionName]) {
    return factionMap[factionName];
  }
  
  // Try case-insensitive match
  const lowerFactionName = factionName.toLowerCase();
  for (const [key, value] of Object.entries(factionMap)) {
    if (key.toLowerCase() === lowerFactionName) {
      return value;
    }
  }
  
  return factionName;
}

export default function FactionWinrates() {
  const [factionStats, setFactionStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

  const handleFactionClick = (factionName) => {
    navigate(`/faction-leaderboard/${encodeURIComponent(factionName)}`);
  };

  useEffect(() => {
    // Check if dark mode is enabled
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    // Initial check
    checkDarkMode();

    // Set up observer to watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

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

    const loadFactionStats = async () => {
      try {
        setLoading(true);
        
        // Load singles matches
        const singlesMatches = await fetchCSV('/singles_matches.csv');
        
        // Load teams matches
        const teamsMatches = await fetchCSV('/teams_matches.csv');
        
        // Combine all matches
        const allMatches = [...singlesMatches, ...teamsMatches];
        
        // Calculate faction statistics
        const factionData = {};
        
        allMatches.forEach((match) => {
          const rawP1Faction = safeTrim(match.player1Faction) || safeTrim(match.player1_faction) || 'Unknown';
          const rawP2Faction = safeTrim(match.player2Faction) || safeTrim(match.player2_faction) || 'Unknown';
          const p1Faction = normalizeFactionName(rawP1Faction);
          const p2Faction = normalizeFactionName(rawP2Faction);
          const score1 = Number(match.score1);
          const score2 = Number(match.score2);
          
          // Debug logging for Hive Fleet related factions
          if (rawP1Faction.toLowerCase().includes('hive') || rawP2Faction.toLowerCase().includes('hive')) {
            console.log('Hive Fleet Debug:', {
              rawP1: rawP1Faction,
              normalizedP1: p1Faction,
              rawP2: rawP2Faction,
              normalizedP2: p2Faction
            });
          }
          
          if (!p1Faction || !p2Faction || isNaN(score1) || isNaN(score2)) return;
          
          // Initialize faction data if not exists
          if (!factionData[p1Faction]) {
            factionData[p1Faction] = { wins: 0, losses: 0, draws: 0, totalGames: 0 };
          }
          if (!factionData[p2Faction]) {
            factionData[p2Faction] = { wins: 0, losses: 0, draws: 0, totalGames: 0 };
          }
          
          // Update statistics
          factionData[p1Faction].totalGames++;
          factionData[p2Faction].totalGames++;
          
          if (score1 > score2) {
            factionData[p1Faction].wins++;
            factionData[p2Faction].losses++;
          } else if (score1 < score2) {
            factionData[p1Faction].losses++;
            factionData[p2Faction].wins++;
          } else {
            factionData[p1Faction].draws++;
            factionData[p2Faction].draws++;
          }
        });
        
        // Calculate win rates and sort by win rate
        const factionStatsArray = Object.entries(factionData)
          .map(([faction, stats]) => ({
            faction,
            ...stats,
            winRate: stats.totalGames > 0 ? ((stats.wins / stats.totalGames) * 100).toFixed(1) : 0,
            lossRate: stats.totalGames > 0 ? ((stats.losses / stats.totalGames) * 100).toFixed(1) : 0,
            drawRate: stats.totalGames > 0 ? ((stats.draws / stats.totalGames) * 100).toFixed(1) : 0,
          }))
          .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));
        
        setFactionStats(factionStatsArray);
        setLoading(false);
      } catch (err) {
        setError('Error loading faction statistics: ' + err.message);
        setLoading(false);
      }
    };

    loadFactionStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading faction statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Faction Leaderboard
        </h1>
        
        {/* Space Marines Collective Summary */}
        <div className="mb-8 flex justify-center">
          <div className="w-[1150px] h-[120px] rounded-lg shadow-2xl border-2 border-blue-600 relative overflow-hidden bg-indigo-50 dark:bg-transparent">
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ 
                backgroundImage: `url('/images/Space Marines (Superfaction).jpg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            ></div>
            {/* Content */}
            <div className="relative h-full flex items-center justify-between px-8">
              {/* Title with frosted glass background */}
              <div className="flex-1">
                <div className="inline-block bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white border-opacity-30">
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                    Space Marines (Superfaction)
                  </h3>
                </div>
              </div>
              {/* Collective Statistics - Stat Boxes */}
              <div className="flex gap-4">
                {/* Wins */}
                <div className="bg-indigo-100 dark:bg-white dark:bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {(() => {
                      const spaceMarineFactions = [
                        'Space Marines (Astartes)',
                        'Blood Angels', 
                        'Dark Angels',
                        'Space Wolves',
                        'Black Templars',
                        'Deathwatch'
                      ];
                      return spaceMarineFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.wins || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-200">Wins</div>
                </div>
                {/* Losses */}
                <div className="bg-red-100 dark:bg-white dark:bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {(() => {
                      const spaceMarineFactions = [
                        'Space Marines (Astartes)',
                        'Blood Angels', 
                        'Dark Angels',
                        'Space Wolves',
                        'Black Templars',
                        'Deathwatch'
                      ];
                      return spaceMarineFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.losses || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-200">Losses</div>
                </div>
                {/* Draws */}
                <div className="bg-yellow-100 dark:bg-white dark:bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {(() => {
                      const spaceMarineFactions = [
                        'Space Marines (Astartes)',
                        'Blood Angels', 
                        'Dark Angels',
                        'Space Wolves',
                        'Black Templars',
                        'Deathwatch'
                      ];
                      return spaceMarineFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.draws || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-200">Draws</div>
                </div>
                {/* Games */}
                <div className="bg-blue-100 dark:bg-white dark:bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {(() => {
                      const spaceMarineFactions = [
                        'Space Marines (Astartes)',
                        'Blood Angels', 
                        'Dark Angels',
                        'Space Wolves',
                        'Black Templars',
                        'Deathwatch'
                      ];
                      return spaceMarineFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.totalGames || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-200">Games</div>
                </div>
              </div>
              {/* Circular Win Rate Graph */}
              <div className="flex items-center justify-center ml-6">
                <div className="relative w-16 h-16">
                  {/* Frosted glass background circle */}
                  <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                  <svg className="w-16 h-16 transform -rotate-90 relative z-10" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="none" />
                    <circle cx="32" cy="32" r="28" stroke="url(#headerGradient)" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 28}`} strokeDashoffset={`${2 * Math.PI * 28 * (1 - (() => {
                      const spaceMarineFactions = [
                        'Space Marines (Astartes)',
                        'Blood Angels', 
                        'Dark Angels',
                        'Space Wolves',
                        'Black Templars',
                        'Deathwatch'
                      ];
                      const totalWins = spaceMarineFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.wins || 0);
                      }, 0);
                      const totalGames = spaceMarineFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.totalGames || 0);
                      }, 0);
                      return totalGames > 0 ? (totalWins / totalGames) : 0;
                    })())}`} className="transition-all duration-1000 ease-out" />
                    <defs>
                      <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#60a5fa" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <span className="text-white text-lg font-bold drop-shadow-lg">
                      {(() => {
                        const spaceMarineFactions = [
                          'Space Marines (Astartes)',
                          'Blood Angels', 
                          'Dark Angels',
                          'Space Wolves',
                          'Black Templars',
                          'Deathwatch'
                        ];
                        const totalWins = spaceMarineFactions.reduce((total, faction) => {
                          const stats = factionStats.find(f => f.faction === faction);
                          return total + (stats?.wins || 0);
                        }, 0);
                        const totalGames = spaceMarineFactions.reduce((total, faction) => {
                          const stats = factionStats.find(f => f.faction === faction);
                          return total + (stats?.totalGames || 0);
                        }, 0);
                        return totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
                      })()}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Space Marines (Superfaction) Section */}
        <div className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Space Marines (Astartes) Showcase */}
            {factionStats.find(f => f.faction === 'Space Marines (Astartes)') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:'160px'}}
                onClick={() => handleFactionClick('Space Marines (Astartes)')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Space Marines (Astartes).jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Space Marines (Astartes)')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Space Marines (Astartes)')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Space Marines
                    </div>
                    <div className="text-xs text-gray-200 font-semibold">(Astartes)</div>
                  </div>
                  
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Space Marines (Astartes)')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Space Marines (Astartes)')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Space Marines (Astartes)')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Space Marines (Astartes)')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Ultramarines, Salamanders, Iron Hands
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Blood Angels Showcase */}
            {factionStats.find(f => f.faction === 'Blood Angels') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:'160px'}}
                onClick={() => handleFactionClick('Blood Angels')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Blood Angels.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Blood Angels')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Blood Angels')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Blood Angels
                    </div>
                  </div>
                  
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Blood Angels')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Blood Angels')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Blood Angels')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Blood Angels')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Blood Angels
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dark Angels Showcase */}
            {factionStats.find(f => f.faction === 'Dark Angels') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:'160px'}}
                onClick={() => handleFactionClick('Dark Angels')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Dark Angels.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Dark Angels')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Dark Angels')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Dark Angels
                    </div>
                  </div>
                  
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Dark Angels')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Dark Angels')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Dark Angels')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Dark Angels')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Deathwing
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Space Wolves Showcase */}
            {factionStats.find(f => f.faction === 'Space Wolves') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:'160px'}}
                onClick={() => handleFactionClick('Space Wolves')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Space Wolves.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Space Wolves')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Space Wolves')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Space Wolves
                    </div>
                  </div>
                  
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Space Wolves')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Space Wolves')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Space Wolves')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Space Wolves')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Space Wolves
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Black Templars Showcase */}
            {factionStats.find(f => f.faction === 'Black Templars') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:'160px'}}
                onClick={() => handleFactionClick('Black Templars')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Black Templars.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Black Templars')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Black Templars')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Black Templars
                    </div>
                  </div>
                  
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Black Templars')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Black Templars')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Black Templars')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Black Templars')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Black Templars
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Deathwatch Showcase */}
            {factionStats.find(f => f.faction === 'Deathwatch') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:'160px'}}
                onClick={() => handleFactionClick('Deathwatch')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Deathwatch.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Deathwatch')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Deathwatch')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Deathwatch
                    </div>
                  </div>
                  
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Deathwatch')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Deathwatch')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Deathwatch')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Deathwatch')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Deathwatch
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Armies of the Imperium (Superfaction) Section */}
        <div className="mb-12">
          {/* Imperium Superfaction Header Card */}
          <div className="w-[1150px] h-[120px] rounded-lg shadow-2xl border-2 border-yellow-600 relative overflow-hidden mx-auto mb-8">
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ 
                backgroundImage: `url('/images/Imperium (Superfaction).jpg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            ></div>
            {/* Content */}
            <div className="relative h-full flex items-center justify-between px-8">
              {/* Title with frosted glass background */}
              <div className="flex-1">
                <div className="inline-block bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white border-opacity-30">
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                    Armies of the Imperium (Superfaction)
                  </h3>
                </div>
              </div>
              {/* Collective Statistics - Stat Boxes (Imperium) */}
              <div className="flex gap-4">
                {/* Wins */}
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {(() => {
                      const imperiumFactions = [
                        'Astra Militarum',
                        'Adeptus Custodes',
                        'Imperial Knights',
                        'Adepta Sororitas',
                        'Grey Knights',
                        'Adeptus Mechanicus',
                        'Imperial Agents',
                        'Adeptus Titanicus'
                      ];
                      return imperiumFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.wins || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-200">Wins</div>
                </div>
                {/* Losses */}
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {(() => {
                      const imperiumFactions = [
                        'Astra Militarum',
                        'Adeptus Custodes',
                        'Imperial Knights',
                        'Adepta Sororitas',
                        'Grey Knights',
                        'Adeptus Mechanicus',
                        'Imperial Agents',
                        'Adeptus Titanicus'
                      ];
                      return imperiumFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.losses || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-200">Losses</div>
                </div>
                {/* Draws */}
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {(() => {
                      const imperiumFactions = [
                        'Astra Militarum',
                        'Adeptus Custodes',
                        'Imperial Knights',
                        'Adepta Sororitas',
                        'Grey Knights',
                        'Adeptus Mechanicus',
                        'Imperial Agents',
                        'Adeptus Titanicus'
                      ];
                      return imperiumFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.draws || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-200">Draws</div>
                </div>
                {/* Games */}
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {(() => {
                      const imperiumFactions = [
                        'Astra Militarum',
                        'Adeptus Custodes',
                        'Imperial Knights',
                        'Adepta Sororitas',
                        'Grey Knights',
                        'Adeptus Mechanicus',
                        'Imperial Agents',
                        'Adeptus Titanicus'
                      ];
                      return imperiumFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.totalGames || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-200">Games</div>
                </div>
              </div>
              {/* Circular Win Rate Graph */}
              <div className="flex items-center justify-center ml-6">
                <div className="relative w-16 h-16">
                  {/* Frosted glass background circle */}
                  <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                  <svg className="w-16 h-16 transform -rotate-90 relative z-10" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="none" />
                    <circle cx="32" cy="32" r="28" stroke="url(#imperiumHeaderGradient)" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 28}`} strokeDashoffset={`${2 * Math.PI * 28 * (1 - (() => {
                      const imperiumFactions = [
                        'Astra Militarum',
                        'Adeptus Custodes',
                        'Imperial Knights',
                        'Adepta Sororitas',
                        'Grey Knights',
                        'Adeptus Mechanicus',
                        'Imperial Agents',
                        'Adeptus Titanicus'
                      ];
                      const totalWins = imperiumFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.wins || 0);
                      }, 0);
                      const totalGames = imperiumFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.totalGames || 0);
                      }, 0);
                      return totalGames > 0 ? (totalWins / totalGames) : 0;
                    })())}`} className="transition-all duration-1000 ease-out" />
                    <defs>
                      <linearGradient id="imperiumHeaderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#facc15" />
                        <stop offset="100%" stopColor="#fde68a" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <span className="text-white text-lg font-bold drop-shadow-lg">
                      {(() => {
                        const imperiumFactions = [
                          'Astra Militarum',
                          'Adeptus Custodes',
                          'Imperial Knights',
                          'Adepta Sororitas',
                          'Grey Knights',
                          'Adeptus Mechanicus',
                          'Imperial Agents',
                          'Adeptus Titanicus'
                        ];
                        const totalWins = imperiumFactions.reduce((total, faction) => {
                          const stats = factionStats.find(f => f.faction === faction);
                          return total + (stats?.wins || 0);
                        }, 0);
                        const totalGames = imperiumFactions.reduce((total, faction) => {
                          const stats = factionStats.find(f => f.faction === faction);
                          return total + (stats?.totalGames || 0);
                        }, 0);
                        return totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
                      })()}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Astra Militarum Showcase */}
            {factionStats.find(f => f.faction === 'Astra Militarum') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:'160px'}}
                onClick={() => handleFactionClick('Astra Militarum')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Astra Militarum.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Astra Militarum')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Astra Militarum')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Astra Militarum
                    </div>
                  </div>
                  
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Astra Militarum')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Astra Militarum')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Astra Militarum')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Astra Militarum')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Steel Legion
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Adeptus Custodes Showcase */}
            {factionStats.find(f => f.faction === 'Adeptus Custodes') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:'160px'}}
                onClick={() => handleFactionClick('Adeptus Custodes')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Adeptus Custodes.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Adeptus Custodes')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Adeptus Custodes')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Adeptus Custodes
                    </div>
                  </div>
                  
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Adeptus Custodes')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Adeptus Custodes')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Adeptus Custodes')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Adeptus Custodes')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Adeptus Custodes
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Imperial Knights Showcase */}
            {factionStats.find(f => f.faction === 'Imperial Knights') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:'160px'}}
                onClick={() => handleFactionClick('Imperial Knights')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Imperial Knights.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Imperial Knights')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Imperial Knights')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Imperial Knights
                    </div>
                  </div>
                  
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Imperial Knights')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Imperial Knights')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Imperial Knights')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Imperial Knights')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Imperial Knights
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Adepta Sororitas Showcase */}
            {factionStats.find(f => f.faction === 'Adepta Sororitas') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:'160px'}}
                onClick={() => handleFactionClick('Adepta Sororitas')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Adepta Sororitas.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Adepta Sororitas')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Adepta Sororitas')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Adepta Sororitas
                    </div>
                  </div>
                  
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Adepta Sororitas')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Adepta Sororitas')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Adepta Sororitas')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Adepta Sororitas')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Adepta Sororitas
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grey Knights Showcase */}
            {factionStats.find(f => f.faction === 'Grey Knights') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:'160px'}}
                onClick={() => handleFactionClick('Grey Knights')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Grey Knights.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Grey Knights')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Grey Knights')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Grey Knights
                    </div>
                  </div>
                  
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Grey Knights')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Grey Knights')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Grey Knights')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Grey Knights')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Grey Knights
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Adeptus Mechanicus Showcase */}
            {factionStats.find(f => f.faction === 'Adeptus Mechanicus') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:'160px'}}
                onClick={() => handleFactionClick('Adeptus Mechanicus')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Adeptus Mechanicus.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Adeptus Mechanicus')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Adeptus Mechanicus')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Adeptus Mechanicus
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Adeptus Mechanicus')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Adeptus Mechanicus')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Adeptus Mechanicus')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Adeptus Mechanicus')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Adeptus Mechanicus
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Imperial Agents Showcase */}
            {factionStats.find(f => f.faction === 'Imperial Agents') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:'160px'}}
                onClick={() => handleFactionClick('Imperial Agents')}
              >
                {/* Background Image - Using a generic Imperial image since Imperial Agents might not have a specific image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Imperial Agents.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Imperial Agents')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Imperial Agents')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Imperial Agents
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Imperial Agents')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Imperial Agents')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Imperial Agents')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Imperial Agents')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Imperial Agents
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Adeptus Titanicus Showcase */}
            {factionStats.find(f => f.faction === 'Adeptus Titanicus') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:'160px'}}
                onClick={() => handleFactionClick('Adeptus Titanicus')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Adeptus Titanticus.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Adeptus Titanicus')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Adeptus Titanicus')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Adeptus Titanicus
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Adeptus Titanicus')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Adeptus Titanicus')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Adeptus Titanicus')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Adeptus Titanicus')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Adeptus Titanicus
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Forces of Chaos (Superfaction) Section */}
        <div className="mb-12">
          {/* Chaos Superfaction Header Card */}
          <div className="w-[1150px] h-[120px] rounded-lg shadow-2xl border-2 border-red-600 relative overflow-hidden mx-auto mb-8">
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ 
                backgroundImage: `url('/images/Chaos (Superfaction).jpg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            ></div>
            {/* Content */}
            <div className="relative h-full flex items-center justify-between px-8">
              {/* Title with frosted glass background */}
              <div className="flex-1">
                <div className="inline-block bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white border-opacity-30">
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                    Forces of Chaos (Superfaction)
                  </h3>
                </div>
              </div>
              {/* Collective Statistics - Stat Boxes (Chaos) */}
              <div className="flex gap-4">
                {/* Wins */}
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {(() => {
                      const chaosFactions = [
                        'World Eaters',
                        'Chaos Daemons',
                        'Death Guard',
                        'Chaos Knights',
                        'Chaos Space Marines',
                        'Thousand Sons',
                        "Emperor's Children",
                        'Chaos'
                      ];
                      return chaosFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.wins || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-200">Wins</div>
                </div>
                {/* Losses */}
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {(() => {
                      const chaosFactions = [
                        'World Eaters',
                        'Chaos Daemons',
                        'Death Guard',
                        'Chaos Knights',
                        'Chaos Space Marines',
                        'Thousand Sons',
                        "Emperor's Children",
                        'Chaos'
                      ];
                      return chaosFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.losses || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-200">Losses</div>
                </div>
                {/* Draws */}
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {(() => {
                      const chaosFactions = [
                        'World Eaters',
                        'Chaos Daemons',
                        'Death Guard',
                        'Chaos Knights',
                        'Chaos Space Marines',
                        'Thousand Sons',
                        "Emperor's Children",
                        'Chaos'
                      ];
                      return chaosFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.draws || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-200">Draws</div>
                </div>
                {/* Games */}
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {(() => {
                      const chaosFactions = [
                        'World Eaters',
                        'Chaos Daemons',
                        'Death Guard',
                        'Chaos Knights',
                        'Chaos Space Marines',
                        'Thousand Sons',
                        "Emperor's Children",
                        'Chaos'
                      ];
                      return chaosFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.totalGames || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-200">Games</div>
                </div>
              </div>
              {/* Circular Win Rate Graph */}
              <div className="flex items-center justify-center ml-6">
                <div className="relative w-16 h-16">
                  {/* Frosted glass background circle */}
                  <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                  <svg className="w-16 h-16 transform -rotate-90 relative z-10" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="none" />
                    <circle cx="32" cy="32" r="28" stroke="url(#chaosHeaderGradient)" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 28}`} strokeDashoffset={`${2 * Math.PI * 28 * (1 - (() => {
                      const chaosFactions = [
                        'World Eaters',
                        'Chaos Daemons',
                        'Death Guard',
                        'Chaos Knights',
                        'Chaos Space Marines',
                        'Thousand Sons',
                        "Emperor's Children",
                        'Chaos'
                      ];
                      const totalWins = chaosFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.wins || 0);
                      }, 0);
                      const totalGames = chaosFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.totalGames || 0);
                      }, 0);
                      return totalGames > 0 ? (totalWins / totalGames) : 0;
                    })())}`} className="transition-all duration-1000 ease-out" />
                    <defs>
                      <linearGradient id="chaosHeaderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#f87171" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <span className="text-white text-lg font-bold drop-shadow-lg">
                      {(() => {
                        const chaosFactions = [
                          'World Eaters',
                          'Chaos Daemons',
                          'Death Guard',
                          'Chaos Knights',
                          'Chaos Space Marines',
                          'Thousand Sons',
                          "Emperor's Children",
                          'Chaos'
                        ];
                        const totalWins = chaosFactions.reduce((total, faction) => {
                          const stats = factionStats.find(f => f.faction === faction);
                          return total + (stats?.wins || 0);
                        }, 0);
                        const totalGames = chaosFactions.reduce((total, faction) => {
                          const stats = factionStats.find(f => f.faction === faction);
                          return total + (stats?.totalGames || 0);
                        }, 0);
                        return totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
                      })()}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* World Eaters Showcase */}
            {factionStats.find(f => f.faction === 'World Eaters') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:'160px'}}
                onClick={() => handleFactionClick('World Eaters')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/World Eaters.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'World Eaters')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'World Eaters')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      World Eaters
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'World Eaters')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'World Eaters')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'World Eaters')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'World Eaters')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> World Eaters
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chaos Daemons Showcase */}
            {factionStats.find(f => f.faction === 'Chaos Daemons') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:"160px"}}
                onClick={() => handleFactionClick('Chaos Daemons')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Chaos Daemons.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Chaos Daemons')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Chaos Daemons')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Chaos Daemons
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Chaos Daemons')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Chaos Daemons')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Chaos Daemons')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Chaos Daemons')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Chaos Daemons
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Death Guard Showcase */}
            {factionStats.find(f => f.faction === 'Death Guard') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:"160px"}}
                onClick={() => handleFactionClick('Death Guard')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Death Guard.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Death Guard')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Death Guard')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Death Guard
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Death Guard')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Death Guard')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Death Guard')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Death Guard')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Death Guard
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chaos Knights Showcase */}
            {factionStats.find(f => f.faction === 'Chaos Knights') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:"160px"}}
                onClick={() => handleFactionClick('Chaos Knights')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Chaos Knights.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Chaos Knights')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Chaos Knights')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Chaos Knights
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Chaos Knights')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Chaos Knights')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Chaos Knights')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Chaos Knights')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Chaos Knights
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chaos Space Marines Showcase */}
            {factionStats.find(f => f.faction === 'Chaos Space Marines') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:"160px"}}
                onClick={() => handleFactionClick('Chaos Space Marines')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Chaos Space Marines.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Chaos Space Marines')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Chaos Space Marines')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Chaos Space Marines
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Chaos Space Marines')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Chaos Space Marines')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Chaos Space Marines')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Chaos Space Marines')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Chaos Space Marines
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Thousand Sons Showcase */}
            {factionStats.find(f => f.faction === 'Thousand Sons') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:"160px"}}
                onClick={() => handleFactionClick('Thousand Sons')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Thousand Sons.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Thousand Sons')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Thousand Sons')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Thousand Sons
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Thousand Sons')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Thousand Sons')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Thousand Sons')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Thousand Sons')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Thousand Sons
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Emperor's Children Showcase */}
            {factionStats.find(f => f.faction === "Emperor's Children") && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:"160px"}}
                onClick={() => handleFactionClick("Emperor's Children")}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Emperors Children.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === "Emperor's Children")?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === "Emperor's Children")?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Emperor's Children
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === "Emperor's Children")?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === "Emperor's Children")?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === "Emperor's Children")?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === "Emperor's Children")?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Emperor's Children
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chaos Showcase */}
            {factionStats.find(f => f.faction === 'Chaos') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:"160px"}}
                onClick={() => handleFactionClick('Chaos')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Chaos.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Chaos')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Chaos')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Chaos
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Chaos')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Chaos')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Chaos')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Chaos')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Chaos
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Xenos (Superfaction) Section */}
        <div className="mb-12">
          {/* Xenos Superfaction Header Card */}
          <div className="w-[1150px] h-[120px] rounded-lg shadow-2xl border-2 border-green-600 relative overflow-hidden mx-auto mb-8">
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ 
                backgroundImage: `url('/images/Xenos (Superfaction).jpg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            ></div>
            {/* Content */}
            <div className="relative h-full flex items-center justify-between px-8">
              {/* Title with frosted glass background */}
              <div className="flex-1">
                <div className="inline-block bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white border-opacity-30">
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                    Xenos (Superfaction)
                  </h3>
                </div>
              </div>
              {/* Collective Statistics - Stat Boxes (Xenos) */}
              <div className="flex gap-4">
                {/* Wins */}
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {(() => {
                      const xenosFactions = [
                        'Orks',
                        'Tyranids',
                        'Necrons',
                        'Aeldari',
                        "T'au Empire",
                        'Leagues of Votann',
                        'Genestealer Cult',
                        'Drukhari'
                      ];
                      return xenosFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.wins || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-200">Wins</div>
                </div>
                {/* Losses */}
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {(() => {
                      const xenosFactions = [
                        'Orks',
                        'Tyranids',
                        'Necrons',
                        'Aeldari',
                        "T'au Empire",
                        'Leagues of Votann',
                        'Genestealer Cult',
                        'Drukhari'
                      ];
                      return xenosFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.losses || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-200">Losses</div>
                </div>
                {/* Draws */}
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {(() => {
                      const xenosFactions = [
                        'Orks',
                        'Tyranids',
                        'Necrons',
                        'Aeldari',
                        "T'au Empire",
                        'Leagues of Votann',
                        'Genestealer Cult',
                        'Drukhari'
                      ];
                      return xenosFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.draws || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-200">Draws</div>
                </div>
                {/* Games */}
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 px-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {(() => {
                      const xenosFactions = [
                        'Orks',
                        'Tyranids',
                        'Necrons',
                        'Aeldari',
                        "T'au Empire",
                        'Leagues of Votann',
                        'Genestealer Cult',
                        'Drukhari'
                      ];
                      return xenosFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.totalGames || 0);
                      }, 0);
                    })()}
                  </div>
                  <div className="text-xs text-gray-200">Games</div>
                </div>
              </div>
              {/* Circular Win Rate Graph */}
              <div className="flex items-center justify-center ml-6">
                <div className="relative w-16 h-16">
                  {/* Frosted glass background circle */}
                  <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                  <svg className="w-16 h-16 transform -rotate-90 relative z-10" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="none" />
                    <circle cx="32" cy="32" r="28" stroke="url(#xenosHeaderGradient)" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 28}`} strokeDashoffset={`${2 * Math.PI * 28 * (1 - (() => {
                      const xenosFactions = [
                        'Orks',
                        'Tyranids',
                        'Necrons',
                        'Aeldari',
                        "T'au Empire",
                        'Leagues of Votann',
                        'Genestealer Cult',
                        'Drukhari'
                      ];
                      const totalWins = xenosFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.wins || 0);
                      }, 0);
                      const totalGames = xenosFactions.reduce((total, faction) => {
                        const stats = factionStats.find(f => f.faction === faction);
                        return total + (stats?.totalGames || 0);
                      }, 0);
                      return totalGames > 0 ? (totalWins / totalGames) : 0;
                    })())}`} className="transition-all duration-1000 ease-out" />
                    <defs>
                      <linearGradient id="xenosHeaderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#4ade80" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <span className="text-white text-lg font-bold">
                      {(() => {
                        const xenosFactions = [
                          'Orks',
                          'Tyranids',
                          'Necrons',
                          'Aeldari',
                          "T'au Empire",
                          'Leagues of Votann',
                          'Genestealer Cult',
                          'Drukhari'
                        ];
                        const totalWins = xenosFactions.reduce((total, faction) => {
                          const stats = factionStats.find(f => f.faction === faction);
                          return total + (stats?.wins || 0);
                        }, 0);
                        const totalGames = xenosFactions.reduce((total, faction) => {
                          const stats = factionStats.find(f => f.faction === faction);
                          return total + (stats?.totalGames || 0);
                        }, 0);
                        return totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
                      })()}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Orks Showcase */}
            {factionStats.find(f => f.faction === 'Orks') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:"160px"}}
                onClick={() => handleFactionClick('Orks')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Orks.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Orks')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Orks')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Orks
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Orks')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Orks')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Orks')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Orks')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Orks
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tyranids Showcase */}
            {factionStats.find(f => f.faction === 'Tyranids') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:"160px"}}
                onClick={() => handleFactionClick('Tyranids')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Tyranids.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Tyranids')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Tyranids')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Tyranids
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Tyranids')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Tyranids')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Tyranids')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Tyranids')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Tyranids
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Necrons Showcase */}
            {factionStats.find(f => f.faction === 'Necrons') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:"160px"}}
                onClick={() => handleFactionClick('Necrons')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Necrons.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Necrons')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Necrons')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Necrons
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Necrons')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Necrons')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Necrons')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Necrons')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Necrons
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aeldari Showcase */}
            {factionStats.find(f => f.faction === 'Aeldari') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:"160px"}}
                onClick={() => handleFactionClick('Aeldari')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Aeldari.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Aeldari')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Aeldari')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Aeldari
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Aeldari')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Aeldari')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Aeldari')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Aeldari')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Aeldari
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* T'au Empire Showcase */}
            {factionStats.find(f => f.faction === 'T\'au Empire') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:"160px"}}
                onClick={() => handleFactionClick('T\'au Empire')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/T\\'au Empire.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'T\'au Empire')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'T\'au Empire')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      T'au Empire
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'T\'au Empire')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'T\'au Empire')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'T\'au Empire')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'T\'au Empire')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> T'au Empire
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Leagues of Votann Showcase */}
            {factionStats.find(f => f.faction === 'Leagues of Votann') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:"160px"}}
                onClick={() => handleFactionClick('Leagues of Votann')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Leagues of Votann.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Leagues of Votann')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Leagues of Votann')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Leagues of Votann
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Leagues of Votann')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Leagues of Votann')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Leagues of Votann')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Leagues of Votann')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Leagues of Votann
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Genestealer Cult Showcase */}
            {factionStats.find(f => f.faction === 'Genestealer Cult') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:"160px"}}
                onClick={() => handleFactionClick('Genestealer Cult')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Genestealer Cult.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Genestealer Cult')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Genestealer Cult')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Genestealer Cult
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Genestealer Cult')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Genestealer Cult')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Genestealer Cult')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Genestealer Cult')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Genestealer Cult
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Drukhari Showcase */}
            {factionStats.find(f => f.faction === 'Drukhari') && (
              <div 
                className="relative overflow-hidden rounded-lg shadow-2xl min-h-[120px] cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105" 
                style={{height:"160px"}}
                onClick={() => handleFactionClick('Drukhari')}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url('/images/Drukhari.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
                {/* Win Rate Dial - top right */}
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    {/* Frosted glass background circle */}
                    <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30"></div>
                    <svg className="w-20 h-20 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - (factionStats.find(f => f.faction === 'Drukhari')?.winRate || 0) / 100)}`} className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-base font-bold text-white drop-shadow-lg leading-none">
                          {factionStats.find(f => f.faction === 'Drukhari')?.winRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="relative flex flex-col h-full p-3 pt-4">
                  <div className="flex-1">
                    <div className="text-lg font-bold leading-tight text-white drop-shadow-lg">
                      Drukhari
                    </div>
                  </div>
                  {/* Stats at bottom */}
                  <div className="mt-auto">
                    <div className="flex gap-2 mb-2">
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-green-400">
                          {factionStats.find(f => f.faction === 'Drukhari')?.wins}
                        </div>
                        <div className="text-[10px] text-gray-200">Wins</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-red-400">
                          {factionStats.find(f => f.faction === 'Drukhari')?.losses}
                        </div>
                        <div className="text-[10px] text-gray-200">Losses</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-yellow-400">
                          {factionStats.find(f => f.faction === 'Drukhari')?.draws}
                        </div>
                        <div className="text-[10px] text-gray-200">Draws</div>
                      </div>
                      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded p-1 px-2 text-center">
                        <div className="text-base font-bold text-blue-400">
                          {factionStats.find(f => f.faction === 'Drukhari')?.totalGames}
                        </div>
                        <div className="text-[10px] text-gray-200">Games</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300">
                      <span className="font-semibold">Includes:</span> Drukhari
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p className="mt-2">Note: Sub-factions (Ultramarines, Salamanders, Iron Hands, Farsight Enclaves, Steel Legion, Hive Fleet Leviathan, Hive Fleet Hydra, Forces of the Hive Mind, Maynarkh, Deathwing, Iron Warriors, Alpha Legion, Khorne Daemons) are consolidated with their parent factions</p>
        </div>
      </div>
    </div>
  );
} 
