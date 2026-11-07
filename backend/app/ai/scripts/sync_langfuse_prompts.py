"""
sync_langfuse_prompts.py — Manage the Langfuse prompt tree (writing/ + speaking/).

Langfuse is the single source of truth for prompt content (edit prompts in the
Langfuse UI). The registry (services/langfuse/prompt_registry.py) defines which
prompt names the code reads; this script checks Langfuse against it.

Usage (from backend/app/ai):
    uv run python scripts/sync_langfuse_prompts.py --list
    uv run python scripts/sync_langfuse_prompts.py --verify
    uv run python scripts/sync_langfuse_prompts.py --delete-unregistered [--yes]
"""

import argparse
import sys
from pathlib import Path
from urllib.parse import quote

from langfuse.api.commons.errors.error import Error

AI_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AI_ROOT))

from services.langfuse.client import get_langfuse_client  # noqa: E402
from services.langfuse.prompt_registry import ALL_PROMPT_NAMES  # noqa: E402

LABEL = "production"


def _api_name(name: str) -> str:
    """The low-level REST client does not URL-encode names ("writing/task1/ta", "CC/ System prompt")."""
    return quote(name, safe="")


def _list_remote() -> list:
    client, page, items = get_langfuse_client(), 1, []
    while True:
        res = client.api.prompts.list(page=page, limit=100)
        items.extend(res.data)
        if page >= res.meta.total_pages:
            return items
        page += 1


def list_prompts() -> None:
    remote = {p.name: p for p in _list_remote()}
    print(f"{'NAME':<34} {'STATUS':<14} VERSIONS")
    for name in sorted(set(remote) | set(ALL_PROMPT_NAMES)):
        p = remote.get(name)
        if name not in ALL_PROMPT_NAMES:
            status = "unregistered"
        elif p is None or LABEL not in p.labels:
            status = "MISSING"
        else:
            status = "ok"
        print(f"{name:<34} {status:<14} {p.versions if p else '-'}")


def verify_prompts() -> bool:
    client, ok = get_langfuse_client(), True
    for name in ALL_PROMPT_NAMES:
        try:
            p = client.get_prompt(name=name, type="chat", label=LABEL, cache_ttl_seconds=0)
            print(f"  [OK]   {name} (v{p.version})")
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            ok = False
    return ok


def delete_unregistered(yes: bool) -> None:
    client = get_langfuse_client()
    targets = [p.name for p in _list_remote() if p.name not in ALL_PROMPT_NAMES]
    if not targets:
        print("Nothing to delete — every prompt on Langfuse is registered.")
        return
    print("Prompts not in the registry:\n  " + "\n  ".join(targets))
    if not yes:
        print("Dry run. Re-run with --yes to delete them.")
        return
    # Langfuse refuses to delete a prompt that another one composes, so dependents must go first.
    while targets:
        blocked = []
        for name in targets:
            try:
                client.api.prompts.delete(_api_name(name))
                print(f"  deleted {name}")
            except Error as error:
                if error.status_code != 400:
                    raise
                blocked.append(name)
        if len(blocked) == len(targets):
            raise RuntimeError(f"Could not delete: {blocked}")
        targets = blocked


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--list", action="store_true", help="Langfuse prompts vs registry")
    parser.add_argument("--verify", action="store_true", help="Every registered prompt has a production version")
    parser.add_argument("--delete-unregistered", action="store_true", help="Delete prompts not in the registry")
    parser.add_argument("--yes", action="store_true", help="With --delete-unregistered: actually delete")
    args = parser.parse_args()

    if args.verify:
        sys.exit(0 if verify_prompts() else 1)
    elif args.delete_unregistered:
        delete_unregistered(args.yes)
    else:
        list_prompts()


if __name__ == "__main__":
    main()
