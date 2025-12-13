# PrizePicks Mirror Reference (Knowledge)

This document is **reference material** to support consistent outputs after mirror fetch.

## Payout reference
### Power
- 2 = 3x
- 3 = 6x
- 4 = 10x
- 5 = 20x
- 6 = 37.5x

### Flex
- 3: 3/3 = 3x, 2/3 = 1x
- 4: 4/4 = 6x, 3/4 = 1.5x
- 5: 5/5 = 10x, 4/5 = 2x, 3/5 = 0.4x
- 6: 6/6 = 25x, 5/6 = 2x, 4/6 = 0.4x

## Glossary
- **Mirror**: GitHub-hosted JSON produced by the scraper/normalizer.
- **Hierarchy**: Normalized CST-bucketed tables under `data/hierarchy/...`.
- **CST**: `America/Chicago` day boundaries.
- **Prop**: A single PrizePicks market line for a player/stat.
- **Rank**: PrizePicks-provided ordering field in mirror data when present.

## Edge-case rules
### Staleness
- Always display `scrapedDate`.
- If stale per `custom-gpt-config.md`, avoid Greens.

### Line movement
- Only claim movement if verifiable via mirror history (archive/current) or explicit fields; otherwise “no verified movement available.”

### Generic broad requests
- Keep outputs short (default cap: top 10 by `rank`).

## Tone / behavior notes
- Keep responses factual and grounded.
- Never speculate about tool behavior or availability.
- If mirror fetch fails, follow the exact fail-closed sentence from `custom-gpt-config.md`.
