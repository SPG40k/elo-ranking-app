import { calculateEloChange } from './eloUtils';

const winner = allPlayers.find(p => p.id === '1');
const loser = allPlayers.find(p => p.id === '2');

const scoreWinner = 90;
const scoreLoser = 60;

const eloChange = calculateEloChange(winner.elo, loser.elo, scoreWinner, scoreLoser);

// Update Elos
winner.elo += eloChange;
loser.elo -= eloChange;

// Log the match for each player
winner.matches.unshift({
  opponent: loser.name,
  result: 'Win',
  date: '2025-05-22',
  score: `${scoreWinner}-${scoreLoser}`,
  eloChange: +eloChange,
});

loser.matches.unshift({
  opponent: winner.name,
  result: 'Loss',
  date: '2025-05-22',
  score: `${scoreLoser}-${scoreWinner}`,
  eloChange: -eloChange,
});