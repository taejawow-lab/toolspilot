#!/usr/bin/env python3
"""Fail-closed quality gate for the public ToolsPilot review corpus."""
from collections import defaultdict
from pathlib import Path
import json, re, sys

ROOT = Path(__file__).resolve().parents[1]
POSTS = ROOT / "src/content/posts"
EXPECTED_PUBLIC = {
    "github-dependency-review-pull-request-policy-lockfile-license-checklist-2026",
    "saas-backup-restore-drill-rto-rpo-evidence-checklist-2026",
    "github-actions-pull-request-target-fork-security-checklist-2026",
    "npm-install-script-approval-ignore-scripts-allowscripts-ci-checklist-2026",
    "npm-trusted-publishing-oidc-migration-checklist-2026",
    "ai-coding-agent-repository-safety-checklist-2026",
    "ai-browser-agent-permission-checklist-2026", "ai-connector-permission-audit-2026",
    "ai-file-sharing-permission-audit-2026", "ai-meeting-bot-recording-consent-privacy-checklist-2026",
    "ai-meeting-notes-privacy-workflow",
    "client-browser-isolation-setup-2026", "deep-work-90-minutes",
    "local-ai-workstation-privacy-workflow-2026", "mechanical-keyboard-vs-membrane-data",
    "note-taking-systems-compared", "passkey-password-manager-setup-2026",
    "passkey-recovery-shared-team-accounts-checklist-2026", "pomodoro-vs-time-blocking-research",
    "saas-admin-offboarding-access-checklist-2026",
    "github-actions-artifact-attestation-verification-checklist-2026",
    "scim-deprovisioning-exception-review-checklist-2026", "shared-inbox-phishing-triage-checklist-2026",
    "task-management-apps-compared", "workspace-admin-offboarding-app-permission-checklist-2026",
}
MIN_WORDS, MIN_SOURCES, MIN_VISUALS = 700, 8, 5
BANNED = re.compile(r"(?i)adsense|search engines?|trust signals?|publishing workflow|before publishing|readiness (?:note|pass|improvement)|ad-ready|seo filler|image[- ]qa|generated[- ]image|front-end confirmation|ai detector threshold|automatic rewriting")
UNSUPPORTED = re.compile(r"(?i)we (?:bought|tested|measured|migrated|ran)|after \d+ months? of using|our (?:lab|test bench|hands-on test)")

def split_post(path):
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"): raise ValueError("missing frontmatter")
    return text.split("---", 2)[1:]
def fm_value(fm, key, default=""):
    m = re.search(rf"(?m)^{re.escape(key)}:\s*(.*)$", fm)
    return m.group(1).strip().strip('"').strip("'") if m else default
def body_words(body):
    text = re.sub(r"```.*?```|!\[[^]]*\]\([^)]*\)|<[^>]+>|[#*_>|~-]", " ", body, flags=re.S)
    return len(re.findall(r"[A-Za-z0-9][A-Za-z0-9’'\-]*", text))
def visual_count(fm, body):
    paths = set(re.findall(r"!\[[^]]*\]\((/images/[^)]+)\)", body))
    paths.update(re.findall(r"<img\b[^>]*\bsrc=[\"'](/images/[^\"']+)", body, re.I))
    hero = fm_value(fm, "heroImage")
    if hero and (ROOT / "public" / hero.lstrip("/")).exists():
        paths.add(hero)
    return len(paths)

errors, rows, public = [], [], set()
post_links_by_file = {}
paragraphs = defaultdict(list)
for path in sorted(POSTS.glob("*.mdx")):
    try: fm, body = split_post(path)
    except Exception as exc:
        errors.append(f"{path.name}: {exc}"); continue
    if fm_value(fm, "draft", "false").lower() == "true": continue
    public.add(path.stem)
    words = body_words(body)
    sources = len(re.findall(r"(?m)^\s+url:\s*[\"']?https?://", fm))
    visuals = visual_count(fm, body)
    declared_words = int(fm_value(fm, "wordCount", "0"))
    declared_visuals = int(fm_value(fm, "visualsCount", "0"))
    post_links = set(re.findall(r"(?m)^\s+-\s+[\"'](/posts/[^\"']+)[\"']\s*$", fm))
    post_links_by_file[path.name] = post_links
    rows.append({"slug": path.stem, "words": words, "sources": sources, "visuals": visuals})
    if words < MIN_WORDS: errors.append(f"{path.name}: {words} words < {MIN_WORDS}")
    if declared_words != words: errors.append(f"{path.name}: wordCount {declared_words} != {words} rendered words")
    if sources < MIN_SOURCES: errors.append(f"{path.name}: {sources} sources < {MIN_SOURCES}")
    if visuals < MIN_VISUALS: errors.append(f"{path.name}: {visuals} visuals < {MIN_VISUALS}")
    if declared_visuals != visuals: errors.append(f"{path.name}: visualsCount {declared_visuals} != {visuals} unique rendered visuals")
    reader_text = fm + "\n" + body
    if BANNED.search(reader_text): errors.append(f"{path.name}: reader-visible production/process language")
    if UNSUPPORTED.search(reader_text): errors.append(f"{path.name}: unsupported first-person testing/ownership claim")
    hero = fm_value(fm, "heroImage")
    if not hero.startswith("/") or not (ROOT / "public" / hero.lstrip("/")).is_file(): errors.append(f"{path.name}: missing local hero {hero!r}")
    for block in re.split(r"\n\s*\n", body):
        norm = " ".join(re.sub(r"!\[[^]]*\]\([^)]*\)", " ", block).split())
        if len(norm.split()) >= 18 and not norm.startswith(("#", "|", "- ")): paragraphs[norm].append(path.name)
if public != EXPECTED_PUBLIC:
    errors.append("public allowlist mismatch: " + json.dumps({"missing": sorted(EXPECTED_PUBLIC-public), "unexpected": sorted(public-EXPECTED_PUBLIC)}))
for filename, links in post_links_by_file.items():
    if len(links) < 2: errors.append(f"{filename}: {len(links)} public-post internal links < 2")
    for link in links:
        target = link.removeprefix("/posts/").rstrip("/")
        if target not in EXPECTED_PUBLIC: errors.append(f"{filename}: internal link targets non-public post {link}")
for paragraph, files in paragraphs.items():
    if len(files) > 1: errors.append(f"repeated paragraph in {files}: {paragraph[:120]}")
source_blob = "\n".join(p.read_text(encoding="utf-8") for p in [ROOT/"src/pages/index.astro", ROOT/"src/pages/company.astro", ROOT/"src/pages/method.astro", ROOT/"src/pages/standards.astro", ROOT/"src/layouts/ArticleLayout.astro", ROOT/"src/components/Header.astro", ROOT/"public/_worker.js", ROOT/"public/assets/toolspilot-app.js"])
if "data-newsletter" in source_blob or 'href="#subscribe"' in source_blob or "/api/newsletter" in source_blob: errors.append("newsletter collection UI or endpoint remains on a reader path")
if (ROOT/"public/ads.txt").read_text(encoding="utf-8").strip().splitlines() != ["google.com, pub-3526385510396286, DIRECT, f08c47fec0942fa0"]: errors.append("ads.txt must contain exactly the authorized seller record")
config = (ROOT/"astro.config.mjs").read_text(encoding="utf-8")
for marker in ["path !== '/compare/'", "!path.startsWith('/tags/')", "/posts\\/page"]:
    if marker not in config: errors.append(f"sitemap exclusion missing marker: {marker}")
report = {"status": "FAIL" if errors else "PASS", "public_count": len(public), "expected_public_count": len(EXPECTED_PUBLIC), "rows": sorted(rows, key=lambda r:r["slug"]), "errors": errors}
print(json.dumps(report, indent=2))
sys.exit(1 if errors else 0)
