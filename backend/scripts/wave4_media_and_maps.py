"""Mirror remaining prep-storage-service media and 4 SVG maps to MoonLab R2 (DATA-03, DATA-05)."""
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
from pathlib import Path
import threading
import time
import boto3
from botocore.config import Config
from dotenv import load_dotenv
import httpx
import psycopg2

from wave4_map_svg_builder import build_all_listening_map_svgs

MANIFEST_PATH = Path(
    r"C:\Users\Admin\.gemini\antigravity\brain\eb6c68c0-d77e-4a6a-8e53-bf97bbe8c500\scratch\wave4_media_manifest.json"
)
_TLS = threading.local()


def _s3_client():
    if not getattr(_TLS, "s3", None):
        acct = os.environ["R2_ACCOUNT_ID"].replace("https://", "").replace("http://", "").split(".")[0]
        _TLS.s3 = boto3.client(
            "s3",
            endpoint_url=f"https://{acct}.r2.cloudflarestorage.com",
            aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            config=Config(signature_version="s3v4", max_pool_connections=32),
            region_name="auto",
        )
    return _TLS.s3


def _http_client() -> httpx.Client:
    if not getattr(_TLS, "http", None):
        _TLS.http = httpx.Client(timeout=25.0, follow_redirects=True)
    return _TLS.http


def _public_url(key: str) -> str:
    return f"{os.environ['R2_PUBLIC_DOMAIN'].rstrip('/')}/{key.lstrip('/')}"


def _list_existing_keys(s3, bucket: str, prefixes: tuple[str, ...]) -> set[str]:
    existing: set[str] = set()
    for pfx in prefixes:
        paginator = s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket, Prefix=pfx):
            for obj in page.get("Contents") or []:
                existing.add(obj["Key"])
    return existing


def _mirror_one(job: tuple[str, str, str, str, str, bool], existing: set[str]) -> tuple[str, str, str]:
    tbl, row_id, src_url, r2_key, ctype, store_rel = job
    if r2_key not in existing:
        s3 = _s3_client()
        http = _http_client()
        bucket = os.environ["R2_BUCKET_NAME"]
        last_err = None
        for attempt in range(3):
            try:
                resp = http.get(src_url)
                resp.raise_for_status()
                s3.put_object(Bucket=bucket, Key=r2_key, Body=resp.content, ContentType=ctype)
                last_err = None
                break
            except Exception as exc:
                last_err = exc
                time.sleep(0.4 * (attempt + 1))
        if last_err:
            raise RuntimeError(f"Failed {tbl}/{row_id}: {last_err}")
    return tbl, row_id, (r2_key if store_rel else _public_url(r2_key))


def main() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    load_dotenv(backend_dir / ".env")
    bucket = os.environ["R2_BUCKET_NAME"]
    s3 = _s3_client()

    conn = psycopg2.connect(os.environ["SUPABASE_DB_URL"])
    cur = conn.cursor()
    jobs: list[tuple[str, str, str, str, str, bool]] = []
    cur.execute("SELECT section_id, audio_key FROM public.lr_sections WHERE audio_key ILIKE '%prep%'")
    for sid, url in cur.fetchall():
        jobs.append(("lr_sections", str(sid), url, f"audio/listening/{sid}.mp3", "audio/mpeg", False))
    cur.execute("SELECT id, audio_key FROM public.speaking_questions WHERE audio_key ILIKE '%prep%'")
    for qid, url in cur.fetchall():
        jobs.append(("speaking_questions", str(qid), url, f"audio/speaking/{qid}.mp3", "audio/mpeg", False))
    cur.execute("SELECT section_id, chart_image_key FROM public.writing_tasks WHERE chart_image_key ILIKE '%prep%'")
    for sid, url in cur.fetchall():
        ext = "png" if ".png" in url.lower() else "jpg"
        jobs.append(("writing_tasks", str(sid), url, f"dataset/writing/tests/migrated/{sid}.{ext}",
                     "image/png" if ext == "png" else "image/jpeg", True))
    cur.execute("SELECT id, image_key FROM public.question_groups WHERE image_key ILIKE '%prep%'")
    for gid, url in cur.fetchall():
        ext = "jpg" if ".jpg" in url.lower() or ".jpeg" in url.lower() else "png"
        jobs.append(("question_groups", str(gid), url, f"images/question_groups/diagram_{str(gid)[:8]}.{ext}",
                     "image/jpeg" if ext == "jpg" else "image/png", False))
    conn.close()

    manifest: dict[str, dict[str, str]] = {"lr_sections": {}, "speaking_questions": {}, "writing_tasks": {}, "question_groups": {}}
    for gid, svg_bytes in build_all_listening_map_svgs().items():
        r2_key = f"images/question_groups/listening_map_{gid[:8]}.svg"
        s3.put_object(Bucket=bucket, Key=r2_key, Body=svg_bytes, ContentType="image/svg+xml")
        manifest["question_groups"][gid] = _public_url(r2_key)
    print(f"Uploaded 4 clean SVG maps to R2.", flush=True)

    existing = _list_existing_keys(s3, bucket, ("audio/", "images/", "dataset/writing/tests/migrated/"))
    print(f"Existing R2 keys cached: {len(existing)} | mirroring {len(jobs)} jobs...", flush=True)
    errors: list[str] = []
    done = 0
    with ThreadPoolExecutor(max_workers=24) as pool:
        futs = [pool.submit(_mirror_one, j, existing) for j in jobs]
        for fut in as_completed(futs):
            try:
                tbl, rid, db_val = fut.result()
                manifest[tbl][rid] = db_val
                done += 1
                if done % 200 == 0 or done == len(jobs):
                    print(f"  progress: {done}/{len(jobs)}", flush=True)
            except Exception as exc:
                errors.append(str(exc))

    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Manifest saved ({done} ok, {len(errors)} err).", flush=True)
    if errors:
        for e in errors[:10]:
            print("ERROR:", e, flush=True)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
