"""
scripts/audit/nova-act/journeys/admin.py

Task 21.3 / Req 18.1–18.4: Nova Act journey for the Admin role.

Journeys:
  1. ILO creation — navigate to ILO list, create a new ILO, verify it appears.
  2. User creation — navigate to Users list, create a new teacher user.
  3. Audit log review — navigate to audit log viewer, verify recent entries.

Flow-discovery pass (Req 18.4):
  Exploratory prompt: "Explore the admin dashboard and report any confusing,
  broken, or redundant UI elements."
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Nova Act SDK import — graceful fallback if not installed
try:
    from nova_act import NovaAct  # type: ignore
    NOVA_ACT_AVAILABLE = True
except ImportError:
    NOVA_ACT_AVAILABLE = False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Nova Act Admin journey")
    parser.add_argument("--base-url", default="http://localhost:5173")
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--output-dir", default="audit/output/nova-act/admin")
    return parser.parse_args()


def run_ilo_creation(agent: "NovaAct", base_url: str) -> dict:
    """Journey 1: ILO creation."""
    result = agent.act(
        f"Navigate to {base_url}/admin/ilos. "
        "Click the 'Add ILO' or 'Create ILO' button. "
        "Fill in the title field with 'Nova Act Test ILO'. "
        "Fill in the description field. "
        "Submit the form. "
        "Verify the new ILO appears in the list."
    )
    return {"journey": "ilo-creation", "result": result}


def run_user_creation(agent: "NovaAct", base_url: str) -> dict:
    """Journey 2: User creation."""
    result = agent.act(
        f"Navigate to {base_url}/admin/users. "
        "Click the 'Add User' or 'Create User' button. "
        "Fill in the email field with 'nova-test-teacher@edeviser.test'. "
        "Select 'Teacher' as the role. "
        "Submit the form. "
        "Verify the new user appears in the list."
    )
    return {"journey": "user-creation", "result": result}


def run_audit_log_review(agent: "NovaAct", base_url: str) -> dict:
    """Journey 3: Audit log review."""
    result = agent.act(
        f"Navigate to {base_url}/admin/audit-logs. "
        "Verify that the audit log viewer loads and shows recent entries. "
        "Check that each entry has a timestamp, actor, and action. "
        "Try filtering by the most recent actor."
    )
    return {"journey": "audit-log-review", "result": result}


def run_flow_discovery(agent: "NovaAct", base_url: str) -> dict:
    """Flow-discovery pass (Req 18.4)."""
    result = agent.act(
        f"Navigate to {base_url}/admin/dashboard. "
        "Explore the admin dashboard and all available navigation items. "
        "Report any confusing, broken, or redundant UI elements you encounter. "
        "Note any actions that are unclear or require more than 3 clicks to complete. "
        "Identify any missing feedback (loading states, error messages, success confirmations)."
    )
    return {"journey": "flow-discovery", "result": result}


def main() -> int:
    args = parse_args()

    if not NOVA_ACT_AVAILABLE:
        print("[nova-act/admin] Nova Act SDK not installed — journey skipped")
        return 0

    api_key = os.environ.get("NOVA_ACT_API_KEY")
    if not api_key:
        print("[nova-act/admin] NOVA_ACT_API_KEY not set — journey skipped")
        return 0

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    results = []

    with NovaAct(
        starting_page=args.base_url,
        api_key=api_key,
        headless=not args.headed,
    ) as agent:
        results.append(run_ilo_creation(agent, args.base_url))
        results.append(run_user_creation(agent, args.base_url))
        results.append(run_audit_log_review(agent, args.base_url))
        results.append(run_flow_discovery(agent, args.base_url))

    report = {
        "role": "admin",
        "generatedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "baseUrl": args.base_url,
        "journeys": results,
    }

    report_path = output_dir / "report.md"
    with open(report_path, "w") as f:
        f.write(f"# Nova Act Admin Journey Report\n\n")
        f.write(f"Generated: {report['generatedAt']}\n\n")
        for journey in results:
            f.write(f"## {journey['journey']}\n\n")
            f.write(f"```\n{journey['result']}\n```\n\n")

    json_path = output_dir / "report.json"
    with open(json_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"[nova-act/admin] Report written to {report_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
