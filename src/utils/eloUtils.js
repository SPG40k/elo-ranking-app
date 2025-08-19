// utils/eloUtils.js

export function calculateElo(winnerElo, loserElo, winnerScore, loserScore) {
  // Check for bye round: if one player scores 0 and total doesn't equal 20 (singles game)
  const totalScore = winnerScore + loserScore;
  if ((winnerScore === 0 || loserScore === 0) && totalScore !== 20) {
    // This is a bye round - player with 0 dropped/forfeited
    if (loserScore === 0) {
      // Loser dropped (scored 0), winner gets no change
      return 0; // Winner gets +0 ELO
    } else {
      // Winner dropped (scored 0), this shouldn't happen but handle it
      return -10; // Loser gets -10 ELO
    }
  }

  const K = 32;
  const scoreDiff = winnerScore - loserScore;
  const marginFactor = Math.log(Math.abs(scoreDiff) + 1) * (2.2 / ((winnerElo - loserElo) * 0.001 + 2.2));

  const expectedWin = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));

  let eloChange = K * marginFactor * (1 - expectedWin);
  let roundedElo = Math.round(eloChange);

  // Cap elo change to a maximum of 100 and a minimum of 5
  if (roundedElo < 10 ) return 10;
  if (roundedElo > 100) return 100;
  return roundedElo;
}

export function calculateEloForMatch(elo1, elo2, score1, score2) {
  // Check for bye round: if one player scores 0 and total doesn't equal 20 (singles game)
  const totalScore = score1 + score2;
  if ((score1 === 0 || score2 === 0) && totalScore !== 20) {
    // This is a bye round - player with 0 dropped/forfeited
    if (score1 === 0) {
      // Player 1 dropped (scored 0), Player 2 gets no change
      return [elo1 - 10, elo2]; // Player 1 loses 10 ELO, Player 2 gets no change
    } else {
      // Player 2 dropped (scored 0), Player 1 gets no change
      return [elo1, elo2 - 10]; // Player 1 gets no change, Player 2 loses 10 ELO
    }
  }

  // Calculate expected scores
  const expected1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
  const expected2 = 1 / (1 + Math.pow(10, (elo1 - elo2) / 400));
  // Determine actual results
  let result1, result2;
  if (score1 > score2) {
    result1 = 1; result2 = 0;
  } else if (score1 < score2) {
    result1 = 0; result2 = 1;
  } else {
    result1 = 0.5; result2 = 0.5;
  }
  // Use your margin logic for K
  const K = 32;
  const scoreDiff = Math.abs(score1 - score2);
  const marginFactor = Math.log(scoreDiff + 1) * (2.2 / (Math.abs(elo1 - elo2) * 0.001 + 2.2));
  const eloChange1 = Math.round(K * marginFactor * (result1 - expected1));
  const eloChange2 = Math.round(K * marginFactor * (result2 - expected2));
  // Cap elo change: minimum +10 for win, -10 for loss, max +/-100
  const cappedEloChange1 = eloChange1 > 0 ? Math.max(10, Math.min(100, eloChange1)) : Math.min(-10, Math.max(-100, eloChange1));
  const cappedEloChange2 = eloChange2 > 0 ? Math.max(10, Math.min(100, eloChange2)) : Math.min(-10, Math.max(-100, eloChange2));
  return [elo1 + cappedEloChange1, elo2 + cappedEloChange2];
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

// New: Team Elo calculation with team round logic
/**
 * Calculates Elo change for a player in a team match, prioritizing team result.
 * @param {number} playerElo - Elo of the player
 * @param {number} opponentElo - Elo of the opponent
 * @param {number} playerScore - Player's individual score
 * @param {number} opponentScore - Opponent's individual score
 * @param {number} teamScore - Player's team total score
 * @param {number} opponentTeamScore - Opponent's team total score
 * @returns {number} Elo change for the player
 */
export function calculateTeamEloForMatch(playerElo, opponentElo, playerScore, opponentScore, teamScore, opponentTeamScore) {
  const K = 32;
  const scoreDiff = playerScore - opponentScore;
  const marginFactor = Math.log(Math.abs(scoreDiff) + 1) * (2.2 / ((playerElo - opponentElo) * 0.001 + 2.2));
  const expectedWin = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));

  // Determine individual result
  let individualResult;
  if (playerScore > opponentScore) individualResult = 1;
  else if (playerScore < opponentScore) individualResult = 0;
  else individualResult = 0.5;

  // Determine team round result
  const total = teamScore + opponentTeamScore;
  const midpoint = total / 2;
  const drawMin = midpoint - 5;
  const drawMax = midpoint + 5;
  let teamResult;
  if (teamScore > opponentTeamScore && (teamScore < drawMin || teamScore > drawMax)) teamResult = 1; // Team win
  else if (teamScore < opponentTeamScore && (teamScore < drawMin || teamScore > drawMax)) teamResult = 0; // Team loss
  else teamResult = 0.5; // Draw

  // Standard Elo change
  let eloChange = K * marginFactor * (individualResult - expectedWin);
  let sign = Math.sign(eloChange);
  let absEloChange = Math.abs(eloChange);

  // Apply team result logic
  if (teamResult === 0.5) {
    // Draw: use standard Elo change
    // (optional: could reduce impact for draws, but not specified)
  } else if ((individualResult === 1 && teamResult === 1) || (individualResult === 0 && teamResult === 0)) {
    // Both win or both lose: use 100% of calculated change
    // For loss, ensure eloChange is negative
    if (teamResult === 1) eloChange = absEloChange;
    else eloChange = -absEloChange;
  } else {
    // Mixed result: use 50% of calculated change, sign matches team result
    if (teamResult === 1) eloChange = 0.5 * absEloChange;
    else eloChange = -0.5 * absEloChange;
  }

  let roundedElo = Math.round(eloChange);
  // Cap elo change to a maximum of 100 and a minimum of 10
  if (roundedElo < 0) {
    if (roundedElo > -10) return -10;
    if (roundedElo < -100) return -100;
    return roundedElo;
  } else {
    if (roundedElo < 10) return 10;
    if (roundedElo > 100) return 100;
    return roundedElo;
  }
}