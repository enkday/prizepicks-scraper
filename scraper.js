const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function parseRetryAfterMs(retryAfterHeader) {
  if (!retryAfterHeader) return null;
  const asNumber = Number(retryAfterHeader);
  if (Number.isFinite(asNumber) && asNumber >= 0) return asNumber * 1000;
  const asDate = new Date(retryAfterHeader);
  if (!Number.isNaN(asDate.getTime())) {
    const delta = asDate.getTime() - Date.now();
    return Math.max(0, delta);
  }
  return null;
}

async function axiosGetWithRetry(url, config, { maxAttempts = 6, baseDelayMs = 1500 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await axios.get(url, config);
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      const isRetryable = status === 429 || (status >= 500 && status <= 599);
      if (!isRetryable || attempt === maxAttempts) break;

      const retryAfterMs = parseRetryAfterMs(error?.response?.headers?.['retry-after']);
      const backoffMs = Math.min(30000, Math.round(baseDelayMs * (2 ** (attempt - 1))));
      const jitterMs = Math.floor(Math.random() * 250);
      const waitMs = Math.max(0, (retryAfterMs ?? backoffMs) + jitterMs);
      console.log(`   ⏳ Rate limited (${status}); retrying in ${Math.ceil(waitMs / 1000)}s (attempt ${attempt + 1}/${maxAttempts})...`);
      await sleep(waitMs);
    }
  }

  throw lastError;
}

/**
 * PrizePicks Scraper
 * Fetches current prop bet options from PrizePicks API
 * League IDs verified from partner-api.prizepicks.com/leagues
 */

// Correct League IDs from PrizePicks API
const LEAGUES = {
  NFL: 9,        // NFL
  NCAAF: 15,     // College Football  
  NBA: 7,        // NBA
  MLB: 2         // MLB (offseason - will return 0 props)
  // NCAAB and College Baseball IDs to be added when seasons are active
};

async function scrapePrizePicks() {
  console.log('🚀 Starting PrizePicks data fetch...');
  
  const allProps = [];
  // For debugging: collect all included objects
  let allIncluded = [];
  
  try {
    // Fetch projections for each league
    for (const [leagueName, leagueId] of Object.entries(LEAGUES)) {
      console.log(`📊 Fetching ${leagueName} props...`);
      
      try {
        const response = await axiosGetWithRetry(`https://api.prizepicks.com/projections`, {
          params: {
            league_id: leagueId,
            per_page: 250
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://app.prizepicks.com/'
          },
          timeout: 10000
        });
        
        const data = response.data;
        // Build included maps per response (players, teams, games, etc.)
        const includedData = buildIncludedMap(data.included || []);
        // Collect all included objects for debugging
        allIncluded = allIncluded.concat(data.included || []);
        
        // DEBUG: Print all available fields for the first projection in this league
        if (data.data && Array.isArray(data.data) && data.data.length > 0 && leagueName === 'NCAAF') {
          console.log('\n=== RAW FIELDS FOR FIRST NCAAF PROJECTION ===');
          console.log(JSON.stringify(data.data[0], null, 2));
        }
        // Process projections
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach(projection => {
            const prop = parseProjection(projection, includedData, leagueName);
            if (prop) {
              allProps.push(prop);
            }
          });
          console.log(`   ✅ Found ${data.data.length} ${leagueName} props`);
        }
        
        // Add delay to avoid rate limiting
        await sleep(500);
        
      } catch (error) {
        console.log(`   ⚠️  ${leagueName} fetch failed:`, error.message);
      }
    }
    
    console.log(`\n✅ Total props scraped: ${allProps.length}`);
    
    // Save to JSON (now includes allIncluded for debugging)
    const allData = {
      scrapedAt: new Date().toISOString(),
      scrapedDate: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }),
      source: 'PrizePicks API',
      totalProps: allProps.length,
      props: allProps,
      included: allIncluded
    };
    
    // Save to data directory
    const dataDir = path.join(__dirname, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    
    const outputPath = path.join(dataDir, 'prizepicks.json');
    await fs.writeFile(outputPath, JSON.stringify(allData, null, 2), { mode: 0o666 });
    
    console.log(`💾 Data saved to ${outputPath}`);
    console.log(`📈 Total props scraped: ${allData.totalProps}`);
    
    // Split into sport-specific files
    console.log(`\n📂 Creating sport-specific files...`);
    const bySport = {};
    allProps.forEach(prop => {
      const sport = prop.sport.toLowerCase();
      if (!bySport[sport]) bySport[sport] = [];
      // Only include standard odds (exclude demon/goblin variants)
      if (!prop.oddsType || (prop.oddsType !== 'demon' && prop.oddsType !== 'goblin')) {
        bySport[sport].push(prop);
      }
    });

    for (const [sport, props] of Object.entries(bySport)) {
      const sportFile = path.join(dataDir, `prizepicks-${sport}.json`);
      const sportData = {
        scrapedAt: allData.scrapedAt,
        scrapedDate: allData.scrapedDate,
        source: allData.source,
        sport: sport.toUpperCase(),
        totalProps: props.length,
        props: props
      };
      await fs.writeFile(sportFile, JSON.stringify(sportData, null, 2), { mode: 0o666 });
      console.log(`   ✅ ${sport.toUpperCase()}: ${props.length} props → ${sportFile}`);

      // Create NBA/NFL day- and team-specific slices to keep payloads small for GPT
      if (sport === 'nba' || sport === 'nfl') {
        const toCstDateKey = (date) => {
          const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Chicago',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
            .formatToParts(date)
            .reduce((acc, part) => {
              acc[part.type] = part.value;
              return acc;
            }, {});
          return `${parts.year}-${parts.month}-${parts.day}`;
        };

        const getCstDayKey = (offsetDays) => {
          // Compute “today” in America/Chicago, then add offset days.
          const cstTodayKey = toCstDateKey(new Date());
          const [y, m, d] = cstTodayKey.split('-').map(n => parseInt(n, 10));
          // Use UTC noon for a stable day addition across DST boundaries.
          const baseUtcNoon = new Date(Date.UTC(y, m - 1, d, 18, 0, 0));
          baseUtcNoon.setUTCDate(baseUtcNoon.getUTCDate() + offsetDays);
          return toCstDateKey(baseUtcNoon);
        };

        const buildDaySlice = async (label, offsetDays) => {
          const dayKey = getCstDayKey(offsetDays);
          const dayProps = props.filter(p => {
            if (!p.startTimeIso) return false;
            const startDateCST = p.startDateCST || getCstStartFields(p.startTimeIso).startDateCST;
            return startDateCST === dayKey;
          });

          const baseFile = path.join(dataDir, `prizepicks-${sport}-${label}.json`);
          const payload = {
            scrapedAt: allData.scrapedAt,
            scrapedDate: allData.scrapedDate,
            source: allData.source,
            sport: sport.toUpperCase(),
            day: label,
            totalProps: dayProps.length,
            props: dayProps
          };
          await fs.writeFile(baseFile, JSON.stringify(payload, null, 2), { mode: 0o666 });
          console.log(`   ✅ ${sport.toUpperCase()} (${label.toUpperCase()}): ${dayProps.length} props → ${baseFile}`);

          // Team-specific slices
          const byTeam = {};
          dayProps.forEach(p => {
            if (!p.Team) return;
            if (!byTeam[p.Team]) byTeam[p.Team] = [];
            byTeam[p.Team].push(p);
          });

          const teamDir = path.join(dataDir, `${sport}-${label}`);
          await fs.mkdir(teamDir, { recursive: true });
          for (const [teamName, teamProps] of Object.entries(byTeam)) {
            const slug = slugifyTeam(teamName);
            if (!slug) continue;
            const teamFile = path.join(teamDir, `${slug}.json`);
            const teamPayload = {
              scrapedAt: allData.scrapedAt,
              scrapedDate: allData.scrapedDate,
              source: allData.source,
              sport: sport.toUpperCase(),
              day: label,
              team: teamName,
              totalProps: teamProps.length,
              props: teamProps
            };
            await fs.writeFile(teamFile, JSON.stringify(teamPayload, null, 2), { mode: 0o666 });
            console.log(`      • ${sport.toUpperCase()} ${label.toUpperCase()} ${teamName}: ${teamProps.length} props → ${teamFile}`);
          }
        };

        const buildNextDaysSlice = async (label, days) => {
          const dayKeys = new Set(Array.from({ length: days }, (_, i) => getCstDayKey(i)));
          const rangeProps = props.filter(p => {
            if (!p.startTimeIso) return false;
            const startDateCST = p.startDateCST || getCstStartFields(p.startTimeIso).startDateCST;
            return startDateCST && dayKeys.has(startDateCST);
          });

          const baseFile = path.join(dataDir, `prizepicks-${sport}-${label}.json`);
          const payload = {
            scrapedAt: allData.scrapedAt,
            scrapedDate: allData.scrapedDate,
            source: allData.source,
            sport: sport.toUpperCase(),
            day: label,
            totalProps: rangeProps.length,
            props: rangeProps
          };
          await fs.writeFile(baseFile, JSON.stringify(payload, null, 2), { mode: 0o666 });
          console.log(`   ✅ ${sport.toUpperCase()} (${label.toUpperCase()}): ${rangeProps.length} props → ${baseFile}`);

          const byTeam = {};
          rangeProps.forEach(p => {
            if (!p.Team) return;
            if (!byTeam[p.Team]) byTeam[p.Team] = [];
            byTeam[p.Team].push(p);
          });

          const teamDir = path.join(dataDir, `${sport}-${label}`);
          await fs.mkdir(teamDir, { recursive: true });
          for (const [teamName, teamProps] of Object.entries(byTeam)) {
            const slug = slugifyTeam(teamName);
            if (!slug) continue;
            const teamFile = path.join(teamDir, `${slug}.json`);
            const teamPayload = {
              scrapedAt: allData.scrapedAt,
              scrapedDate: allData.scrapedDate,
              source: allData.source,
              sport: sport.toUpperCase(),
              day: label,
              team: teamName,
              totalProps: teamProps.length,
              props: teamProps
            };
            await fs.writeFile(teamFile, JSON.stringify(teamPayload, null, 2), { mode: 0o666 });
          }
        };

        await buildDaySlice('today', 0);
        await buildDaySlice('tomorrow', 1);
        await buildNextDaysSlice('next-7-days', 7);
      }
    }
    
    return allData;
    
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

function buildIncludedMap(includedArray) {
  return (includedArray || []).reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = {};
    acc[item.type][item.id] = item;
    return acc;
  }, {});
}

function getTeamInfo(projection, includedData) {
  const attrs = projection.attributes || {};
  const relationships = projection.relationships || {};

  const buildFull = (market, name) => {
    const parts = [];
    if (market) parts.push(market);
    if (name) parts.push(name);
    return parts.length ? parts.join(' ') : null;
  };

  const playerId = relationships.new_player?.data?.id;
  if (playerId) {
    const playerData = includedData.new_player?.[playerId];
    if (playerData) {
      const market = playerData.attributes?.market || null;
      const codeFromPlayer = playerData.attributes?.team || null;
      const nameFromPlayer = playerData.attributes?.team_name || null;
      const teamId = playerData.relationships?.team?.data?.id;
      if (teamId) {
        const teamData = includedData.team?.[teamId];
        const attrs = teamData?.attributes || {};
        return {
          name: attrs.name || attrs.full_name || nameFromPlayer || codeFromPlayer || null,
          code: attrs.abbreviation || codeFromPlayer || null,
          market: attrs.market || market || null,
          full: buildFull(attrs.market || market, attrs.name || attrs.full_name || nameFromPlayer || codeFromPlayer)
        };
      }
      return {
        name: nameFromPlayer || codeFromPlayer || null,
        code: codeFromPlayer || null,
        market,
        full: buildFull(market, nameFromPlayer || codeFromPlayer)
      };
    }
  }

  const directTeamId = relationships.team?.data?.id;
  if (directTeamId) {
    const teamData = includedData.team?.[directTeamId];
    const attrs = teamData?.attributes || {};
    return {
      name: attrs.name || attrs.full_name || attrs.abbreviation || null,
      code: attrs.abbreviation || null,
      market: attrs.market || null,
      full: buildFull(attrs.market, attrs.name || attrs.full_name || attrs.abbreviation)
    };
  }

  return {
    name: attrs.team_name || attrs.team || null,
    code: attrs.team || null,
    market: attrs.market || null,
    full: buildFull(attrs.market, attrs.team_name || attrs.team)
  };
}

function pickOpponentFromGame(gameData, playerTeam) {
  if (!gameData?.attributes) return null;
  const g = gameData.attributes;
  const home = g.home_team_name || g.home_team;
  const away = g.away_team_name || g.away_team;
  // Try to pick the opposite side if we know the player's team
  if (playerTeam && home && away) {
    if (playerTeam === home) return away;
    if (playerTeam === away) return home;
  }
  return g.opponent_name || g.away_team_name || g.home_team_name || g.description || null;
}

function getOpponentFull(opponentName, includedData) {
  if (!opponentName) return null;
  const teams = includedData.team ? Object.values(includedData.team) : [];
  const match = teams.find(t => {
    const attrs = t.attributes || {};
    return attrs.abbreviation === opponentName || attrs.name === opponentName || attrs.full_name === opponentName || attrs.market === opponentName;
  });
  if (!match) return { full: null, code: null };
  const attrs = match.attributes || {};
  const parts = [];
  if (attrs.market) parts.push(attrs.market);
  if (attrs.name || attrs.full_name) parts.push(attrs.name || attrs.full_name);
  return {
    full: parts.length ? parts.join(' ') : null,
    code: attrs.abbreviation || null
  };
}

function formatStartTimeToCentral(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.month}/${parts.day}/${parts.year} ${parts.hour}:${parts.minute} ${parts.dayPeriod} CST`;
}

function getCstStartFields(isoString) {
  if (!isoString) return { startTimeCST: null, startDateCST: null };
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return { startTimeCST: isoString, startDateCST: null };

  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  const startTimeCST = `${timeParts.month}/${timeParts.day}/${timeParts.year} ${timeParts.hour}:${timeParts.minute} ${timeParts.dayPeriod} CST`;
  const startDateCST = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;

  return { startTimeCST, startDateCST };
}

function slugifyTeam(name) {
  if (!name) return null;
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper function to parse projection and extract player info
function parseProjection(projection, includedData, leagueName) {
  try {
    const attrs = projection.attributes;
    if (!attrs) return null;
    
    const oddsType = attrs.odds_type;
    // Only keep standard props (exclude demon/goblin variants)
    if (oddsType === 'demon' || oddsType === 'goblin') {
      return null;
    }
    
    const playerId = projection.relationships?.new_player?.data?.id;
    const playerData = playerId ? includedData.new_player?.[playerId] : null;
    const playerName = playerData?.attributes?.name || 'Unknown';
    const { name: teamName, code: teamCode, full: teamFull } = getTeamInfo(projection, includedData);

    const gameId = projection.relationships?.game?.data?.id || null;
    const gameData = gameId ? includedData.game?.[gameId] : null;
    let opponentName = pickOpponentFromGame(gameData, teamName);
    if (!opponentName) {
      opponentName = attrs.opponent || attrs.opponent_name || attrs.description || null;
    }
    const opponentInfo = getOpponentFull(opponentName, includedData);
    const startTimeCentral = formatStartTimeToCentral(attrs.start_time);
    const startTimeIso = attrs.start_time || null;
    const { startTimeCST, startDateCST } = getCstStartFields(startTimeIso);
    const rank = attrs.rank;

    // Parse stat type - remove "(Combo)" suffix if present
    let statType = attrs.stat_type || attrs.stat_display_name || 'Unknown';
    statType = statType.replace(/\s*\(Combo\)\s*/gi, '').trim();
    // Drop fantasy score and combo/combined stat types to keep payload smaller
    const statLower = statType.toLowerCase();
    if (
      statLower.includes('fantasy score') ||
      statLower.includes('combo') ||
      statType.includes('+') ||
      attrs.event_type === 'combo'
    ) {
      return null;
    }
    // Only include active props
    if (attrs.status === 'pre_game' || attrs.status === 'live') {
      return {
        player: playerName,
        stat: statType,
        line: parseFloat(attrs.line_score),
        sport: leagueName,
        startTime: startTimeCentral,
        startTimeCST,
        startDateCST,
        startTimeIso,
        oddsType: oddsType,
        Team: teamFull || null,
        teamCode: teamCode || null,
        Opponent: opponentInfo.full || opponentName || null,
        opponentCode: opponentInfo.code || null,
        rank: rank !== undefined ? rank : null,
        gameId
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing projection:', error.message);
    return null;
  }
}

// Run the data fetch
if (require.main === module) {
  scrapePrizePicks()
    .then(() => {
      console.log('✨ Scraping completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Scraping failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapePrizePicks };
