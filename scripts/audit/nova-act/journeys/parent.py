"""
scripts/audit/nova-act/journeys/parent.py

Task 21.7 / Req 18.1–18.4: Nova Act journey for the Parent role.

Journeys:
  1. Child progress — view linked child's progress.
  2. Attainment summary — view XP and attainment summary.
  3. Notification feed — view notification feed.
"""

import argparse
import os
import sys
from pathlib import Path

try:
    from nova_act import NovaAct  # type: ignore
    NOVA_ACT_AVAILABLE = True
except ImportError:
    NOVA_ACT_AVAILABLE = False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Nova Act Parent journey")
    parser.add_argument("--base-url", default="http://localhost:5173")
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--output-dir", default="audit/output/nova-act/parent")
    return parser.parse_args()


def run_child_progress(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/parent/dashboard. "
        "Select the linked child from the child selector. "
        "Verify the child's progress page loads with course grades and attainment. "
        "Check that the data is current and not stale."
    )
    return {"journey": "child-progress", "result": result}


def run_attainment_summary(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/parent/child-progress. "
        "Find the XP and attainment summary section. "
        "Verify XP total, level, and attainment percentages are displayed. "
        "Check that the data matches what the student sees."
    )
    return {"journey": "attainment-summary", "result": result}


def run_notification_feed(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/parent/notifications. "
        "Verify the notification feed loads. "
        "Check that notifications are sorted by date (newest first). "
        "Mark one notification as read and verify the UI updates."
    )
    return {"journey": "notification-feed", "result": result}


def run_flow_discovery(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/parent/dashboard. "
        "Explore all parent features. "
        "Report any confusing, broken, or redundant UI elements. "
        "Note any information that parents would expect to see but is missing."
    )
    return {"journey": "flow-discovery", "result": result}


def main() -> int:
    args = parse_args()
    if not NOVA_ACT_AVAILABLE:
        print("[nova-act/parent] Nova Act SDK not installed — journey skipped")
        return 0
    api_key = os.environ.get("NOVA_ACT_API_KEY")
    if not api_key:
        print("[nova-act/parent] NOVA_ACT_API_KEY not set — journey skipped")
        return 0

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    results = []
    with NovaAct(starting_page=args.base_url, api_key=api_key, headless=not args.headed) as agent:
        results.append(run_child_progress(agent, args.base_url))
        results.append(run_attainment_summary(agent, args.base_url))
        results.append(run_notification_feed(agent, args.base_url))
        results.append(run_flow_discovery(agent, args.base_url))

    report_path = output_dir / "report.md"
    with open(report_path, "w") as f:
        f.write("# Nova Act Parent Journey Report\n\n")
        for j in results:
            f.write(f"## {j['journey']}\n\n```\n{j['result']}\n```\n\n")
    print(f"[nova-act/parent] Report written to {report_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
