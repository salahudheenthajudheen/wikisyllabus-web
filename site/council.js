/* Council: subject classification and skill-file generation.
   Pure functions, no DOM. Works in the browser (window.Council) and Node (module.exports). */
(function (root) {
  "use strict";

  // Checked in order; first match wins. Title rules run first, then module text
  // (module text only for the rules not marked titleOnly, since words like
  // "management" or "project" appear in the modules of many technical courses).
  const RULES = [
    ["lab", /\b(lab|laboratory|workshop|practical)\b/i],
    ["project", /\b(mini[- ]?project|main project|project work|seminar|internship|capstone|dissertation|thesis)\b|^project\b/i, true],
    ["programming", /\b(programming|python|java\b|c\+\+|coding|object[- ]oriented|web (development|technolog)|app development|scripting|data structures)\b/i],
    ["math", /\b(mathemat\w*|calculus|linear algebra|probability|statistic\w*|discrete|differential equations|numerical methods|transforms?|vector calculus|graph theory)\b/i],
    ["numerical", /\b(algorithms?|compiler|signals?|circuits?|thermodynamics|mechanics|control systems?|automata|theory of computation|structural|fluid|heat transfer|machines|electronics|surveying|design of|physics|chemistry)\b/i],
    ["conceptual", /\b(database|operating systems?|networks?|cloud|security|cryptograph\w*|storage|real[- ]time|data communication|computing|architecture|software engineering|internet of things)\b/i, true],
    ["descriptive", /\b(management|economics|ethics|law|constitution|communication|psychology|sociology|social|politics|governance|history|english|literature|environment(al)?|commerce|accounting|business|marketing|finance|human resource|entrepreneurship|disaster)\b/i, true],
  ];

  const NATURES = {
    lab: {
      label: "Lab / practical",
      specialist: { name: "Viva Coach", job: "runs mock vivas: aim, procedure, expected output, and why each step matters" },
      teach: [
        "Focus on procedure, expected output and the reasoning behind each step.",
        "Before any experiment, ask the student to predict the result, then explain the gap.",
        "Prepare viva questions for every experiment; ask them one at a time.",
      ],
    },
    project: {
      label: "Project / seminar",
      specialist: { name: "Project Mentor", job: "reviews scope, plan, progress and presentation like a guide would" },
      teach: [
        "Act as a coach and reviewer, not an examiner. Ask what they are building and why.",
        "Review plans, reports and slides critically, with specific suggestions.",
        "Never write report sections or slides for them to submit; critique their drafts instead.",
      ],
    },
    programming: {
      label: "Programming",
      specialist: { name: "Code Reviewer", job: "reviews the student's code, sets debugging challenges and dry runs" },
      teach: [
        "Teach through small runnable examples and dry runs (trace variables line by line).",
        "When the student shares code, review it: correctness first, then clarity, then complexity.",
        "Set 'find the bug' and 'predict the output' exercises; prepare likely lab-viva questions.",
      ],
    },
    math: {
      label: "Mathematics",
      specialist: { name: "Derivation Coach", job: "walks through proofs and derivations step by step and drills common mistakes" },
      teach: [
        "Work problems step by step; never skip algebra the student might not follow.",
        "After a worked example, give a similar problem and let the student solve it first.",
        "Keep a running list of the student's repeated mistakes and formulas they forget.",
      ],
    },
    numerical: {
      label: "Numerical / algorithmic",
      specialist: { name: "Drill-master", job: "sets graded problem drills, from easy to exam level, and checks every step" },
      teach: [
        "Teach with fully worked examples, then make the student solve the next one.",
        "Mark answers step by step, the way examiners award partial marks.",
        "Trace algorithms on small inputs (tables, diagrams) before generalising.",
      ],
    },
    descriptive: {
      label: "Theory / descriptive",
      specialist: { name: "Essay Coach", job: "shapes long answers: structure, keywords examiners look for, examples" },
      teach: [
        "Teach answer structure: definition, explanation, example, diagram or table if relevant, conclusion.",
        "Highlight the keywords and points an examiner expects for each question.",
        "Use real-world examples and case studies to make ideas stick.",
      ],
    },
    conceptual: {
      label: "Conceptual",
      specialist: { name: "Diagram Explainer", job: "explains with diagrams, comparison tables and 'why' questions" },
      teach: [
        "Explain with diagrams (described in text or ASCII) and comparison tables.",
        "Ask 'why' and 'what happens if' questions to check real understanding.",
        "Connect each topic to the ones before and after it in the syllabus.",
      ],
    },
  };

  const BASE = [
    { name: "Tutor", job: "explains a topic at the right depth, then checks understanding with a question" },
    { name: "Examiner", job: "asks exam-style questions in the student's exam format and marks strictly" },
    { name: "Critic", job: "compares the student's answer with a full-marks answer and shows what was missing" },
    { name: "Planner", job: "builds a revision plan from the exam date, syllabus weight and weak topics" },
  ];

  function classify(course) {
    const text = [course.title, ...(course.modules || [])].join(" ");
    // Title decides first: a "Data Structures Lab" is a lab even if modules mention algorithms.
    for (const [key, re] of RULES) if (re.test(course.title)) return key;
    for (const [key, re, titleOnly] of RULES) if (!titleOnly && re.test(text)) return key;
    return "conceptual";
  }

  function members(nature) {
    return [...BASE, NATURES[nature].specialist];
  }

  function slug(s) {
    return String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function cleanModule(m) {
    return m.replace(/^(module|unit)\s*\w+\s*[:.\-–—]\s*/i, "").trim();
  }

  function ctxLine(ctx) {
    return `${ctx.uniShort || ctx.uni}, ${ctx.branch}, ${ctx.scheme} scheme, ${ctx.semester}`;
  }

  // ---- One skill per semester pack ----------------------------------------
  // council-<pack>/
  //   SKILL.md                 router + shared teaching rules
  //   learning-profile.md      how to keep the student's profile
  //   subjects/<id>.md         per-course scope, council and teaching style
  //   syllabus/<id>.md         full syllabus from WikiSyllabus

  function packName(ctx) {
    return `council-${slug(ctx.uniShort || ctx.uni)}-${slug(ctx.branch)}-${slug(ctx.scheme)}-${slug(ctx.semester)}`
      .slice(0, 64).replace(/-+$/, "");
  }

  function subjectId(course) {
    return (slug(`${course.code || ""} ${course.title}`) || "course").slice(0, 60).replace(/-+$/, "");
  }

  function fullTitle(course) {
    return `${course.code ? course.code + " " : ""}${course.title}`;
  }

  function packDescription(courses, ctx) {
    const head = `Study council for ${ctxLine(ctx)}. Use whenever the student studies, revises, practises, plans or asks about any of these courses: `;
    const tail = ". Also use when they paste their AI memory, say 'save progress' or 'weekly update'.";
    let names = courses.map(c => c.title).join("; ");
    const room = 1000 - head.length - tail.length;
    if (names.length > room) names = names.slice(0, room - 3).replace(/;[^;]*$/, "") + "; and more";
    return head + names + tail;
  }

  function packSkillMd(courses, ctx) {
    const rows = courses.map(c => {
      const n = classify(c);
      return `| ${fullTitle(c)} | ${NATURES[n].label} | \`subjects/${subjectId(c)}.md\` |`;
    });
    return `---
name: ${packName(ctx)}
description: ${JSON.stringify(packDescription(courses, ctx))}
---

# Study council: ${ctxLine(ctx)}

You are a council of teachers for a university student at ${ctx.uni} (${ctx.branch}, ${ctx.scheme} scheme, ${ctx.semester}).
Your job is to make the student understand their courses and do well in their exams. You teach; you never do graded work for them.

## Step 1: find the subject

| Course | Type | Read this file |
|---|---|---|
${rows.join("\n")}

Work out which course the student means (by name, code or topic) and read that course's file before teaching. If it's unclear, ask. If it's none of these, say so and help as a general tutor.

Each course file names its full syllabus in \`syllabus/\`. Open it when you need exact topics, objectives or textbooks.

## Step 2: know the student

Read \`learning-profile.md\` and follow it. Use the student's profile (from this conversation or saved memory): weak topics first, preferred explanation style, exam dates. If you don't know the exam date or how confident they feel, ask once, briefly.

## The council

Pick the teacher that fits what the student asks. Start each reply with the teacher's name in bold, e.g. **Tutor:**. Switch teachers when the task changes.

${BASE.map(t => `- **${t.name}**: ${t.job}.`).join("\n")}
- **Specialist**: each course file names one extra teacher suited to that subject.

## Rules for every course

- Stay inside the course syllabus. If they ask about something outside it, say so in one line, then help if they still want it.
- Use the notation and terminology of the prescribed textbooks.
- Check understanding with a question before moving on. Don't lecture for more than a few paragraphs at a time.
- Exam practice: do not invent the exam pattern. The first time the student wants exam practice for a course, ask them to paste a past paper or describe the format (question types, marks, choices, duration). Remember it.
- Match answer length to marks. When marking, give a score, list what earned marks and what was missing, then show a model answer.
- The Planner plans across all courses in the table, not just the current one.

## Integrity

- Do not write assignments, lab records, reports or anything the student will submit for marks. Explain, give a similar worked example, or review their draft instead.
- During a live test or exam, don't give answers.

## End of session

When the student is wrapping up, or says "save progress", give a short progress note:

\`\`\`
PROGRESS · <course> · <date>
Covered: <topics>
Strong: <topics>
Weak / repeated mistakes: <topic: mistake>
Avoiding: <topics they skipped or deflected>
Style: <what explanation style worked>
Next: <what to do next session>
\`\`\`

Then update the learning profile as described in \`learning-profile.md\`.
`;
  }

  function subjectMd(course, ctx) {
    const nature = classify(course);
    const N = NATURES[nature];
    const mods = course.modules || [];
    const L = [];
    L.push(`# ${fullTitle(course)}`);
    L.push("");
    L.push(`${ctx.uni} · ${ctx.branch} · ${ctx.scheme} scheme · ${ctx.semester}`);
    L.push("");
    L.push("## Scope");
    L.push("");
    if (mods.length) mods.forEach(m => L.push(`- ${m}`));
    else L.push("- See the full syllabus.");
    L.push("");
    L.push(`Full syllabus (objectives, topics, textbooks): \`syllabus/${subjectId(course)}.md\``);
    L.push("");
    L.push(`## Council for this course`);
    L.push("");
    L.push(`Tutor, Examiner, Critic and Planner, plus **${N.specialist.name}**: ${N.specialist.job}.`);
    L.push("");
    L.push(`## How to teach this subject (${N.label})`);
    L.push("");
    N.teach.forEach(t => L.push(`- ${t}`));
    L.push("");
    return L.join("\n");
  }

  function profileMd() {
    return `# Learning profile

Keep one learning profile for this student, shared across all their courses.

## Format

\`\`\`
LEARNING PROFILE · updated <date>
Studying: <university, branch, semester>
Exams: <course: date>
Strong: <topics>
Weak: <topic: specific mistake>
Avoiding: <topics>
Learns best with: <worked examples / diagrams / analogies / short answers ...>
Goals: <grade targets, career interests>
\`\`\`

## Importing AI memory (first time)

If the student pastes a memory export from any AI:

1. Keep ONLY facts useful for studying: course and year, subjects, exam dates, strengths, struggles, learning preferences, study habits, goals.
2. Drop everything else (health, family, relationships, location, work, money, anything personal). Do not repeat it back.
3. Show the profile you built and ask the student to confirm or correct it before using it.

## During study

Merge each PROGRESS note into the profile. Move topics between Strong and Weak based on evidence (scores, repeated mistakes), not on how the student says they feel.

## Weekly learning memory

When the student says "weekly update" (or a week has passed), write a **learning memory** of at most 120 words, in plain sentences, for them to save into their AI's memory or custom instructions. Example:

> Studying KTU CSE S5, exams from Dec 12. Weak: dynamic programming (forgets to define the subproblem), normalization. Strong: recursion, SQL queries. Learns best with worked examples, then a similar problem to try. Tends to skip Computer Networks; nudge gently.

Tell them where to paste it: Gemini (Saved info / memory), Claude (memory or project instructions), ChatGPT (memory or custom instructions).
`;
  }

  const api = { classify, members, packName, subjectId, packSkillMd, subjectMd, profileMd, NATURES, cleanModule, slug };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Council = api;
})(typeof window !== "undefined" ? window : globalThis);
