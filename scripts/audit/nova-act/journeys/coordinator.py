"""
scripts/audit/nova-act/journeys/coordinator.py

Task 21.4 / Req 18.1–18.4: Nova Act journey for the Coordinator role.

Journeys:
  1. PLO creation — create a new PLO under a program.
  2. PLO→ILO mapping — map the new PLO to an existing ILO.
  3. Curriculum matrix — verify the matrix shows the new PLO.
"""

import argparse
import json
import os
import sys
from pathlib import Path

try:
    from nova_act import NovaAct  # type: ignore
    NOVA_ACT_AVAILABLE = True
except ImportError:
    NOVA_ACT_AVAILABLE = False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Nova Act Coordinator journey")
    parser.add_argument("--base-url", default="http://localhost:5173")
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--output-dir", default="audit/output/nova-act/coordinator")
    return parser.parse_args()


def run_plo_creation(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/coordinator/plos. "
        "Click the 'Add PLO' or 'Create PLO' button. "
        "Fill in the title with 'Nova Act Test PLO'. "
        "Select a program from the dropdown. "
        "Submit the form. "
        "Verify the new PLO appears in the list."
    )
    return {"journey": "plo-creation", "result": result}


def run_plo_ilo_mapping(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/coordinator/plos. "
        "Find the PLO titled 'Nova Act Test PLO'. "
        "Open its mapping dialog or settings. "
        "Map it to an existing ILO with weight 100. "
        "Save the mapping. "
        "Verify the mapping is shown in the PLO detail."
    )
    return {"journey": "plo-ilo-mapping", "result": result}


def run_curriculum_matrix(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/coordinator/curriculum-matrix. "
        "Verify the matrix loads and shows PLOs as rows and courses as columns. "
        "Check that coverage gaps are visually indicated. "
        "Report any cells that appear broken or empty unexpectedly."
    )
    return {"journey": "curriculum-matrix", "result": result}


def run_flow_discovery(agent: "NovaAct", base_url: str) -> dict:
    result = agent.act(
        f"Navigate to {base_url}/coordinator/dashboard. "
        "Explore all coordinator features. "
        "Report any confusing, broken, or redundant UI elements."
    )
    return {"journey": "flow-discovery", "result": result}


def main() -> int:
    args = parse_args()

    if not NOVA_ACT_AVAILABLE:
        print("[nova-act/coordinator] Nova Act SDK not installed — journey skipped")
        return 0

    api_key = os.environ.get("NOVA_ACT_API_KEY")
    if not api_key:
        print("[nova-act/coordinator] NOVA_ACT_API_KEY not set — journey skipped")
        return 0

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    results = []
    with NovaAct(starting_page=args.base_url, api_key=api_key, headless=not args.headed) as agent:
        results.append(run_plo_creation(agent, args.base_url))
        results.append(run_plo_ilo_mapping(agent, args.base_url))
        results.append(run_curriculum_matrix(agent, args.base_url))
        results.append(run_flow_discovery(agent, args.base_url))

    report_path = output_dir / "report.md"
    with open(report_path, "w") as f:
        f.write("# Nova Act Coordinator Journey Report\n\n")
        for j in results:
            f.write(f"## {j['journey']}\n\n```\n{j['result']}\n```\n\n")

    print(f"[nova-act/coordinator] Report written to {report_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
