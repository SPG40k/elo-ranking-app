// utils/eloUtils.js

export function calculateElo(winnerElo, loserElo, winnerScore, loserScore) {
  const K = 32;
  const scoreDiff = winnerScore - loserScore;
  const marginFactor = Math.log(Math.abs(scoreDiff) + 1) * (2.2 / ((winnerElo - loserElo) * 0.001 + 2.2));

  const expectedWin =
    1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));

  const eloChange = K * marginFactor * (1 - expectedWin);
  return Math.round(eloChange);
}

// Rank tier assignment based on Elo rating
export function getRankFromElo(elo) {
  if (elo >= 2000) return 'Master';
  if (elo >= 1800) return 'Diamond';
  if (elo >= 1600) return 'Platinum';
  if (elo >= 1400) return 'Gold';
  if (elo >= 1200) return 'Silver';
  return 'Bronze';
}