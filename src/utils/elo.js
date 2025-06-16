export function calculateElo(winnerRating, loserRating, kFactor = 32) {
  const expectedScoreWinner =
    1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedScoreLoser =
    1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

  const newWinnerRating = Math.round(winnerRating + kFactor * (1 - expectedScoreWinner));
  const newLoserRating = Math.round(loserRating + kFactor * (0 - expectedScoreLoser));

  return {
    winner: newWinnerRating,
    loser: newLoserRating,
  };
}