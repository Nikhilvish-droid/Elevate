const PISTON_URL =
  process.env.PISTON_URL || "https://emkc.org/api/v2/piston/execute";

const LANG_MAP = {
  javascript: { language: "javascript", version: "18.15.0" },
  js: { language: "javascript", version: "18.15.0" },
  python: { language: "python", version: "3.10.0" },
  python3: { language: "python", version: "3.10.0" },
  java: { language: "java", version: "15.0.2" },
  cpp: { language: "c++", version: "10.2.0" },
  "c++": { language: "c++", version: "10.2.0" },
  c: { language: "c", version: "10.2.0" },
  sql: { language: "sqlite3", version: "3.36.0" },
  sqlite: { language: "sqlite3", version: "3.36.0" },
};

function normalizeStdout(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim();
}

async function runPiston({ language, source, stdin }) {
  const mapped = LANG_MAP[String(language || "javascript").toLowerCase()] || {
    language: String(language || "javascript").toLowerCase(),
    version: "*",
  };

  const res = await fetch(PISTON_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: mapped.language,
      version: mapped.version,
      files: [{ content: source || "" }],
      stdin: stdin == null ? "" : String(stdin),
      run_timeout: 5000,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || "Code execution failed.");
  }

  const run = body.run || {};
  return {
    stdout: normalizeStdout(run.stdout),
    stderr: String(run.stderr || ""),
    code: run.code,
    runtime_ms: Math.round(Number(run.cpu_time || run.wall_time || 0) * 1000) || null,
  };
}

function mcqToken(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  if (/^[A-Za-z]$/.test(s)) return s.toUpperCase();
  const letter = s.match(/^([A-Za-z])[).:\s-]/);
  if (letter) return letter[1].toUpperCase();
  return s.replace(/\s+/g, " ").toLowerCase();
}

function optionEntries(question) {
  const opts = Array.isArray(question.options) ? question.options : [];
  return opts.map((o, i) => {
    const label =
      typeof o === "string" ? o : String(o?.label || o?.text || o?.key || "");
    const fromObj = typeof o === "object" && o?.key ? String(o.key).trim() : "";
    const fromLabel = label.match(/^([A-Za-z])[).:\s-]/)?.[1] || "";
    const key = (fromObj || fromLabel || String.fromCharCode(65 + i)).toUpperCase();
    return { key, label: label.trim() };
  });
}

function scoreMcq(question, answerText) {
  const given = String(answerText || "").trim();
  const correct = String(question.correct_option || "").trim();
  if (!given || !correct) {
    return { is_correct: false, points_awarded: 0, runtime_ms: null };
  }

  const givenTok = mcqToken(given);
  const correctTok = mcqToken(correct);
  let ok =
    givenTok === correctTok || given.toLowerCase() === correct.toLowerCase();

  if (!ok) {
    const opts = optionEntries(question);
    const correctKey =
      correctTok.length === 1
        ? correctTok
        : opts.find((o) => o.label.toLowerCase() === correct.toLowerCase())?.key;
    const givenKey =
      givenTok.length === 1
        ? givenTok
        : opts.find((o) => o.label.toLowerCase() === given.toLowerCase())?.key;
    ok = Boolean(correctKey && givenKey && correctKey === givenKey);
  }

  return {
    is_correct: ok,
    points_awarded: ok ? Number(question.points) || 0 : 0,
    runtime_ms: null,
  };
}

async function scoreCodeQuestion(question, answerText) {
  const cases = (Array.isArray(question.test_cases) ? question.test_cases : []).slice(
    0,
    8,
  );
  if (!cases.length) {
    return {
      is_correct: false,
      points_awarded: 0,
      runtime_ms: null,
    };
  }

  let passed = 0;
  let totalRuntime = 0;
  for (const tc of cases) {
    try {
      const result = await runPiston({
        language: question.language || "javascript",
        source: answerText,
        stdin: tc.stdin ?? tc.input ?? "",
      });
      if (result.runtime_ms) totalRuntime += result.runtime_ms;
      const expected = normalizeStdout(tc.stdout ?? tc.expected ?? tc.output ?? "");
      if (result.stdout === expected) passed += 1;
    } catch {
      // count as fail
    }
  }

  const ratio = passed / cases.length;
  const points = Math.round((Number(question.points) || 0) * ratio * 100) / 100;
  return {
    is_correct: passed === cases.length,
    points_awarded: points,
    runtime_ms: totalRuntime || null,
  };
}

async function scoreQuestion(question, answerText) {
  const type = String(question.question_type || "").toLowerCase();
  if (type === "mcq") return scoreMcq(question, answerText);
  return scoreCodeQuestion(question, answerText);
}

async function gradeAttempt(questions, answersByQuestionId) {
  let score = 0;
  let maxScore = 0;
  const graded = [];

  for (const q of questions) {
    maxScore += Number(q.points) || 0;
    const answerText = answersByQuestionId.get(Number(q.id)) ?? "";
    const result = await scoreQuestion(q, answerText);
    score += result.points_awarded;
    graded.push({
      question_id: q.id,
      answer_text: answerText,
      ...result,
    });
  }

  const percent =
    maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;

  return { score: percent, max_score: maxScore, raw_score: score, graded };
}

module.exports = {
  runPiston,
  scoreQuestion,
  gradeAttempt,
  normalizeStdout,
};
