"""
upload_writing_dataset_to_r2.py — Put the Writing part of dataset_clean on Cloudflare R2.

What is uploaded (prefix ``dataset/writing/``):
    sets/{set_id}/overview.json              tong_quan_bo_de_{set_id}.json
    tests/{test_id}/task1.{png|jpg|...}      Task 1 chart, downloaded from the original CDN
    tests/{test_id}/de_bai.json | .md        prompts; Task 1 image_url → R2 URL (source_image_url kept)
    tests/{test_id}/sample_answers.json|.md  model answers
    index.json                               manifest of every test (also written locally)

Student submissions (bai_lam_hoc_vien.json) are NOT uploaded.

Credentials come from backend/.env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
R2_BUCKET_NAME, R2_PUBLIC_DOMAIN (public bucket domain — needed so the AI vision model can
download Task 1 images). Supabase settings are not required.

Usage (from backend/):
    python scripts/upload_writing_dataset_to_r2.py --dry-run      # parse + plan, no network
    python scripts/upload_writing_dataset_to_r2.py                # upload (skips unchanged objects)
    python scripts/upload_writing_dataset_to_r2.py --force --limit 2
"""
from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
DEFAULT_DATASET = REPO_ROOT / "dataset_clean"
PREFIX = "dataset/writing"
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) ielts-grader-dataset-sync"


# ── Dataset parsing ───────────────────────────────────────────────────────────
def _set_id(folder: Path) -> str:
    match = re.match(r"(\d+)_", folder.name)
    return match.group(1) if match else folder.name


def _test_id(folder: Path) -> str:
    match = re.match(r"test_(\d+)_", folder.name)
    return match.group(1) if match else folder.name


def _task_question(de_bai: dict, task_no: int) -> dict:
    """First question of 'Writing Task {n}' (prompt, image_url, limit_time)."""
    for part in de_bai.get("parts", []):
        if part.get("title", "").strip().lower() == f"writing task {task_no}":
            return (part.get("questions") or [{}])[0]
    return {}


def collect_tests(dataset: Path) -> list[dict]:
    """One entry per test folder that has a de_bai.json."""
    tests = []
    for set_dir in sorted((dataset / "de_bai_clean" / "writing").iterdir()):
        if not set_dir.is_dir():
            continue
        answers_set_dir = dataset / "dap_an_loi_giai_clean" / "writing" / set_dir.name
        overview = next(set_dir.glob("tong_quan_bo_de_*.json"), None)
        set_name = ""
        if overview:
            set_name = json.loads(overview.read_text(encoding="utf-8")).get("data", {}).get("name", "")
        for test_dir in sorted(p for p in set_dir.iterdir() if p.is_dir()):
            de_bai_json = test_dir / "de_bai.json"
            if not de_bai_json.exists():
                continue
            answers_dir = answers_set_dir / test_dir.name
            tests.append({
                "set_id": _set_id(set_dir), "set_name": set_name, "set_overview": overview,
                "test_id": _test_id(test_dir), "dir": test_dir, "answers_dir": answers_dir,
                "de_bai": json.loads(de_bai_json.read_text(encoding="utf-8")),
            })
    return tests


# ── R2 client ─────────────────────────────────────────────────────────────────
class R2:
    def __init__(self) -> None:
        import boto3
        from botocore.config import Config

        account = os.environ["R2_ACCOUNT_ID"].replace("https://", "").split(".")[0].strip("/")
        self.bucket = os.environ.get("R2_BUCKET_NAME") or "ielts-grader-media"
        self.client = boto3.client(
            "s3",
            endpoint_url=f"https://{account}.r2.cloudflarestorage.com",
            aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )

    def put(self, key: str, body: bytes, content_type: str, force: bool) -> str:
        """Upload unless an identical object (same MD5 ETag) already exists."""
        if not force:
            try:
                head = self.client.head_object(Bucket=self.bucket, Key=key)
                if head["ETag"].strip('"') == hashlib.md5(body).hexdigest():
                    return "unchanged"
            except self.client.exceptions.ClientError:
                pass
        self.client.put_object(Bucket=self.bucket, Key=key, Body=body, ContentType=content_type)
        return "uploaded"


def public_url(key: str) -> str | None:
    domain = os.environ.get("R2_PUBLIC_DOMAIN", "").strip().rstrip("/")
    if not domain:
        return None
    return f"{domain if domain.startswith('http') else 'https://' + domain}/{key}"


def download_image(url: str) -> tuple[bytes, str, str]:
    import httpx

    resp = httpx.get(url, headers={"User-Agent": USER_AGENT}, timeout=60, follow_redirects=True)
    resp.raise_for_status()
    content_type = resp.headers.get("content-type", "").split(";")[0] or "image/png"
    ext = mimetypes.guess_extension(content_type) or Path(url.split("?")[0]).suffix or ".png"
    return resp.content, content_type, ".jpg" if ext == ".jpe" else ext


# ── Per-test upload ───────────────────────────────────────────────────────────
def plan_test(test: dict, r2: R2 | None, force: bool) -> dict:
    """Upload one test (or only plan it when r2 is None) and return its manifest entry."""
    base = f"{PREFIX}/tests/{test['test_id']}"
    de_bai = test["de_bai"]
    t1, t2 = _task_question(de_bai, 1), _task_question(de_bai, 2)
    source_image = t1.get("image_url")
    entry = {
        "set_id": test["set_id"], "set_name": test["set_name"], "test_id": test["test_id"],
        "title": de_bai.get("title", ""),
        "task1": {"prompt": t1.get("prompt", ""), "source_image_url": source_image,
                  "image_key": None, "image_url": None, "limit_time": t1.get("limit_time")},
        "task2": {"prompt": t2.get("prompt", ""), "limit_time": t2.get("limit_time")},
        "files": {}, "status": {},
    }

    if source_image:
        if r2 is None:
            entry["task1"]["image_key"] = f"{base}/task1.<ext>"
        else:
            body, ctype, ext = download_image(source_image)
            key = f"{base}/task1{ext}"
            entry["status"][key] = r2.put(key, body, ctype, force)
            entry["task1"]["image_key"], entry["task1"]["image_url"] = key, public_url(key)

    # Rewrite the Task 1 image link in the prompt files so they point at R2.
    new_image = entry["task1"]["image_url"] or entry["task1"]["image_key"]
    if source_image:
        t1["source_image_url"], t1["image_url"], t1["image_key"] = source_image, new_image, entry["task1"]["image_key"]

    files = {f"{base}/de_bai.json": (json.dumps(de_bai, ensure_ascii=False, indent=2).encode(), "application/json")}
    md = test["dir"] / "de_bai.md"
    if md.exists():
        text = md.read_text(encoding="utf-8")
        if source_image and new_image:
            text = text.replace(source_image, new_image)
        files[f"{base}/de_bai.md"] = (text.encode(), "text/markdown; charset=utf-8")
    for name, ctype in (("sample_answers.json", "application/json"), ("sample_answers.md", "text/markdown; charset=utf-8")):
        path = test["answers_dir"] / name
        if path.exists():
            files[f"{base}/{name}"] = (path.read_bytes(), ctype)

    for key, (body, ctype) in files.items():
        entry["files"][key.rsplit("/", 1)[1]] = key
        if r2 is not None:
            entry["status"][key] = r2.put(key, body, ctype, force)
    return entry


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--dry-run", action="store_true", help="Parse and plan only (no download / upload)")
    parser.add_argument("--force", action="store_true", help="Re-upload even unchanged objects")
    parser.add_argument("--limit", type=int, help="Only the first N tests")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--manifest-out", type=Path, default=DEFAULT_DATASET / "r2_writing_manifest.json")
    args = parser.parse_args()

    from dotenv import load_dotenv
    load_dotenv(BACKEND_DIR / ".env")

    tests = collect_tests(args.dataset)[: args.limit]
    print(f"Found {len(tests)} Writing tests ({sum(1 for t in tests if _task_question(t['de_bai'], 1).get('image_url'))} with a Task 1 image)")

    r2 = None
    if not args.dry_run:
        missing = [k for k in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY") if not os.environ.get(k)]
        if missing:
            sys.exit(f"Missing {', '.join(missing)} in {BACKEND_DIR / '.env'} (or use --dry-run)")
        if not os.environ.get("R2_PUBLIC_DOMAIN"):
            print("⚠️  R2_PUBLIC_DOMAIN is empty: image_url will be null and the AI cannot read Task 1 charts.")
        r2 = R2()
        print(f"Uploading to bucket '{r2.bucket}' ...")

    entries, errors = [], []

    def run(test):
        try:
            return plan_test(test, r2, args.force)
        except Exception as e:  # keep going; report at the end
            errors.append(f"test {test['test_id']}: {e}")
            return None

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for entry in pool.map(run, tests):
            if entry:
                entries.append(entry)
                if r2:
                    counts = {s: list(entry["status"].values()).count(s) for s in ("uploaded", "unchanged")}
                    print(f"  test {entry['test_id']}: {counts}")

    if r2:
        for set_id, overview in {(t["set_id"], t["set_overview"]) for t in tests if t["set_overview"]}:
            r2.put(f"{PREFIX}/sets/{set_id}/overview.json", overview.read_bytes(), "application/json", args.force)

    manifest = {"prefix": PREFIX, "count": len(entries), "tests": sorted(entries, key=lambda e: (e["set_id"], e["test_id"]))}
    for e in manifest["tests"]:
        e.pop("status", None)
    body = json.dumps(manifest, ensure_ascii=False, indent=2).encode()
    if r2:
        r2.put(f"{PREFIX}/index.json", body, "application/json", True)
    args.manifest_out.write_bytes(body)
    print(f"Manifest ({len(entries)} tests) → {args.manifest_out}")
    if errors:
        print(f"⚠️  {len(errors)} error(s):\n  " + "\n  ".join(errors))
        sys.exit(1)


if __name__ == "__main__":
    main()
