# Custom GPT Configuration Guide

## Quick Setup Checklist

- [ ] Repository is public on GitHub
- [ ] GitHub Actions workflow has run successfully
- [ ] `data/prizepicks.json` exists in your repo
- [ ] You can access the raw file URL

## Custom GPT Configuration

### Name
```
PrizePicks Analyzer
```

### Description
```
Expert analyzer of PrizePicks prop bets with access to current betting lines and player projections
```

### Instructions
```
You are an expert PrizePicks prop bet analyzer with access to real-time data from PrizePicks.

CAPABILITIES:
- Access current prop bet lines for all available sports
- Analyze player statistics and projections
- Compare betting options across different players
- Help users find specific props they're interested in

WHEN USERS ASK ABOUT:
1. **Specific players**: Search the props data for that player's name and show all available bets
2. **Sports**: Filter props by sport (NBA, NFL, MLB, etc.)
3. **Stat types**: Filter by stat category (points, rebounds, passing yards, etc.)
4. **Current lines**: Show the over/under line for requested props

IMPORTANT REMINDERS:
- Always mention when the data was last updated (check scrapedDate)
- Remind users this is for entertainment/educational purposes
- Encourage responsible gambling
- Note that lines change frequently and users should verify on PrizePicks

RESPONSE FORMAT:
When showing props, format them clearly:
- Player Name
- Sport
- Stat Type: Line value
- Example: "LeBron James (NBA) - Points: 25.5"

Always be helpful, concise, and remind users to gamble responsibly.
```

### Conversation Starters
```
What NBA props are available today?
Show me all props for [player name]
What's trending in NFL props?
Help me find high-value player props
```

### Knowledge
Upload the `data/prizepicks.json` file as a reference (optional, since you're using Actions)

---

## Action Configuration

### Import from URL (Easiest)

If you create an OpenAPI spec file in your repo:

1. Create `openapi.json` in your repo with the content below
2. In Custom GPT settings → Actions → "Import from URL"
3. Enter: `https://raw.githubusercontent.com/ENKDAY/prizepicks-scraper/main/openapi.json`

### Manual Configuration

**Schema:**

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "PrizePicks Data API",
    "description": "Provides current PrizePicks prop bet data scraped daily",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://raw.githubusercontent.com/ENKDAY/prizepicks-scraper/main"
    }
  ],
  "paths": {
    "/data/prizepicks.json": {
      "get": {
        "summary": "Get current PrizePicks prop bets",
        "description": "Returns all available prop bets scraped from PrizePicks, updated daily",
        "operationId": "getPrizePicks",
        "responses": {
          "200": {
            "description": "Successful response with prop bet data",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PrizePicksData"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "PrizePicksData": {
        "type": "object",
        "properties": {
          "scrapedAt": {
            "type": "string",
            "format": "date-time",
            "description": "ISO 8601 timestamp of when data was scraped"
          },
          "scrapedDate": {
            "type": "string",
            "description": "Human-readable date of scraping"
          },
          "source": {
            "type": "string",
            "description": "Data source (PrizePicks)"
          },
          "totalProps": {
            "type": "integer",
            "description": "Total number of prop bets available"
          },
          "props": {
            "type": "array",
            "description": "Array of all prop bets",
            "items": {
              "$ref": "#/components/schemas/PropBet"
            }
          }
        }
      },
      "PropBet": {
        "type": "object",
        "properties": {
          "player": {
            "type": "string",
            "description": "Player name"
          },
          "stat": {
            "type": "string",
            "description": "Stat type (Points, Rebounds, Passing Yards, etc.)"
          },
          "line": {
            "type": "number",
            "description": "Over/under line value"
          },
          "sport": {
            "type": "string",
            "description": "Sport (NBA, NFL, MLB, etc.)"
          }
        }
      }
    }
  }
}
```

**Privacy Policy URL (Required):**
```
https://github.com/ENKDAY/prizepicks-scraper
```

**Authentication:**
```
None
```

---

## Testing Your Custom GPT

### Test Questions

1. **Basic data fetch:**
   ```
   What props are available right now?
   ```

2. **Filter by sport:**
   ```
   Show me all NBA props
   ```

3. **Search for player:**
   ```
   What are the props for LeBron James?
   ```

4. **Specific stat:**
   ```
   Show me all passing yards props
   ```

5. **Data freshness:**
   ```
   When was this data last updated?
   ```

### Expected Behavior

The GPT should:
- ✅ Automatically call the `getPrizePicks` action
- ✅ Parse the JSON response
- ✅ Filter/search based on user query
- ✅ Present results in a clear format
- ✅ Mention when data was last updated
- ✅ Remind users to verify on PrizePicks

---

## Advanced Configuration

### Add More Actions

You could expand this to include:

1. **Historical data:**
   ```json
   "/data/history/{date}.json": {
     "get": {
       "summary": "Get historical prop data",
       "parameters": [
         {
           "name": "date",
           "in": "path",
           "required": true,
           "schema": {
             "type": "string",
             "format": "date"
           }
         }
       ]
     }
   }
   ```

2. **Statistics endpoint:**
   Create a separate script that generates statistics and saves to `data/stats.json`

3. **Player-specific endpoints:**
   Pre-process data into player-specific files

### Rate Limiting

If you're concerned about GitHub rate limits:
- GitHub raw file access is generous
- Consider caching in GPT instructions
- Use CloudFlare Pages or Netlify for unlimited bandwidth

---

## Troubleshooting

### "Action failed" error
- Check that your GitHub repo is **public**
- Verify the raw URL loads in a browser
- Ensure `data/prizepicks.json` exists

### Empty or no data returned
- Check GitHub Actions ran successfully
- Verify JSON is valid (use JSONLint)
- Make sure scraper didn't fail silently

### GPT doesn't use the action
- Make sure action is enabled
- Check instructions explicitly mention using the data
- Try asking "use the getPrizePicks action"

---

## Update Checklist

When updating your scraper:

1. [ ] Test locally first
2. [ ] Verify JSON output format matches schema
3. [ ] Push to GitHub
4. [ ] Wait for GitHub Action to run
5. [ ] Test the raw URL in browser
6. [ ] Test in Custom GPT
7. [ ] Update this documentation if schema changed

---

**All URLs are configured for GitHub user: ENKDAY**
