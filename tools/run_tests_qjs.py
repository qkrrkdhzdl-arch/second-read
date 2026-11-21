#!/usr/bin/env python3
"""Run docs/tests.js without a browser, in an embedded JS engine (QuickJS).

    python3 tools/run_tests_qjs.py

This is the fast loop while the browser runner in tools/run_tests.py needs a
Chromium with its system libraries. The files under docs/lib are plain ES
modules, so this flattens the import/export lines and evaluates them in
dependency order. If the page and this runner ever disagree, the browser run
wins — the shipped proof is the browser one.
"""
import json
import sys
from pathlib import Path

import quickjs

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

ORDER = ["lib/text.js", "lib/rules.js", "lib/link.js", "lib/analyze.js", "tests.js"]


def flatten(path: Path) -> str:
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("import ") or stripped.startswith("} from "):
            continue
        if stripped.startswith("export default "):
            out.append(line.replace("export default ", "", 1))
            continue
        if stripped.startswith("export "):
            out.append(line.replace("export ", "", 1))
            continue
        out.append(line)
    return "\n".join(out)


def main() -> int:
    src = "\n\n".join(flatten(DOCS / p) for p in ORDER)
    src += "\n\nrunTests().then((r) => { globalThis.__RJSON = JSON.stringify(r); });"

    ctx = quickjs.Context()
    ctx.eval(src)
    for _ in range(50):
        ctx.execute_pending_job()
        if ctx.get("__RJSON") is not None:
            break
    raw = ctx.get("__RJSON")
    if raw is None:
        print("no results — the suite did not finish")
        return 2

    results = json.loads(raw)
    n = len(results)
    fails = 0
    for r in results:
        ok = bool(r.get("pass"))
        if not ok:
            fails += 1
        line = f"[{'PASS' if ok else 'FAIL'}] {r['name']}"
        if not ok and r.get("detail"):
            line += f"  — {r['detail']}"
        print(line)
    print(f"\n{n - fails}/{n} passed")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
