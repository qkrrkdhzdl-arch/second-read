#!/usr/bin/env python3
"""Run docs/tests.js in a real Chromium and fail if anything fails.

    python3 tools/run_tests.py

Serves docs/ over HTTP (ES modules do not load from file://), opens
tests.html, waits for window.__RESULTS__, and prints the same list the
page shows.
"""
import http.server
import functools
import socket
import threading
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main() -> int:
    port = free_port()
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(DOCS))
    handler.log_message = lambda *a, **k: None
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    network = []
    failures = 0
    total = 0
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.on("request", lambda req: network.append(req.url))
            page.goto(f"http://127.0.0.1:{port}/tests.html", wait_until="load")
            page.wait_for_function("Array.isArray(window.__RESULTS__)", timeout=20000)
            results = page.evaluate("window.__RESULTS__")
            browser.close()
    finally:
        server.shutdown()

    for r in results:
        total += 1
        if not r.get("pass"):
            failures += 1
        mark = "PASS" if r.get("pass") else "FAIL"
        line = f"[{mark}] {r['name']}"
        if not r.get("pass") and r.get("detail"):
            line += f"  — {r['detail']}"
        print(line)
    print(f"\n{total - failures}/{total} passed")
    outside = [u for u in network if not u.startswith(f"http://127.0.0.1:{port}/")]
    print(f"requests to anything outside the page: {len(outside)}" + (f" {outside}" if outside else ""))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
