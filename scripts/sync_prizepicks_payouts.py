"""
Fetches PrizePicks payout multipliers from the official How To Play page
and rewrites docs/prizepicks-payouts.md.

Source: https://www.prizepicks.com/resources/how-to-play-prizepicks
"""
import datetime
import pathlib
import requests
from bs4 import BeautifulSoup

PLAYBOOK_URL = "https://www.prizepicks.com/resources/how-to-play-prizepicks"
OUT_PATH = pathlib.Path("docs/prizepicks-payouts.md")


def fetch_tables():
    resp = requests.get(PLAYBOOK_URL, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    tables = []
    for table in soup.find_all("table"):
        rows = []
        for tr in table.find_all("tr"):
            cells = [c.get_text(strip=True) for c in tr.find_all(["td", "th"])]
            if cells:
                rows.append(cells)
        if rows:
            tables.append(rows)
    return tables


def format_markdown(power_rows, flex_rows, fetched_at):
    lines = []
    lines.append("# PrizePicks Payout Reference (Power vs Flex)")
    lines.append("")
    lines.append(f"Source: {PLAYBOOK_URL} (captured {fetched_at}). Update this file if PrizePicks changes multipliers.")
    lines.append("")
    lines.append("## Power Play (must hit all legs)")
    for row in power_rows:
        if len(row) != 2 or row[0].lower() == "lineup":
            continue
        lines.append(f"- {row[0]}: **{row[1]}**")
    lines.append("")
    lines.append("## Flex Play (partial-hit outcomes)")
    for row in flex_rows:
        if len(row) != 2 or row[0].lower() == "lineup":
            continue
        # flex rows embed outcomes in the payout string (e.g., "6/6 - 25x5/6 - 2x4/6 - 0.4x")
        lines.append(f"- {row[0]}: **{row[1]}**")
    lines.append("")
    lines.append("## Usage Notes")
    lines.append("- Power maximizes payout only when all legs hit; no partial returns.")
    lines.append("- Flex provides reduced payouts on a miss (or two, for 6-pick).")
    lines.append("- When recommending entries, pick the lineup type that matches risk tolerance and acknowledge partial-hit outcomes for Flex.")
    lines.append("")
    return "\n".join(lines)


def main():
    tables = fetch_tables()
    if len(tables) < 2:
        raise RuntimeError("Expected at least two tables for power and flex payouts.")
    power_rows = tables[0]
    flex_rows = tables[1]
    fetched_at = datetime.datetime.utcnow().strftime("%b %d, %Y (UTC)")
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(format_markdown(power_rows, flex_rows, fetched_at))
    print(f"Wrote payout reference to {OUT_PATH}")


if __name__ == "__main__":
    main()
