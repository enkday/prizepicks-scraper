import os
import json
import requests

ARCHIVE_DIR = "data/hierarchy/archive/"
STAT_MAP = {"Points": 0, "Rebounds": 1, "Assists": 2}
RESULTS_FILE = "data/hierarchy/archive_results.json"

def get_espn_game_id(team1, team2, date):
    scoreboard_url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={date}"
    scoreboard = requests.get(scoreboard_url).json()
    for event in scoreboard.get('events', []):
        teams = [c['team']['displayName'] for c in event['competitions'][0]['competitors']]
        if team1 in teams and team2 in teams:
            return event['id']
    return None

def get_player_stat(gameId, player_name, stat_index=0):
    boxscore_url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={gameId}"
    boxscore = requests.get(boxscore_url).json()
    for team in boxscore.get('boxscore', {}).get('players', []):
        for player in team['statistics'][0]['athletes']:
            if player['displayName'] == player_name:
                return int(player['stats'][stat_index])
    return None

def main():
    results = []
    for filename in os.listdir(ARCHIVE_DIR):
        if filename.endswith(".json"):
            with open(os.path.join(ARCHIVE_DIR, filename)) as f:
                props = json.load(f).get("props", [])
                for prop in props:
                    if prop.get("sport") != "NBA":
                        continue
                    player = prop.get("player")
                    stat = prop.get("stat")
                    line = prop.get("line")
                    team = prop.get("Team")
                    opponent = prop.get("Opponent")
                    date = prop.get("startTimeIso", "")[:10].replace("-", "")
                    stat_index = STAT_MAP.get(stat, 0)
                    gameId = get_espn_game_id(team, opponent, date)
                    if not gameId:
                        continue
                    actual = get_player_stat(gameId, player, stat_index)
                    if actual is None:
                        continue
                    hit = actual > line
                    results.append({
                        "player": player,
                        "stat": stat,
                        "line": line,
                        "actual": actual,
                        "hit": hit,
                        "gameId": gameId,
                        "date": date
                    })
    with open(RESULTS_FILE, "w") as out:
        json.dump(results, out, indent=2)
    print(f"Batch comparison complete. Results saved to {RESULTS_FILE}.")

if __name__ == "__main__":
    main()
