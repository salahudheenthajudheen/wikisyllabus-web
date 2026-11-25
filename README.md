# WikiSyllabus (web)

The student-facing site for [WikiSyllabus](https://github.com/The-Purple-Movement/WikiSyllabus): a council of AI teachers (tutor, examiner, critic, planner and a subject specialist) for every course in the
library. Students pick their course and download
one skill pack to add to Gemini, Claude or ChatGPT. Everything is built in the browser, with no server.

## Run locally

```sh
cd site && python3 -m http.server 8765
# open http://127.0.0.1:8765
```

(Opening index.html directly from disk won't work: the page fetches data/courses.json.)

## Refresh the course list

```sh
git clone --depth 1 https://github.com/The-Purple-Movement/WikiSyllabus.git /tmp/ws
python3 scripts/build_index.py /tmp/ws "$(git -C /tmp/ws rev-parse HEAD)"
```

The commit SHA is stored in the index, so downloaded packs fetch the exact syllabus version that was indexed.

## Files

- `site/index.html`, `site/style.css`: landing page and course finder
- `site/council.js`: subject classification and SKILL.md generation (pure functions, also runs in Node)
- `site/app.js`: course finder UI and zip download
- `site/data/courses.json`: generated course index
- `scripts/build_index.py`: builds the index from a WikiSyllabus clone

## Deploy

GitHub Pages, via `.github/workflows/deploy.yml`. On every push to `main`, daily at 02:00 IST, and on demand
(Actions → Build and deploy → Run workflow), it clones the latest WikiSyllabus, rebuilds `site/data/courses.json`
and publishes `site/`. One-time setup: Settings → Pages → Source: **GitHub Actions**.
