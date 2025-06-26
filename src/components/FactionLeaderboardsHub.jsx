import React, { useState } from 'react';
import FactionSpecificLeaderboard from './FactionSpecificLeaderboard';

const ALL_FACTIONS = [
  // Space Marines
  'Space Marines (Astartes)',
  'Blood Angels',
  'Dark Angels',
  'Space Wolves',
  'Black Templars',
  'Deathwatch',
  
  // Imperium
  'Astra Militarum',
  'Adeptus Custodes',
  'Imperial Knights',
  'Adepta Sororitas',
  'Grey Knights',
  'Adeptus Mechanicus',
  'Imperial Agents',
  'Adeptus Titanicus',
  
  // Chaos
  'World Eaters',
  'Chaos Daemons',
  'Death Guard',
  'Chaos Knights',
  'Chaos Space Marines',
  'Thousand Sons',
  "Emperor's Children",
  'Chaos',
  
  // Xenos
  'Orks',
  'Tyranids',
  'Necrons',
  'Aeldari',
  "T'au Empire",
  'Leagues of Votann',
  'Genestealer Cult',
  'Drukhari'
];

const FACTION_CATEGORIES = {
  'Space Marines': [
    'Space Marines (Astartes)',
    'Blood Angels',
    'Dark Angels',
    'Space Wolves',
    'Black Templars',
    'Deathwatch'
  ],
  'Imperium': [
    'Astra Militarum',
    'Adeptus Custodes',
    'Imperial Knights',
    'Adepta Sororitas',
    'Grey Knights',
    'Adeptus Mechanicus',
    'Imperial Agents',
    'Adeptus Titanicus'
  ],
  'Chaos': [
    'World Eaters',
    'Chaos Daemons',
    'Death Guard',
    'Chaos Knights',
    'Chaos Space Marines',
    'Thousand Sons',
    "Emperor's Children",
    'Chaos'
  ],
  'Xenos': [
    'Orks',
    'Tyranids',
    'Necrons',
    'Aeldari',
    "T'au Empire",
    'Leagues of Votann',
    'Genestealer Cult',
    'Drukhari'
  ]
};

export default function FactionLeaderboardsHub() {
  const [selectedFaction, setSelectedFaction] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  React.useEffect(() => {
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

  if (selectedFaction) {
    return (
      <div>
        <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSelectedFaction(null)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Back to Faction Selection
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedFaction} Leaderboard
              </h1>
            </div>
          </div>
        </div>
        <FactionSpecificLeaderboard factionName={selectedFaction} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Faction-Specific Leaderboards
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select a faction to view all players who have played it, ranked by win rate
          </p>
        </div>

        <div className="space-y-8">
          {Object.entries(FACTION_CATEGORIES).map(([category, factions]) => (
            <div key={category} className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {category}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {factions.length} faction{factions.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
                {factions.map((faction) => (
                  <button
                    key={faction}
                    onClick={() => setSelectedFaction(faction)}
                    className="bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-left transition-all duration-200 hover:shadow-md"
                  >
                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                      {faction}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      View leaderboard →
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Showing {ALL_FACTIONS.length} total factions across 4 categories</p>
        </div>
      </div>
    </div>
  );
} 