const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const ncaafFile = path.join(dataDir, 'prizepicks-ncaaf.json');
const ncaafData = JSON.parse(fs.readFileSync(ncaafFile, 'utf8'));

console.log(`📊 Total NCAAF props: ${ncaafData.props.length}`);

// Take only first 100 props (PrizePicks returns live games first)
const top100Props = ncaafData.props.slice(0, 100);

const outputFile = path.join(dataDir, 'prizepicks-ncaaf-top100.json');
const outputData = {
  ...ncaafData,
  totalProps: top100Props.length,
  props: top100Props,
  note: 'Top 100 NCAAF props - prioritized by PrizePicks API'
};

fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
const size = (fs.statSync(outputFile).size / 1024).toFixed(1);
console.log(`✅ Created ${outputFile} (${size}KB)`);
console.log(`   Props: ${top100Props.length}`);
