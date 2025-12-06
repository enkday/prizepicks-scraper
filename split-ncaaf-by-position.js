const fs = require('fs');
const path = require('path');

/**
 * Split NCAAF props by position type
 * Helps avoid file size limits by creating position-specific endpoints
 */

const dataDir = path.join(__dirname, 'data');
const ncaafFile = path.join(dataDir, 'prizepicks-ncaaf.json');

// Read the NCAAF data
const ncaafData = JSON.parse(fs.readFileSync(ncaafFile, 'utf8'));
const props = ncaafData.props || [];

console.log(`📊 Processing ${props.length} NCAAF props...`);

// Position detection based on stat types
const QB_STATS = ['Passing Yards', 'Pass TDs', 'Passing Attempts', 'Pass Completions', 'Pass Attempts', 'Completions', 'Interceptions', 'Pass+Rush Yds'];
const RB_STATS = ['Rushing Yards', 'Rush Yards', 'Rush TDs', 'Rushing Attempts', 'Rush Attempts', 'Carries'];
const WR_STATS = ['Receiving Yards', 'Rec Yards', 'Receptions', 'Rec TDs', 'Receiving Touchdowns', 'Targets'];

// Categorize props by position
const byPosition = {
  qb: [],
  rb: [],
  wr: [],
  other: []
};

props.forEach(prop => {
  const stat = prop.stat || '';
  
  if (QB_STATS.some(s => stat.includes(s))) {
    byPosition.qb.push(prop);
  } else if (RB_STATS.some(s => stat.includes(s))) {
    byPosition.rb.push(prop);
  } else if (WR_STATS.some(s => stat.includes(s))) {
    byPosition.wr.push(prop);
  } else {
    byPosition.other.push(prop);
  }
});

// Write position-specific files
['qb', 'rb', 'wr'].forEach(position => {
  const positionProps = byPosition[position];
  const fileName = `prizepicks-ncaaf-${position}.json`;
  const filePath = path.join(dataDir, fileName);
  
  const positionData = {
    scrapedAt: ncaafData.scrapedAt,
    scrapedDate: ncaafData.scrapedDate,
    source: ncaafData.source,
    sport: 'NCAAF',
    position: position.toUpperCase(),
    totalProps: positionProps.length,
    props: positionProps
  };
  
  fs.writeFileSync(filePath, JSON.stringify(positionData, null, 2));
  const size = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`✅ ${position.toUpperCase()}: ${positionProps.length} props → ${fileName} (${size}KB)`);
});

console.log(`\n📋 Summary:`);
console.log(`   QB props: ${byPosition.qb.length}`);
console.log(`   RB props: ${byPosition.rb.length}`);
console.log(`   WR props: ${byPosition.wr.length}`);
console.log(`   Other props: ${byPosition.other.length}`);
console.log(`   Total: ${props.length}`);
