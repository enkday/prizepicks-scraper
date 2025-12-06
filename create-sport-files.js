const fs = require('fs').promises;
const path = require('path');

/**
 * Split the main prizepicks.json into separate files by sport
 * This allows GPT to fetch smaller, sport-specific datasets
 */

async function splitBySport() {
  console.log('📊 Splitting props by sport...');
  
  // Read main file
  const mainFile = await fs.readFile(
    path.join(__dirname, 'data/prizepicks.json'),
    'utf8'
  );
  const data = JSON.parse(mainFile);
  
  // Build player-to-team and game-to-opponent mapping from included array if present
  let playerTeamMap = {};
  let gameOpponentMap = {};
  if (data.included && Array.isArray(data.included)) {
    // Map player id to { team, team_name }
    data.included.forEach(item => {
      if (item.type === 'new_player') {
        playerTeamMap[item.attributes?.name] = {
          team: item.attributes?.team || null,
          team_name: item.attributes?.team_name || null
        };
      }
      if (item.type === 'game') {
        gameOpponentMap[item.id] = item.attributes?.opponent_name || null;
      }
    });
  }

  // Group by sport and fill missing team/opponent fields
  const bySport = {};
  data.props.forEach(prop => {
    const sport = prop.sport || 'Unknown';
    if (!bySport[sport]) bySport[sport] = [];
    // Fill team if missing
    if ((!prop.team || prop.team === null) && playerTeamMap[prop.player]) {
      prop.team = playerTeamMap[prop.player].team;
      prop.team_name = playerTeamMap[prop.player].team_name;
    }
    // Fill opponent if missing (if startTime and player are present, this could be improved with a schedule lookup)
    if ((!prop.opponent || prop.opponent === null) && prop.gameId && gameOpponentMap[prop.gameId]) {
      prop.opponent = gameOpponentMap[prop.gameId];
    }
    bySport[sport].push(prop);
  });
  
  // Create separate files
  for (const [sport, props] of Object.entries(bySport)) {
    const sportData = {
      scrapedAt: data.scrapedAt,
      scrapedDate: data.scrapedDate,
      source: data.source,
      sport: sport,
      totalProps: props.length,
      props: props
    };
    
    const filename = `prizepicks-${sport.toLowerCase()}.json`;
    await fs.writeFile(
      path.join(__dirname, 'data', filename),
      JSON.stringify(sportData, null, 2)
    );
    
    console.log(`✅ ${sport}: ${props.length} props → data/${filename}`);
  }
  
  console.log('\n✨ Done! Created sport-specific files.');
}

splitBySport().catch(console.error);
