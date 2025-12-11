import os
import json
from datetime import datetime
try:
    from scripts.espn_api_utils import get_nfl_boxscore, find_player_stat
except ImportError:
    from espn_api_utils import get_nfl_boxscore, find_player_stat

ARCHIVE_ROOT = "data/hierarchy/archive"
RESULTS_FILE = "data/hierarchy/results/graded_props_cumulative.json"

def get_latest_archive_dir():
    if not os.path.exists(ARCHIVE_ROOT):
        return None
    dirs = [d for d in os.listdir(ARCHIVE_ROOT) if os.path.isdir(os.path.join(ARCHIVE_ROOT, d))]
    if not dirs:
        return None
    # Sort by date descending
    dirs.sort(reverse=True)
    return os.path.join(ARCHIVE_ROOT, dirs[0])

def load_json(path):
    with open(path) as f:
        return json.load(f)

def load_cumulative_results():
    if not os.path.exists(RESULTS_FILE):
        return []
    with open(RESULTS_FILE) as f:
        return json.load(f)

def save_cumulative_results(results):
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)

def fetch_actual_stat(prop):
    # Only support NFL for now
    if prop.get("sport", "").upper() != "NFL":
        return None
    # Parse date from startTimeIso
    try:
        dt = datetime.fromisoformat(prop["startTimeIso"].replace("Z", ""))
    except Exception:
        return None
    team_code = prop.get("teamCode", "")
    opponent_code = prop.get("opponentCode", "")
    player_name = prop.get("playerName", "")
    stat_type = prop.get("stat", "")
    boxscore = get_nfl_boxscore(dt, team_code)
    if not boxscore:
        return None
    # Get team id → displayName mapping
    try:
        from scripts.espn_api_utils import get_team_id_displayname_map
    except ImportError:
        from espn_api_utils import get_team_id_displayname_map
    team_map = get_team_id_displayname_map(boxscore)
    # Reverse map: displayName → team id
    displayname_to_id = {v.lower(): k for k, v in team_map.items()}
    # Normalize prop teamCode to ESPN displayName
    normalized_team_code = team_code.replace("-", " ").lower()
    resolved_team_id = displayname_to_id.get(normalized_team_code)
    print(f"Team mapping for date {dt.date()}: {team_map}")
    print(f"Prop teamCode: {team_code}, opponentCode: {opponent_code}, normalized: {normalized_team_code}, resolved team id: {resolved_team_id}")
    print(f"Prop playerName: {player_name}, stat_type: {stat_type}")
    # Only match player in correct game (team vs opponent)
    return find_player_stat(boxscore, team_code, opponent_code, player_name, stat_type)

def grade_prop(prop):
    actual = fetch_actual_stat(prop)
    if actual is None:
        achieved = None
    else:
        achieved = actual >= prop["line"] if isinstance(actual, (int, float)) else None
    return {
        "date": prop.get("startTimeIso"),
        "playerId": prop.get("playerId"),
        "playerName": prop.get("playerName"),
        "teamCode": prop.get("teamCode"),
        "opponentCode": prop.get("opponentCode"),
        "stat": prop.get("stat"),
        "line": prop.get("line"),
        "actual": actual,
        "achieved": achieved,
        "propId": prop.get("propId"),
        "sport": prop.get("sport"),
        "gameId": prop.get("gameId"),
    }

def main():
    archive_dir = get_latest_archive_dir()
    if not archive_dir:
        print("No archive found.")
        return
    props_path = os.path.join(archive_dir, "props.json")
    if not os.path.exists(props_path):
        print(f"No props.json found in {archive_dir}")
        return
    props = load_json(props_path)
    # Load players.json and build playerId → playerName map
    players_path = os.path.join(archive_dir, "players.json")
    if os.path.exists(players_path):
        players = load_json(players_path)
        playerid_to_name = {p["playerId"]: p["playerName"] for p in players if "playerId" in p and "playerName" in p}
    else:
        playerid_to_name = {}
    cumulative = load_cumulative_results()
    graded = []
    for prop in props:
        # Inject playerName if missing
        if not prop.get("playerName") and prop.get("playerId"):
            prop["playerName"] = playerid_to_name.get(prop["playerId"], "")
        graded.append(grade_prop(prop))
    cumulative.extend(graded)
    save_cumulative_results(cumulative)
    print(f"Appended {len(graded)} graded props to cumulative results.")

if __name__ == "__main__":
    main()
