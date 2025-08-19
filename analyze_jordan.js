const fs = require('fs');
const csv = require('csv-parser');

// Read singles matches
const singlesMatches = [];
fs.createReadStream('public/singles_matches.csv')
  .pipe(csv())
  .on('data', (row) => {
    if (row.player1_id === '0050' || row.player2_id === '0050') {
      singlesMatches.push({
        gameNumber: row.gameNumber,
        player1_id: row.player1_id,
        player2_id: row.player2_id,
        score1: parseInt(row.score1),
        score2: parseInt(row.score2),
        date: row.date,
        eventName: row.eventName,
        player1Faction: row.player1Faction,
        player2Faction: row.player2Faction
      });
    }
  })
  .on('end', () => {
    // Group by event
    const events = {};
    singlesMatches.forEach(match => {
      if (!events[match.eventName]) {
        events[match.eventName] = {
          date: match.date,
          matches: []
        };
      }
      events[match.eventName].matches.push(match);
    });

    // Analyze each event
    const wins = [];
    Object.entries(events).forEach(([eventName, event]) => {
      console.log(`\nEvent: ${eventName} (${event.date})`);
      
      // Sort matches by game number
      event.matches.sort((a, b) => parseInt(a.gameNumber) - parseInt(b.gameNumber));
      
      let jordanWins = 0;
      let jordanLosses = 0;
      
      event.matches.forEach(match => {
        const isJordanPlayer1 = match.player1_id === '0050';
        const jordanScore = isJordanPlayer1 ? match.score1 : match.score2;
        const opponentScore = isJordanPlayer1 ? match.score2 : match.score1;
        
        if (jordanScore > opponentScore) {
          jordanWins++;
          console.log(`  Game ${match.gameNumber}: Jordan wins (${jordanScore}-${opponentScore})`);
        } else if (jordanScore < opponentScore) {
          jordanLosses++;
          console.log(`  Game ${match.gameNumber}: Jordan loses (${jordanScore}-${opponentScore})`);
        } else {
          console.log(`  Game ${match.gameNumber}: Draw (${jordanScore}-${opponentScore})`);
        }
      });
      
      console.log(`  Total: ${jordanWins} wins, ${jordanLosses} losses`);
      
      // Check if Jordan won the event (most wins)
      if (jordanWins > jordanLosses) {
        wins.push(eventName);
        console.log(`  RESULT: JORDAN WON THIS EVENT!`);
      } else {
        console.log(`  RESULT: Jordan did not win this event`);
      }
    });
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Jordan McGregor won ${wins.length} singles events:`);
    wins.forEach(event => console.log(`  - ${event}`));
  }); 