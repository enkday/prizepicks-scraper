
import requests
import datetime
from difflib import SequenceMatcher

def get_nfl_boxscore(game_date, team_code):
    """
    Fetch NFL boxscore from ESPN public API for a given date and team code.
    Returns parsed JSON or None.
    """
    # ESPN NFL scoreboard endpoint (example: https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=20251207)
    date_str = game_date.strftime('%Y%m%d')
    url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates={date_str}"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"ESPN API error: {e}")
        return None


def stat_type_map(stat_type):
    # Map PrizePicks stat types to ESPN stat keys
    mapping = {
        'Pass Yards': ['Passing Yards', 'Pass Yds', 'Yards'],
        'Pass Completions': ['Completions'],
        'Rush Yards': ['Rushing Yards', 'Rush Yds', 'Yards'],
        'Rush Attempts': ['Carries', 'Attempts'],
        'Receiving Yards': ['Receiving Yards', 'Rec Yds', 'Yards'],
        'Receptions': ['Receptions'],
        'Interceptions': ['Interceptions'],
        'FG Made': ['Field Goals Made', 'FGM'],
        'PAT Made': ['Extra Points Made', 'PAT'],
        # Add more mappings as needed
    }
    return mapping.get(stat_type, [stat_type])

def fuzzy_match(a, b, threshold=0.8):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio() >= threshold

def get_team_id_displayname_map(boxscore_json):
    """
    Extracts a mapping of team id to displayName from ESPN API boxscore response.
    Returns dict: {team_id: displayName}
    """
    team_map = {}
    if not boxscore_json or 'events' not in boxscore_json:
        return team_map
    for event in boxscore_json['events']:
        for competition in event.get('competitions', []):
            for competitor in competition.get('competitors', []):
                team = competitor.get('team', {})
                team_id = team.get('id')
                display_name = team.get('displayName')
                if team_id and display_name:
                    team_map[team_id] = display_name
    return team_map



def find_player_stat(boxscore_json, team_code, opponent_code, player_name, stat_type):
    """
    Restrict player matching to the correct game (matching both teams), then match player within that game only.
    """
    if not boxscore_json or 'events' not in boxscore_json:
        print(f"No events in boxscore for team {team_code}")
        return None
    stat_keys = stat_type_map(stat_type)
    # Normalize team names for matching
    def norm(s):
        return s.replace("-", " ").lower() if s else ""
    team_code_norm = norm(team_code)
    opponent_code_norm = norm(opponent_code)
    for event in boxscore_json['events']:
        for competition in event.get('competitions', []):
            competitors = competition.get('competitors', [])
            if len(competitors) != 2:
                continue
            team1 = norm(competitors[0]['team']['displayName'])
            team2 = norm(competitors[1]['team']['displayName'])
            # Check if this is the correct game (both teams match, order agnostic)
            teams_match = (
                (team_code_norm == team1 and opponent_code_norm == team2) or
                (team_code_norm == team2 and opponent_code_norm == team1)
            )
            if not teams_match:
                continue
            # Only search for player in this game
            boxscore = competition.get('boxscore', {})
            found_player = False
            for player_group in boxscore.get('players', []):
                for player in player_group.get('statistics', []):
                    name = player.get('athlete', {}).get('displayName', '').lower()
                    if fuzzy_match(player_name, name):
                        found_player = True
                        for stat in player.get('stats', []):
                            for key in stat_keys:
                                if key.lower() in stat.get('name', '').lower():
                                    print(f"Matched {player_name} ({name}) for stat {key}: {stat.get('value')}")
                                    return stat.get('value')
                        print(f"Player matched but stat not found: {player_name} ({name}) for type {stat_type}")
                        return None
            if not found_player:
                print(f"No player found for {player_name} in correct game {team1} vs {team2} for type {stat_type}")
                return None
    print(f"No matching game found for teams {team_code} vs {opponent_code} for player {player_name}")
    return None
