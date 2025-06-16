import { useState } from 'react';
import SubmitMatch from './SubmitMatch';
import LoadPlayersCSV from '../components/LoadPlayersCSV';
import LoadMatchesCSV from '../components/LoadMatchesCSV';

function MatchManager() {
  const [allPlayers, setAllPlayers] = useState([]);
  const [allMatches, setAllMatches] = useState([]); // if you're also handling matches CSV

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8 text-center">Elo Ranking Manager</h1>

      <LoadPlayersCSV setAllPlayers={setAllPlayers} />

      {/* Optional: If you have a matches CSV uploader */}
      <LoadMatchesCSV setAllMatches={setAllMatches} />

      <div className="mt-10">
        <SubmitMatch allPlayers={allPlayers} setAllPlayers={setAllPlayers} />
      </div>
    </div>
  );
}

export default MatchManager;