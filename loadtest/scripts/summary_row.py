#!/usr/bin/env python3
"""
In dòng bảng markdown cho report-template.md từ file `k6 --summary-export`.

    python loadtest/scripts/summary_row.py loadtest/results/s300-wc4.json --vu 300 --wc 4
"""
import argparse
import json


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("summary")
    parser.add_argument("--vu", required=True)
    parser.add_argument("--wc", required=True)
    args = parser.parse_args()
    metrics = json.load(open(args.summary))["metrics"]

    duration, failed = metrics["http_req_duration"], metrics["http_req_failed"]
    checks = metrics.get("dataloss_checks", {}).get("count", 0)
    lost = metrics.get("dataloss_failures", {}).get("count", 0)
    # --summary-export của k6 mới: giá trị nằm thẳng trong metric ("p(95)"); bản cũ lồng trong "values"
    get = lambda m, k: m.get("values", m).get(k, float("nan"))
    p95 = get(duration, "p(95)")
    error_pct = get(failed, "value") * 100
    ok = p95 < 1000 and error_pct < 1 and lost == 0
    print(f"| {args.vu} | {args.wc} | {get(duration, 'med'):.0f} | {p95:.0f} | {get(duration, 'p(99)'):.0f} | "
          f"{get(metrics['http_reqs'], 'rate'):.1f} | {error_pct:.2f} | {lost}/{checks} | {'có' if ok else 'KHÔNG'} |")


if __name__ == "__main__":
    main()
