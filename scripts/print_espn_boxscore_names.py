import requests
import json
from datetime import datetime

def get_boxscore_player_names(game_date):
    date_str = game_date.strftime('%Y%m%d')
    url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates={date_str}"
    resp = requests.get(url)
    data = resp.json()
    for event in data['events']:
        for comp in event['competitions']:
            print(f"Game: {comp['competitors'][0]['team']['displayName']} vs {comp['competitors'][1]['team']['displayName']}")
            boxscore = comp.get('boxscore', {})
            for player_group in boxscore.get('players', []):
                for player in player_group.get('statistics', []):
                    name = player.get('athlete', {}).get('displayName', '')
                    print(name)
            print('-' * 40)

if __name__ == "__main__":
    # Use the same date as the archive
    dt = datetime(2025, 12, 7)
    get_boxscore_player_names(dt)
