#!/usr/bin/env python3
"""Validate the generated static site before deployment."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
import json, re, struct, sys, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
POSTS = ROOT / "src" / "content" / "posts"
errors = []
expected_post_count = sum(
    1 for post in POSTS.glob("*.mdx")
    if not re.search(r"(?m)^draft:\s*true\s*$", post.read_text(encoding="utf-8").split("---", 2)[1])
)
redirects = (DIST / "_redirects").read_text(encoding="utf-8") if (DIST / "_redirects").exists() else ""
for required in (
    "/tags/* /categories/ 301", "/posts/page/* /posts/ 301",
    "/about/ /company/ 301", "/editorial-process/ /method/ 301",
    "/editorial-standards/ /standards/ 301",
    "/posts/automation-error-log-template-no-code-ops-2026/ /category/automation/ 301",
    "/posts/privacy-first-task-automation-stack/ /category/automation/ 301",
):
    if required not in redirects:
        errors.append(f"missing redirect rule: {required}")

class Links(HTMLParser):
    def __init__(self): super().__init__(); self.items = []
    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        for key in ("href", "src"):
            if key in data: self.items.append((tag, key, data[key]))

def target_for(url_path: str) -> Path:
    path = url_path.split("?", 1)[0].split("#", 1)[0]
    if path.endswith("/"): return DIST / path.lstrip("/") / "index.html"
    out = DIST / path.lstrip("/")
    if out.suffix: return out
    return out / "index.html"

html_files = list(DIST.rglob("*.html"))
if not html_files: errors.append("dist contains no HTML")
for html in html_files:
    text = html.read_text(encoding="utf-8")
    parser = Links(); parser.feed(text)
    page_url = "/" + html.relative_to(DIST).as_posix().replace("index.html", "")
    for tag, key, value in parser.items:
        if not value or value.startswith(("http://", "https://", "mailto:", "tel:", "data:", "#", "javascript:")): continue
        resolved = urlparse(urljoin("https://toolspilot.org" + page_url, value)).path
        target = target_for(resolved)
        if not target.exists(): errors.append(f"broken local {key}: {html.relative_to(DIST)} -> {value}")
    if html.relative_to(DIST).as_posix() == "compare/index.html" and 'name="robots" content="noindex' not in text:
        errors.append("compare page must remain noindex")

for forbidden in (DIST / "tags", DIST / "posts" / "page"):
    if forbidden.exists() and any(forbidden.rglob("*.html")): errors.append(f"thin archive emitted: {forbidden.relative_to(DIST)}")

sitemap = DIST / "sitemap-0.xml"
if not sitemap.exists(): errors.append("sitemap-0.xml missing")
else:
    xml = sitemap.read_text(encoding="utf-8")
    urls = re.findall(r"<loc>(.*?)</loc>", xml)
    bad = [u for u in urls if any(x in u for x in ("/tags/", "/posts/page/", "/compare/"))]
    if bad: errors.append("forbidden sitemap URLs: " + ", ".join(bad[:5]))
    post_urls = [u for u in urls if "/posts/" in u and not u.rstrip("/").endswith("/posts")]
    if len(post_urls) != expected_post_count: errors.append(f"sitemap has {len(post_urls)} article URLs, expected {expected_post_count}")

# New QA-approved assets: valid PNG headers, expected dimensions, non-trivial size.
for image in sorted((DIST / "images" / "illustrations").glob("tp-guide-*-20260801.png")):
    data = image.read_bytes()
    if len(data) < 100_000 or data[:8] != b"\x89PNG\r\n\x1a\n": errors.append(f"invalid/undersized image: {image.name}"); continue
    width, height = struct.unpack(">II", data[16:24])
    if (width, height) != (1280, 720): errors.append(f"unexpected dimensions {image.name}: {width}x{height}")
if len(list((DIST / "images" / "illustrations").glob("tp-guide-*-20260801.png"))) != 4:
    errors.append("expected four regenerated editorial images")

report = {"status": "PASS" if not errors else "FAIL", "html_pages": len(html_files), "errors": sorted(set(errors))}
print(json.dumps(report, indent=2))
sys.exit(1 if errors else 0)
