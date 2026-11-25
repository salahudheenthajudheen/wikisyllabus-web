(async function () {
  "use strict";
  const C = window.Council;
  const $ = (id) => document.getElementById(id);
  const RAW = "https://raw.githubusercontent.com/The-Purple-Movement/WikiSyllabus";

  let data;
  try {
    data = await (await fetch("data/courses.json")).json();
  } catch (e) {
    $("courses").innerHTML = '<li class="empty">Couldn\'t load the course list. Serve this folder over http (see README).</li>';
    return;
  }
  const U = data.universities;

  // ---------- hero stats ----------
  document.querySelectorAll('[data-stat="courses"]').forEach(n => (n.textContent = data.count.toLocaleString("en-US")));
  document.querySelectorAll('[data-stat="unis"]').forEach(n => (n.textContent = Object.keys(U).length));

  // ---------- teacher tabs ----------
  const TABS = [
    ["Tutor", "Explains at the depth your exam needs, in the style that works for you, then asks you a question to check you really got it. It knows which topics you've struggled with before and starts there."],
    ["Examiner", "Sets questions in your university's format: short answers, long answers, choices per module. The first time, it asks you to paste a past paper so it never guesses the pattern."],
    ["Critic", "Paste your answer and get a score, what earned marks, what was missing, and a model answer. It's how toppers learn to write, not just what to write."],
    ["Planner", "Works back from your exam date across all your subjects, puts weak topics first, and adjusts every time you save progress."],
    ["Specialist", "Each subject adds one teacher based on what kind of subject it is: a Code Reviewer for programming, a Drill-master for algorithms and numericals, a Derivation Coach for maths, a Viva Coach for labs, an Essay Coach for theory papers."],
  ];
  const topics = [];
  for (const u of Object.values(U)) for (const b of Object.values(u.branches)) for (const s of Object.values(b.schemes))
    for (const sem of Object.values(s)) for (const c of sem.courses) {
      for (const m of c.modules) { const t = C.cleanModule(m); if (t && t.length < 48 && !/^(module|unit|\(|[ivx\d]+\b)/i.test(t)) topics.push(t); }
    }
  const pick = [];
  for (let i = 0; i < 90 && topics.length; i++) pick.push(topics[Math.floor(Math.random() * topics.length)]);
  const wallHtml = pick.map(t => `<span>${esc(t)}</span>`).join("");
  $("wall").innerHTML = wallHtml + wallHtml; // doubled for a seamless loop
  function setTab(i) {
    document.querySelectorAll(".tab").forEach((t, j) => { t.classList.toggle("on", i === j); t.setAttribute("aria-selected", i === j); });
    $("wallLabel").textContent = TABS[i][0];
    $("tabCopy").textContent = TABS[i][1];
  }
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => setTab(+t.dataset.tab)));
  setTab(0);

  // ---------- finder ----------
  const sel = { uni: $("selUni"), branch: $("selBranch"), scheme: $("selScheme"), sem: $("selSem") };
  const chosen = new Set(); // course paths
  let ai = "gemini";

  function fill(select, entries, preferred) {
    select.innerHTML = entries.map(([v, label]) => `<option value="${esc(v)}">${esc(label)}</option>`).join("");
    if (preferred && entries.some(([v]) => v === preferred)) select.value = preferred;
  }
  const semNum = (k) => parseInt(String(k).replace(/\D/g, ""), 10) || 0;

  function onUni(pref) {
    const u = U[sel.uni.value];
    fill(sel.branch, Object.entries(u.branches).map(([k, b]) => [k, b.name]).sort((a, b) => a[1].localeCompare(b[1])), pref);
    onBranch();
  }
  function onBranch(pref) {
    const b = U[sel.uni.value].branches[sel.branch.value];
    fill(sel.scheme, Object.keys(b.schemes).sort().reverse().map(k => [k, k]), pref);
    onScheme();
  }
  function onScheme(pref) {
    const s = U[sel.uni.value].branches[sel.branch.value].schemes[sel.scheme.value];
    fill(sel.sem, Object.entries(s).sort((a, b) => semNum(a[0]) - semNum(b[0])).map(([k, v]) => [k, v.label]), pref);
    onSem();
  }
  function onSem() {
    chosen.clear();
    renderCourses();
  }
  sel.uni.addEventListener("change", () => onUni());
  sel.branch.addEventListener("change", () => onBranch());
  sel.scheme.addEventListener("change", () => onScheme());
  sel.sem.addEventListener("change", onSem);

  function ctx() {
    const u = U[sel.uni.value], b = u.branches[sel.branch.value];
    const semObj = b.schemes[sel.scheme.value][sel.sem.value];
    const short = (u.name.match(/\(([^)]+)\)$/) || [])[1];
    return { uni: u.name, uniShort: short, branch: b.name, scheme: sel.scheme.value, semester: semObj.label };
  }
  function currentCourses() {
    const s = U[sel.uni.value].branches[sel.branch.value].schemes[sel.scheme.value][sel.sem.value];
    return [...s.courses].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }

  function renderCourses() {
    const list = currentCourses();
    $("courseCount").textContent = `${list.length} subject${list.length === 1 ? "" : "s"}`;
    if (!list.length) { $("courses").innerHTML = '<li class="empty">No subjects here yet.</li>'; return update(); }
    $("courses").innerHTML = list.map((c, i) => {
      const nature = C.classify(c);
      const team = C.members(nature).map(m => `<span>${esc(m.name)}</span>`).join("");
      const mods = c.modules.length ? `<ul>${c.modules.map(m => `<li>${esc(m)}</li>`).join("")}</ul>` : "<p>Module list not available; the full syllabus is included in the pack.</p>";
      return `<li class="course${chosen.has(c.path) ? " sel" : ""}" data-i="${i}">
        <div class="course-row">
          <input type="checkbox" aria-label="Include ${esc(c.title)}" ${chosen.has(c.path) ? "checked" : ""}>
          <div><span class="c-code">${esc(c.code)}</span><span class="c-title">${esc(c.title)}</span></div>
          <div style="display:flex;align-items:center;gap:8px"><span class="c-badge">${esc(C.NATURES[nature].label)}</span>
          <button class="expand" type="button" aria-label="Show council for ${esc(c.title)}" aria-expanded="false">⌄</button></div>
        </div>
        <div class="course-more">
          <div class="members">${team}</div>
          <p class="why">${esc(C.NATURES[nature].specialist.name)} added because this reads as a ${esc(C.NATURES[nature].label.toLowerCase())} subject.</p>
          ${mods}
          <div class="actions">
            <button class="link-btn" data-act="preview" type="button">Read what the teachers are told</button>
            <a class="link-btn" href="https://github.com/The-Purple-Movement/WikiSyllabus/blob/main/${encodeURI(c.path)}" target="_blank" rel="noopener">Syllabus source</a>
          </div>
        </div>
      </li>`;
    }).join("");
    update();
  }

  $("courses").addEventListener("click", (e) => {
    const li = e.target.closest(".course"); if (!li) return;
    const c = currentCourses()[+li.dataset.i];
    if (e.target.closest(".expand")) {
      const open = li.classList.toggle("open");
      e.target.closest(".expand").setAttribute("aria-expanded", open);
      return;
    }
    if (e.target.closest('[data-act="preview"]')) {
      $("previewTitle").textContent = `subjects/${C.subjectId(c)}.md`;
      $("previewBody").textContent = C.subjectMd(c, ctx());
      $("preview").showModal();
      return;
    }
    if (e.target.closest(".course-more") || e.target.closest("a")) return;
    if (chosen.has(c.path)) chosen.delete(c.path); else chosen.add(c.path);
    li.classList.toggle("sel", chosen.has(c.path));
    li.querySelector("input").checked = chosen.has(c.path);
    update();
  });
  $("previewClose").addEventListener("click", () => $("preview").close());
  $("preview").addEventListener("click", (e) => { if (e.target === $("preview")) $("preview").close(); });

  $("toggleAll").addEventListener("click", () => {
    const list = currentCourses();
    const all = list.every(c => chosen.has(c.path));
    list.forEach(c => (all ? chosen.delete(c.path) : chosen.add(c.path)));
    renderCourses();
  });

  document.querySelectorAll(".seg-btn").forEach(b => b.addEventListener("click", () => {
    ai = b.dataset.ai;
    document.querySelectorAll(".seg-btn").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", x === b); });
    update();
  }));

  const AI_NOTE = {
    gemini: "Import on Gemini web or the Mac app. Free for personal accounts.",
    claude: "Upload under Settings → Capabilities → Skills.",
    chatgpt: "Skills work on Business, Enterprise and Edu. On Free, use a Project instead (steps shown after download).",
  };
  function update() {
    const n = chosen.size;
    $("download").disabled = n === 0;
    $("download").textContent = n ? `Get my council · ${n} subject${n === 1 ? "" : "s"}` : "Get my council";
    $("toggleAll").textContent = currentCourses().length && currentCourses().every(c => chosen.has(c.path)) ? "Clear" : "Select all";
    $("dlNote").textContent = n ? `${AI_NOTE[ai]} You'll get one skill with all your subjects. Upload it once.` : "Select the subjects you're taking this semester.";
  }

  // ---------- download ----------
  $("download").addEventListener("click", async () => {
    const btn = $("download");
    const courses = currentCourses().filter(c => chosen.has(c.path));
    const cx = ctx();
    btn.disabled = true; btn.textContent = "Building your pack…";
    try {
      const name = C.packName(cx);
      const zip = new JSZip();
      const root = zip.folder(name); // the zip holds one skill folder: SKILL.md at its top
      root.file("SKILL.md", C.packSkillMd(courses, cx));
      root.file("learning-profile.md", C.profileMd());
      let missing = 0;
      await Promise.all(courses.map(async (c) => {
        let syllabus;
        try {
          const r = await fetch(`${RAW}/${data.sha}/${c.path}`);
          if (!r.ok) throw new Error(r.status);
          syllabus = await r.text();
        } catch (_) {
          missing++;
          syllabus = `# ${c.code} ${c.title}\n\n(Couldn't download the full syllabus. Module list:)\n\n${c.modules.map(m => "- " + m).join("\n")}\n`;
        }
        const header = `<!-- Source: https://github.com/The-Purple-Movement/WikiSyllabus/blob/${data.sha}/${c.path} (MIT licence) -->\n\n`;
        root.file(`subjects/${C.subjectId(c)}.md`, C.subjectMd(c, cx));
        root.file(`syllabus/${C.subjectId(c)}.md`, header + syllabus);
      }));
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      showDone(name, courses, missing);
    } catch (e) {
      $("dlNote").textContent = "Something went wrong building the pack. Try again.";
      console.error(e);
    } finally {
      btn.disabled = chosen.size === 0;
      btn.textContent = `Get my council · ${chosen.size} subject${chosen.size === 1 ? "" : "s"}`;
    }
  });

  const INSTALL = {
    gemini: "Gemini (web or Mac app) → Skills → import this zip.",
    claude: "Claude → Settings → Capabilities → Skills → Upload skill → choose this zip.",
    chatgpt: "Business / Edu: upload this zip as a skill. Free plan: unzip it, create a Project, paste SKILL.md into the Project instructions and add the other files as Project files.",
  };
  function showDone(name, courses, missing) {
    const tree = [
      `${name}.zip  ← upload this one file`,
      `└─ ${name}/`,
      "   ├─ SKILL.md",
      "   ├─ learning-profile.md",
      `   ├─ subjects/   ${courses.length} file${courses.length === 1 ? "" : "s"}`,
      `   └─ syllabus/   ${courses.length} file${courses.length === 1 ? "" : "s"}`,
    ].join("\n");
    $("dlNote").innerHTML =
      `<div class="done"><b>Saved ${esc(name)}.zip to your Downloads folder.</b> Don't unzip it.` +
      `<pre>${esc(tree)}</pre>` +
      `<span>${esc(INSTALL[ai])}</span>` +
      (missing ? `<span class="warn">${missing} syllabus file${missing === 1 ? "" : "s"} couldn't be fetched, so those subjects use the module list only.</span>` : "") +
      `</div>`;
  }

  // ---------- defaults: KTU CSE latest scheme S5 ----------
  fill(sel.uni, Object.entries(U).map(([k, u]) => [k, u.name]).sort((a, b) => a[1].localeCompare(b[1])), "a-p-j-abdul-kalam-technological-university");
  onUni("computer-science");
  if (sel.sem.querySelector('option[value="s05"]')) { sel.sem.value = "s05"; onSem(); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }
})();
