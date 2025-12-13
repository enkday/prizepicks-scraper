# PrizePicks Mirror Grading Playbook (Knowledge)

This document is **reference material** for grading props after a successful mirror fetch.

## Non-negotiables (summary)
- Mirror-first + proof-of-fetch + fail-closed behavior is defined in `custom-gpt-config.md`.
- This playbook does **not** override `custom-gpt-config.md`.

## Workflow (after mirror fetch)
1) Select smallest relevant mirror endpoint(s) per `custom-gpt-config.md`.
2) Confirm `scrapedDate` and list the endpoint(s) used.
3) Build a candidate set:
	- Broad request: take top 10 by `rank`.
	- Specific matchup/team: filter by `gameId` or team slug endpoints.
4) Grade each prop using the rubric below.
5) Recommend entries only from Greens.

## Grades (Green / Yellow / Red)
### Green
Use when **all** are true:
- Line is current from mirror and applicable slate/time.
- Evidence supports an edge (stat/role/volume alignment) with **high confidence**.
- No major downgrade flags (role volatility, sample issues, weather, etc.).

### Yellow
Use when any are true:
- Missing key inputs (recent usage clarity, uncertain role, unclear matchup context).
- Conflicting signals (good trend but role/volume unstable).
- Sample is small (NFL/CFB <3 recent, NBA <5 recent) or post-change sample is thin.

### Red
Use when any are true:
- Clear mismatch to role/usage or strong negative matchup.
- High volatility + no supporting evidence.
- Weather/conditions strongly adverse for the stat.

## EHP (Expected Hit Probability)
### Definition
EHP is a **0–100%** estimate of hit probability **given available info**.

### Weighting (default)
- 35% Recent vs line (last 5–10; use post-role-change only)
- 25% Volume stability (snap rate, attempts, minutes, targets)
- 20% Opponent/pace/context (defense vs position/stat, pace)
- 10% Market/line stability (only if verifiable via mirror history)
- 10% Efficiency/skill proxy (limited; avoid over-weighting)

If required inputs are missing, set **EHP = N/A** and likely grade Yellow.

### Tiers
- $\ge 62\%$ → Green (High confidence)
- $57–61\%$ → Yellow
- $\le 56\%$ → Red

## Guardrails & downgrades
### Role/volume volatility
Downgrade when:
- Recent role change (injury return, depth chart shift, coaching change)
- Usage swings >20% game-to-game without clear explanation

### Sample size
- NFL/CFB: fewer than 3 relevant recent games → downgrade
- NBA: fewer than 5 relevant recent games → downgrade

### Correlation
Avoid highly correlated legs unless explicitly justified.
Examples of correlated legs:
- QB passing yards + WR receiving yards (same team)
- RB rushing yards + team total points (often correlated)

### Weather (outdoor)
Downgrade passing/FG when:
- Sustained wind > 15 mph
- Heavy precipitation

## Sport-specific notes
### NFL
- Prefer stable-volume markets (attempts/targets) over high-variance TD markets.
- Use team endpoints for matchup-focused asks when available.

### NBA
- Focus on minutes stability and role (starter vs bench, usage rate shifts).
- Beware back-to-back/rest impacts if known from reliable context.

## Output formatting rules
- Use the table columns from `custom-gpt-config.md`.
- Keep rationale to 2–4 bullets, grounded in mirror facts.

## Example (format)
Player | Team | Stat | Line | Opponent | Grade | Rationale | Confidence | EHP (%)
- Rationale bullets should cite mirror facts (line, opponent, start time) and only limited web context (injury/role/weather) when used.
