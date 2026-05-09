"""
scripts/audit/nova-act/journeys/teacher.py

Task 21.5 / Req 18.1–18.4: Nova Act journey for the Teacher role.

Journeys:
  1. CLO creation — create a CLO with a Bloom level.
  2. Assignment creation — create an assignment linking the CLO.
  3. Grade release — grade a submission and release the grade.
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
    parser = argparse.ArgumentParser(description="Nova Act Teacher journey")
    parser.add_argument("--base-url", default="http://localhost:5173")
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--output-dir", default="audit/output/nova-act/teacher")
    return parser.parse_args()


def run_clo_creation(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/teacher/courses. "
        "Open the first available course. "
        "Navigate to the CLOs section. "
        "Create a new CLO with title 'Nova Act Test CLO' and Bloom level 'Applying'. "
        "Submit and verify it appears in the CLO list."
    )
    return {"journey": "clo-creation", "result": result}


def run_assignment_creation(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/teacher/assignments. "
        "Click 'Create Assignment'. "
        "Fill in the title 'Nova Act Test Assignment'. "
        "Link it to the CLO created earlier. "
        "Set a due date one week from today. "
        "Submit and verify the assignment appears."
    )
    return {"journey": "assignment-creation", "result": result}


def run_grade_release(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/teacher/grading. "
        "Find a pending submission. "
        "Enter a grade score. "
        "Click 'Release Grade'. "
        "Verify the grade is marked as released."
    )
    return {"journey": "grade-release", "result": result}


def run_flow_discovery(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/teacher/dashboard. "
        "Explore all teacher features. "
        "Report any confusing, broken, or redundant UI elements."
    )
    return {"journey": "flow-discovery", "result": result}


def main() -> int:
    args = parse_args()
    if not NOVA_ACT_AVAILABLE:
        print("[nova-act/teacher] Nova Act SDK not installed — journey skipped")
        return 0
    api_key = os.environ.get("NOVA_ACT_API_KEY")
    if not api_key:
        print("[nova-act/teacher] NOVA_ACT_API_KEY not set — journey skipped")
        return 0

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    results = []
    with NovaAct(starting_page=args.base_url, api_key=api_key, headless=not args.headed) as agent:
        results.append(run_clo_creation(agent, args.base_url))
        results.append(run_assignment_creation(agent, args.base_url))
        results.append(run_grade_release(agent, args.base_url))
        results.append(run_flow_discovery(agent, args.base_url))

    report_path = output_dir / "report.md"
    with open(report_path, "w") as f:
        f.write("# Nova Act Teacher Journey Report\n\n")
        for j in results:
            f.write(f"## {j['journey']}\n\n```\n{j['result']}\n```\n\n")
    print(f"[nova-act/teacher] Report written to {report_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
