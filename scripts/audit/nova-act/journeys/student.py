"""
scripts/audit/nova-act/journeys/student.py

Task 21.6 / Req 18.1–18.4: Nova Act journey for the Student role.

Journeys:
  1. Learning path — view assignments ordered by Bloom level.
  2. Assignment submission — submit an assignment.
  3. XP/streak view — verify XP total and streak counter.
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
    parser = argparse.ArgumentParser(description="Nova Act Student journey")
    parser.add_argument("--base-url", default="http://localhost:5173")
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--output-dir", default="audit/output/nova-act/student")
    return parser.parse_args()


def run_learning_path(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/student/learning-path. "
        "Verify assignments are displayed in order from Remembering to Creating (Bloom's taxonomy). "
        "Check that locked assignments show a lock icon or disabled state. "
        "Report any assignments that appear out of order."
    )
    return {"journey": "learning-path", "result": result}


def run_assignment_submission(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/student/assignments. "
        "Find an available (unlocked) assignment. "
        "Open it and submit a response. "
        "Verify the submission is confirmed with a success message."
    )
    return {"journey": "assignment-submission", "result": result}


def run_xp_streak_view(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/student/xp. "
        "Verify the XP total is displayed. "
        "Navigate to the streak page. "
        "Verify the streak counter is visible. "
        "Check that the leaderboard shows the student's position."
    )
    return {"journey": "xp-streak-view", "result": result}


def run_flow_discovery(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/student/dashboard. "
        "Explore all student features including gamification elements. "
        "Report any confusing, broken, or redundant UI elements. "
        "Note any gamification elements that feel unclear or unmotivating."
    )
    return {"journey": "flow-discovery", "result": result}


def main() -> int:
    args = parse_args()
    if not NOVA_ACT_AVAILABLE:
        print("[nova-act/student] Nova Act SDK not installed — journey skipped")
        return 0
    api_key = os.environ.get("NOVA_ACT_API_KEY")
    if not api_key:
        print("[nova-act/student] NOVA_ACT_API_KEY not set — journey skipped")
        return 0

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    results = []
    with NovaAct(starting_page=args.base_url, api_key=api_key, headless=not args.headed) as agent:
        results.append(run_learning_path(agent, args.base_url))
        results.append(run_assignment_submission(agent, args.base_url))
        results.append(run_xp_streak_view(agent, args.base_url))
        results.append(run_flow_discovery(agent, args.base_url))

    report_path = output_dir / "report.md"
    with open(report_path, "w") as f:
        f.write("# Nova Act Student Journey Report\n\n")
        for j in results:
            f.write(f"## {j['journey']}\n\n```\n{j['result']}\n```\n\n")
    print(f"[nova-act/student] Report written to {report_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
