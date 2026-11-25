"""Build site/data/courses.json from a local WikiSyllabus clone.

Usage: python3 scripts/build_index.py <path-to-WikiSyllabus> [commit-sha]
"""
import json, re, sys, pathlib

root = pathlib.Path(sys.argv[1])
sha = sys.argv[2] if len(sys.argv) > 2 else "main"
out = pathlib.Path(__file__).resolve().parent.parent / "site" / "data" / "courses.json"

def pretty(slug):
    small = {"and", "of", "for", "in", "the"}
    acronyms = {"mca", "bsc", "btech", "msc", "ma", "cse", "ai", "it", "iisc", "m", "tech"}
    words = slug.replace("-", " ").split()
    res = []
    for i, w in enumerate(words):
        if w in acronyms and len(w) <= 5 and w not in {"tech"}:
            res.append(w.upper())
        elif i and w in small:
            res.append(w)
        else:
            res.append(w.capitalize())
    s = " ".join(res)
    return s.replace("A P J", "A.P.J.")

def frontmatter(text):
    m = re.match(r"^\s*---\s*\n(.*?)\n---", text, re.S)
    fm = {}
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                fm[k.strip()] = v.strip().strip('"').strip("'")
    return fm, (text[m.end():] if m else text)

unis = {}
count = 0
for p in sorted(root.glob("universities/*/*/*/*/*.md")):
    rel = p.relative_to(root).parts  # universities, uni, branch, scheme, sem, file
    if "pyq" in rel:
        continue
    _, uni, branch, scheme, sem, fname = rel
    text = p.read_text(encoding="utf-8", errors="replace")
    fm, body = frontmatter(text)
    h1 = re.search(r"^#\s+(.+)$", body, re.M)
    title = h1.group(1).strip() if h1 else pretty(fm.get("course_title", fname[:-3]))
    code = fm.get("course_code", "").upper()
    # Strip a leading "CODE - " from titles so code and title render separately.
    # Some files carry a (sometimes wrong) course code in the H1, e.g. "PCCST603 - Compiler Design".
    title = re.sub(r"^(?=[A-Z0-9 ]*\d)[A-Z0-9 ]{4,16}?\s*[-:–—]\s+", "", title) or title
    modules = [re.sub(r"\s+", " ", m).strip() for m in re.findall(r"^#{2,3}\s+((?:Module|Unit)[^\n]*)$", body, re.M | re.I)][:8]
    semnum = re.sub(r"\D", "", sem)
    u = unis.setdefault(uni, {"name": pretty(uni), "branches": {}})
    b = u["branches"].setdefault(branch, {"name": pretty(branch), "schemes": {}})
    s = b["schemes"].setdefault(scheme, {})
    s.setdefault(sem, {"label": f"Semester {int(semnum)}" if semnum else pretty(sem), "courses": []})["courses"].append({
        "id": fname[:-3], "code": code, "title": title, "modules": modules,
        "path": "/".join(rel),
    })
    count += 1

# Name overrides for the slugs pretty() can't guess.
names = {
    "a-p-j-abdul-kalam-technological-university": "APJ Abdul Kalam Technological University (KTU)",
    "iisc-bengaluru": "IISc Bengaluru",
    "cochin-university-of-science-and-technology": "Cochin University of Science and Technology (CUSAT)",
    "mulearn-foundation": "μLearn Foundation",
}
for k, v in names.items():
    if k in unis:
        unis[k]["name"] = v

data = {"source": "https://github.com/The-Purple-Movement/WikiSyllabus", "sha": sha,
        "count": count, "universities": unis}
out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{count} courses, {len(unis)} universities -> {out} ({out.stat().st_size//1024} KB)")
