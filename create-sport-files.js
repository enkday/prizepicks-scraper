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
  
  // Group by sport
  const bySport = {};
  
  data.props.forEach(prop => {
    const sport = prop.sport || 'Unknown';
    if (!bySport[sport]) {
      bySport[sport] = [];
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
