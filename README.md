# PrizePicks Scraper for Custom GPT

Automated daily scraper that collects PrizePicks prop bet data and makes it available to a Custom GPT.

## 🚀 Features

- ✅ Daily automated scraping via GitHub Actions
- ✅ Stores data in JSON format accessible via URL
- ✅ Ready for Custom GPT integration
- ✅ Runs completely free on GitHub

## 📋 Setup Instructions

### 1. Clone and Setup Repository

```bash
git clone <your-repo-url>
cd prizepicks-scraper
npm install
```

### 2. Test Locally

```bash
npm run scrape
```

This will create `data/prizepicks.json` with scraped data.

### 3. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 4. Enable GitHub Actions

The workflow will automatically run:
- **Daily at 12:00 PM UTC** (configurable in `.github/workflows/daily-scrape.yml`)
- **Manually** from the Actions tab
- **On push** to main branch (for testing)

### 5. Access Your Data

Once the scraper runs, access your data at:

```
https://raw.githubusercontent.com/ENKDAY/prizepicks-scraper/main/data/prizepicks.json
```

## 🤖 Custom GPT Setup

### Step 1: Create Your Custom GPT

1. Go to [ChatGPT](https://chat.openai.com)
2. Click your profile → "My GPTs" → "Create a GPT"
3. Give it a name: "PrizePicks Analyzer"

### Step 2: Configure Instructions

Add these instructions:

```
You are a PrizePicks prop bet analyzer. You have access to current prop bet data from PrizePicks.

When users ask about player props, betting lines, or specific players:
1. Use the getPrizePicks action to fetch current data
2. Analyze the data and provide relevant information
3. Help users understand the betting options available

Be informative but remind users to gamble responsibly.
```

### Step 3: Add Action

1. Click "Create new action"
2. Set Authentication to "None"
3. Paste this schema:

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "PrizePicks Data API",
    "description": "Get current PrizePicks prop bet data",
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
        "operationId": "getPrizePicks",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "scrapedAt": {
                      "type": "string",
                      "description": "ISO timestamp of when data was scraped"
                    },
                    "scrapedDate": {
                      "type": "string",
                      "description": "Human-readable date"
                    },
                    "totalProps": {
                      "type": "integer",
                      "description": "Total number of props available"
                    },
                    "props": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "player": {
                            "type": "string"
                          },
                          "stat": {
                            "type": "string"
                          },
                          "line": {
                            "type": "number"
                          },
                          "sport": {
                            "type": "string"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Note:** The URL is already configured for GitHub user ENKDAY.

### Step 4: Test Your GPT

Ask questions like:
- "What props are available today?"
- "Show me NBA player props"
- "What's the line for [player name]?"

## 🔧 Customization

### Change Scraping Schedule

Edit `.github/workflows/daily-scrape.yml`:

```yaml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
  - cron: '0 8,12,20 * * *'  # 8am, 12pm, 8pm UTC
```

### Improve Scraping

The scraper needs to be customized based on PrizePicks' actual structure:

1. Run locally with browser visible:
   ```javascript
   // In scraper.js, change:
   headless: false  // to see what's happening
   ```

2. Use browser dev tools to inspect PrizePicks app
3. Update selectors in `scraper.js` based on actual DOM structure
4. Monitor network tab for API endpoints

### Add More Data Points

Modify the scraper to capture:
- Opponent information
- Game times
- Over/under percentages
- Historical lines
- Multiple sports categories

## ⚠️ Important Notes

### Legal Considerations

- Review PrizePicks Terms of Service
- This is for personal/educational use
- Respect rate limits (current setup: once daily)
- Don't use scraped data commercially

### Rate Limiting

The default configuration scrapes once per day, which is respectful. If you need more frequent updates:
- Consider longer intervals (every 6-12 hours)
- Add delays between requests
- Monitor for any access issues

### Maintenance

PrizePicks may change their website structure. If scraping breaks:
1. Check GitHub Actions logs for errors
2. Update selectors in `scraper.js`
3. Test locally before pushing

## 📊 Data Format

The scraped data looks like:

```json
{
  "scrapedAt": "2025-12-06T12:00:00.000Z",
  "scrapedDate": "Friday, December 6, 2025",
  "source": "PrizePicks",
  "totalProps": 150,
  "props": [
    {
      "player": "LeBron James",
      "stat": "Points",
      "line": 25.5,
      "sport": "NBA"
    },
    {
      "player": "Patrick Mahomes",
      "stat": "Passing Yards",
      "line": 275.5,
      "sport": "NFL"
    }
  ]
}
```

## 🐛 Troubleshooting

**Scraper fails in GitHub Actions:**
- Check Actions tab for error logs
- Ensure Playwright installed correctly
- Verify selectors are still valid

**No data in JSON file:**
- PrizePicks may have changed their structure
- Update selectors in scraper.js
- Check if API endpoints changed

**Custom GPT can't access data:**
- Ensure data/prizepicks.json is committed to main branch
- Verify GitHub repo is public
- Check the raw.githubusercontent.com URL loads in browser

## 📝 License

MIT - Use at your own risk

## 🤝 Contributing

Feel free to submit issues or pull requests to improve the scraper!

---

**Disclaimer:** This tool is for educational purposes. Always gamble responsibly and follow all applicable laws and regulations.
