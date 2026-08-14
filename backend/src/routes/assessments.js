const { asyncHandler, fail, unwrap } = require("../lib/helpers");
const {
  requireRecruiter,
  requireCompanyMember,
} = require("../lib/company");
const { getCandidateId } = require("../lib/users");
const { supabaseAdmin } = require("../supabase");
const { gradeAttempt } = require("../lib/assessmentScoring");
const {
  messageTemplate,
  sendCandidateMessage,
  loadMessageContext,
} = require("../lib/candidateComms");

function assessmentSchemaError(message) {
  const msg = String(message || "");
  if (/job_id|company_id|column .*coding_assessments|schema cache/i.test(msg)) {
    return "coding_assessments is missing job_id / company_id. In Supabase Table Editor add bigint columns job_id and company_id, or run supabase/assessment-jsonb-fallback.sql.";
  }
  if (/questions|pass_score|max_violations|description/i.test(msg)) {
    return "Run supabase/assessment-jsonb-fallback.sql in Supabase (ALTER only — adds questions and related columns).";
  }
  if (/answers_json/i.test(msg)) {
    return "Run supabase/assessment-jsonb-fallback.sql in Supabase first.";
  }
  return msg;
}

function db(req) {
  return supabaseAdmin() || req.supabase;
}

function shuffle(ids) {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function remainingSeconds(attempt, assessment) {
  if (!attempt.started_at) return (assessment.duration_minutes || 60) * 60;
  const elapsed = (Date.now() - new Date(attempt.started_at).getTime()) / 1000;
  const total = (assessment.duration_minutes || 60) * 60;
  return Math.max(0, Math.floor(total - elapsed));
}

function asQuestions(assessment) {
  const raw = assessment?.questions;
  return Array.isArray(raw) ? raw : [];
}

function asAnswersMap(attempt) {
  const raw = attempt?.answers_json;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return { ...raw };
}

function asViolations(attempt) {
  return Array.isArray(attempt?.violations_json) ? attempt.violations_json : [];
}

function publicAssessmentMeta(assessment) {
  if (!assessment || typeof assessment !== "object") return null;
  return {
    id: assessment.id ?? null,
    title: assessment.title || "Assessment",
    description: assessment.description ?? null,
    duration_minutes: assessment.duration_minutes ?? 60,
    max_violations: assessment.max_violations ?? 3,
    pass_score: assessment.pass_score ?? 60,
  };
}

function sanitizeQuestionForCandidate(q) {
  const cases = Array.isArray(q.test_cases) ? q.test_cases : [];
  const visible = cases.filter((tc) => tc && tc.visible);
  return {
    id: q.id,
    question_type: q.question_type,
    prompt: q.prompt,
    options: q.options || [],
    language: q.language,
    points: q.points,
    sort_order: q.sort_order,
    test_cases: visible.map((tc) => ({
      stdin: tc.stdin ?? tc.input ?? "",
      visible: true,
    })),
  };
}

function orderedQuestions(assessment, attempt) {
  const questions = asQuestions(assessment);
  const order = Array.isArray(attempt?.question_order)
    ? attempt.question_order.map(Number)
    : [];
  const byId = new Map(questions.map((q) => [Number(q.id), q]));
  if (order.length > 0) {
    return order.map((qid) => byId.get(qid)).filter(Boolean);
  }
  return [...questions].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
  );
}

function serializeCandidateAttempt(attempt, assessment) {
  const submitted = ["submitted", "auto_submitted"].includes(attempt.status);
  const started = Boolean(attempt.started_at) && attempt.status !== "assigned";
  const answersObj = asAnswersMap(attempt);
  const answers = started
    ? Object.entries(answersObj).map(([question_id, row]) => {
        const answer_text = typeof row === "string" ? row : row?.answer_text || "";
        if (!submitted) {
          return { question_id: Number(question_id), answer_text };
        }
        return {
          question_id: Number(question_id),
          answer_text,
          is_correct: typeof row === "object" ? row?.is_correct ?? null : null,
          points_awarded:
            typeof row === "object" ? row?.points_awarded ?? null : null,
        };
      })
    : [];

  return {
    id: attempt.id,
    assessment_id: attempt.assessment_id,
    application_id: attempt.application_id,
    candidate_id: attempt.candidate_id,
    status: attempt.status,
    started_at: attempt.started_at,
    submitted_at: attempt.submitted_at,
    score: submitted ? attempt.score : null,
    max_score: submitted ? attempt.max_score : null,
    violation_count: attempt.violation_count || 0,
    remaining_seconds: remainingSeconds(attempt, assessment),
    coding_assessments: publicAssessmentMeta(assessment),
    questions: started
      ? orderedQuestions(assessment, attempt).map(sanitizeQuestionForCandidate)
      : [],
    answers,
  };
}

function normalizeOptions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) =>
      typeof o === "string" ? o : String(o?.label || o?.text || o?.key || ""),
    )
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeTestCases(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 8).map((tc) => ({
    stdin: String(tc?.stdin ?? tc?.input ?? ""),
    stdout: String(tc?.stdout ?? tc?.expected ?? tc?.output ?? ""),
    visible: Boolean(tc?.visible),
  }));
}

async function attachJobTitles(client, rows, companyId) {
  const list = Array.isArray(rows) ? rows : [];
  const ids = [
    ...new Set(
      list.map((row) => Number(row.job_id)).filter(Number.isFinite),
    ),
  ];
  if (!ids.length) return list.map((row) => ({ ...row, job_title: null }));

  const { data: jobs } = await client
    .from("jobs")
    .select("id, title")
    .eq("company_id", companyId)
    .in("id", ids);
  const titles = new Map((jobs || []).map((job) => [Number(job.id), job.title]));
  return list.map((row) => ({
    ...row,
    job_title: titles.get(Number(row.job_id)) || null,
  }));
}

async function loadAssessmentOwned(client, assessmentId, companyId) {
  const { data, error } = await client
    .from("coding_assessments")
    .select("*")
    .eq("id", assessmentId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function finalizeAttempt(client, attempt, assessment, auto = false) {
  if (["submitted", "auto_submitted"].includes(attempt.status)) {
    return attempt;
  }

  const questions = asQuestions(assessment);
  const answersObj = asAnswersMap(attempt);
  const map = new Map(
    Object.entries(answersObj).map(([qid, row]) => [
      Number(qid),
      typeof row === "string" ? row : row?.answer_text || "",
    ]),
  );

  const graded = await gradeAttempt(questions, map);
  const nextAnswers = { ...answersObj };
  for (const row of graded.graded) {
    nextAnswers[String(row.question_id)] = {
      answer_text: row.answer_text,
      is_correct: row.is_correct,
      runtime_ms: row.runtime_ms,
      points_awarded: row.points_awarded,
    };
  }

  const patch = {
    status: auto ? "auto_submitted" : "submitted",
    submitted_at: new Date().toISOString(),
    score: graded.score,
    max_score: graded.max_score,
    answers_json: nextAnswers,
  };

  const { data: updated, error } = await client
    .from("assessment_attempts")
    .update(patch)
    .eq("id", attempt.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return updated;
}

function mountCompanyAssessmentRoutes(admin) {
  admin.get(
    "/assessments",
    asyncHandler(async (req, res) => {
      const membership = await requireCompanyMember(req.supabase, req.user.id);
      const jobId = req.query.job_id ? Number(req.query.job_id) : null;
      let query = db(req)
        .from("coding_assessments")
        .select(
          "id, job_id, company_id, title, description, duration_minutes, pass_score, max_violations, created_at",
        )
        .eq("company_id", membership.company_id)
        .order("created_at", { ascending: false });
      if (Number.isFinite(jobId)) query = query.eq("job_id", jobId);
      const { data, error } = await query;
      if (error) return fail(res, 400, assessmentSchemaError(error.message));
      res.json(await attachJobTitles(db(req), data || [], membership.company_id));
    }),
  );

  admin.post(
    "/assessments",
    asyncHandler(async (req, res) => {
      const membership = await requireRecruiter(req.supabase, req.user.id);
      const jobId = Number(req.body?.job_id);
      const title = String(req.body?.title || "").trim();
      if (!Number.isFinite(jobId)) return fail(res, 400, "Pick a job.");
      if (!title) return fail(res, 400, "Title is required.");

      const { data: job } = await db(req)
        .from("jobs")
        .select("id, company_id")
        .eq("id", jobId)
        .eq("company_id", membership.company_id)
        .maybeSingle();
      if (!job) return fail(res, 404, "Job not found.");

      const { data, error } = await db(req)
        .from("coding_assessments")
        .insert({
          job_id: jobId,
          company_id: membership.company_id,
          title,
          description: String(req.body?.description || "").trim() || null,
          duration_minutes: Math.max(5, Number(req.body?.duration_minutes) || 60),
          pass_score: Number(req.body?.pass_score) || 60,
          max_violations: Math.max(1, Number(req.body?.max_violations) || 3),
          questions: [],
          created_by: req.user.id,
        })
        .select("*")
        .single();
      if (error) {
        if (/column .*questions|pass_score|max_violations|description/i.test(error.message || "")) {
          const retry = await db(req)
            .from("coding_assessments")
            .insert({
              job_id: jobId,
              company_id: membership.company_id,
              title,
              duration_minutes: Math.max(5, Number(req.body?.duration_minutes) || 60),
              created_by: req.user.id,
            })
            .select("*")
            .single();
          if (retry.error) {
            return fail(res, 400, assessmentSchemaError(retry.error.message));
          }
          return res.status(201).json({ ...retry.data, questions: [] });
        }
        return fail(res, 400, assessmentSchemaError(error.message));
      }
      res.status(201).json({ ...data, questions: asQuestions(data) });
    }),
  );

  admin.get(
    "/assessments/:id",
    asyncHandler(async (req, res) => {
      const membership = await requireCompanyMember(req.supabase, req.user.id);
      const id = Number(req.params.id);
      const assessment = await loadAssessmentOwned(db(req), id, membership.company_id);
      if (!assessment) return fail(res, 404, "Assessment not found.");
      res.json({ ...assessment, questions: asQuestions(assessment) });
    }),
  );

  admin.patch(
    "/assessments/:id",
    asyncHandler(async (req, res) => {
      const membership = await requireRecruiter(req.supabase, req.user.id);
      const id = Number(req.params.id);
      const assessment = await loadAssessmentOwned(db(req), id, membership.company_id);
      if (!assessment) return fail(res, 404, "Assessment not found.");

      const patch = { updated_at: new Date().toISOString() };
      if (req.body?.title != null) patch.title = String(req.body.title).trim();
      if (req.body?.description !== undefined) {
        patch.description = String(req.body.description || "").trim() || null;
      }
      if (req.body?.duration_minutes != null) {
        patch.duration_minutes = Math.max(5, Number(req.body.duration_minutes) || 60);
      }
      if (req.body?.pass_score != null) patch.pass_score = Number(req.body.pass_score) || 60;
      if (req.body?.max_violations != null) {
        patch.max_violations = Math.max(1, Number(req.body.max_violations) || 3);
      }

      const { data, error } = await db(req)
        .from("coding_assessments")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      res.json({ ...data, questions: asQuestions(data) });
    }),
  );

  admin.delete(
    "/assessments/:id",
    asyncHandler(async (req, res) => {
      const membership = await requireRecruiter(req.supabase, req.user.id);
      const id = Number(req.params.id);
      const assessment = await loadAssessmentOwned(db(req), id, membership.company_id);
      if (!assessment) return fail(res, 404, "Assessment not found.");
      const { error } = await db(req).from("coding_assessments").delete().eq("id", id);
      if (error) throw new Error(error.message);
      res.json({ ok: true });
    }),
  );

  admin.post(
    "/assessments/:id/questions",
    asyncHandler(async (req, res) => {
      const membership = await requireRecruiter(req.supabase, req.user.id);
      const id = Number(req.params.id);
      const assessment = await loadAssessmentOwned(db(req), id, membership.company_id);
      if (!assessment) return fail(res, 404, "Assessment not found.");

      const question_type = String(req.body?.question_type || "mcq").toLowerCase();
      if (!["mcq", "coding", "sql", "debug"].includes(question_type)) {
        return fail(res, 400, "Invalid question type.");
      }
      const prompt = String(req.body?.prompt || "").trim();
      if (!prompt) return fail(res, 400, "Prompt is required.");

      const existing = asQuestions(assessment);
      const nextId =
        existing.reduce((max, q) => Math.max(max, Number(q.id) || 0), 0) + 1;
      const options = normalizeOptions(req.body?.options);
      const test_cases = normalizeTestCases(req.body?.test_cases);
      if (question_type === "mcq") {
        if (options.length < 2) return fail(res, 400, "MCQ needs at least two options.");
        if (!String(req.body?.correct_option || "").trim()) {
          return fail(res, 400, "Set the correct option letter (A, B, C, …).");
        }
      } else if (!test_cases.some((tc) => String(tc.stdout || "").trim())) {
        return fail(res, 400, "Add at least one test case with expected output.");
      }
      const question = {
        id: nextId,
        question_type,
        prompt,
        options,
        correct_option:
          question_type === "mcq"
            ? String(req.body?.correct_option || "").trim()
            : null,
        test_cases,
        language: req.body?.language || (question_type === "sql" ? "sql" : "javascript"),
        points: Math.max(1, Number(req.body?.points) || 10),
        sort_order:
          req.body?.sort_order != null ? Number(req.body.sort_order) : existing.length,
        source: "manual",
      };

      const { data, error } = await db(req)
        .from("coding_assessments")
        .update({
          questions: [...existing, question],
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) {
        return fail(
          res,
          400,
          /questions/i.test(error.message || "")
            ? "Run supabase/assessment-jsonb-fallback.sql in Supabase (ALTER only — adds questions column)."
            : error.message,
        );
      }
      res.status(201).json(question);
    }),
  );

  admin.patch(
    "/assessments/:id/questions/:qid",
    asyncHandler(async (req, res) => {
      const membership = await requireRecruiter(req.supabase, req.user.id);
      const id = Number(req.params.id);
      const qid = Number(req.params.qid);
      const assessment = await loadAssessmentOwned(db(req), id, membership.company_id);
      if (!assessment) return fail(res, 404, "Assessment not found.");

      const existing = asQuestions(assessment);
      const idx = existing.findIndex((q) => Number(q.id) === qid);
      if (idx < 0) return fail(res, 404, "Question not found.");

      const patch = { ...existing[idx] };
      if (req.body?.prompt !== undefined) patch.prompt = String(req.body.prompt).trim();
      if (req.body?.options !== undefined) patch.options = normalizeOptions(req.body.options);
      if (req.body?.correct_option !== undefined) {
        patch.correct_option = String(req.body.correct_option || "").trim() || null;
      }
      if (req.body?.test_cases !== undefined) {
        patch.test_cases = normalizeTestCases(req.body.test_cases);
      }
      if (req.body?.language !== undefined) patch.language = req.body.language;
      if (req.body?.points !== undefined) {
        patch.points = Math.max(1, Number(req.body.points) || 10);
      }
      if (req.body?.sort_order !== undefined) patch.sort_order = Number(req.body.sort_order);
      if (req.body?.question_type !== undefined) {
        const nextType = String(req.body.question_type).toLowerCase();
        if (!["mcq", "coding", "sql", "debug"].includes(nextType)) {
          return fail(res, 400, "Invalid question type.");
        }
        patch.question_type = nextType;
      }
      existing[idx] = patch;

      const { error } = await db(req)
        .from("coding_assessments")
        .update({ questions: existing, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
      res.json(patch);
    }),
  );

  admin.delete(
    "/assessments/:id/questions/:qid",
    asyncHandler(async (req, res) => {
      const membership = await requireRecruiter(req.supabase, req.user.id);
      const id = Number(req.params.id);
      const qid = Number(req.params.qid);
      const assessment = await loadAssessmentOwned(db(req), id, membership.company_id);
      if (!assessment) return fail(res, 404, "Assessment not found.");

      const next = asQuestions(assessment).filter((q) => Number(q.id) !== qid);
      const { error } = await db(req)
        .from("coding_assessments")
        .update({ questions: next, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
      res.json({ ok: true });
    }),
  );

  admin.post(
    "/assessments/:id/assign",
    asyncHandler(async (req, res) => {
      const membership = await requireRecruiter(req.supabase, req.user.id);
      const id = Number(req.params.id);
      const assessment = await loadAssessmentOwned(db(req), id, membership.company_id);
      if (!assessment) return fail(res, 404, "Assessment not found.");
      if (!asQuestions(assessment).length) {
        return fail(res, 400, "Add at least one question before assigning.");
      }

      const applicationIds = Array.isArray(req.body?.application_ids)
        ? req.body.application_ids.map(Number).filter(Number.isFinite)
        : [];
      if (!applicationIds.length) {
        return fail(res, 400, "Pick at least one application.");
      }

      const { data: apps, error: appsErr } = await db(req)
        .from("applications")
        .select("id, candidate_id, job_id, jobs!inner(company_id)")
        .in("id", applicationIds);
      if (appsErr) throw new Error(appsErr.message);

      const valid = (apps || []).filter((app) => {
        const companyId = unwrap(app.jobs)?.company_id;
        return (
          companyId === membership.company_id &&
          Number(app.job_id) === Number(assessment.job_id)
        );
      });
      if (!valid.length) {
        return fail(res, 400, "No matching applications for this job.");
      }

      const created = [];
      for (const app of valid) {
        const { data: existing } = await db(req)
          .from("assessment_attempts")
          .select("id, status, application_id, candidate_id, assessment_id")
          .eq("assessment_id", id)
          .eq("application_id", app.id)
          .maybeSingle();

        if (existing) {
          created.push(existing);
          continue;
        }

        const row = {
          assessment_id: id,
          application_id: app.id,
          candidate_id: app.candidate_id,
          status: "assigned",
          violation_count: 0,
          plagiarism_flag: false,
          answers_json: {},
          violations_json: [],
          question_order: [],
        };
        const { data, error } = await db(req)
          .from("assessment_attempts")
          .insert(row)
          .select("*")
          .maybeSingle();
        if (error) {
          if (!/duplicate|unique/i.test(error.message || "")) {
            throw new Error(error.message);
          }
          continue;
        }
        if (!data) continue;
        created.push(data);

        try {
          const ctx = await loadMessageContext(db(req), app.id);
          if (!ctx) continue;
          const draft = messageTemplate("assessment_assigned", {
            ...ctx.vars,
            test: assessment.title,
            duration: String(assessment.duration_minutes),
          });
          await sendCandidateMessage(db(req), {
            applicationId: app.id,
            companyId: membership.company_id,
            sentBy: req.user.id,
            templateKey: "assessment_assigned",
            subject: draft.subject,
            body: draft.body,
            candidateUserId: ctx.cand.user_id,
            candidateEmail: ctx.email,
          });
        } catch {
          /* non-blocking */
        }
      }

      res.status(201).json({ attempts: created });
    }),
  );

  admin.get(
    "/assessments/:id/attempts",
    asyncHandler(async (req, res) => {
      const membership = await requireCompanyMember(req.supabase, req.user.id);
      const id = Number(req.params.id);
      const assessment = await loadAssessmentOwned(db(req), id, membership.company_id);
      if (!assessment) return fail(res, 404, "Assessment not found.");

      const { data, error } = await db(req)
        .from("assessment_attempts")
        .select(
          "id, application_id, candidate_id, status, started_at, submitted_at, score, max_score, violation_count, plagiarism_flag, candidates(first_name, last_name, profile_image_url)",
        )
        .eq("assessment_id", id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      res.json(
        (data || []).map((row) => {
          const cand = unwrap(row.candidates) || {};
          return {
            ...row,
            candidate_name: [cand.first_name, cand.last_name]
              .filter(Boolean)
              .join(" "),
            profile_image_url: cand.profile_image_url || null,
            candidates: undefined,
          };
        }),
      );
    }),
  );

  admin.get(
    "/applications/:applicationId/assessments",
    asyncHandler(async (req, res) => {
      const membership = await requireCompanyMember(req.supabase, req.user.id);
      const applicationId = Number(req.params.applicationId);
      if (!Number.isFinite(applicationId)) {
        return fail(res, 400, "Invalid application.");
      }

      const { data: app } = await db(req)
        .from("applications")
        .select("id, job_id, jobs!inner(company_id)")
        .eq("id", applicationId)
        .maybeSingle();
      if (!app || unwrap(app.jobs)?.company_id !== membership.company_id) {
        return fail(res, 404, "Application not found.");
      }

      const { data, error } = await db(req)
        .from("assessment_attempts")
        .select(
          "id, status, started_at, submitted_at, score, max_score, violation_count, plagiarism_flag, assessment_id, coding_assessments(title, duration_minutes, pass_score)",
        )
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      res.json(data || []);
    }),
  );
}

function mountCandidateAssessmentRoutes(router) {
  router.get(
    "/assessments",
    asyncHandler(async (req, res) => {
      const candidateId = await getCandidateId(req.supabase, req.user.id);
      if (!candidateId) return res.json([]);

      const { data, error } = await db(req)
        .from("assessment_attempts")
        .select(
          "id, status, started_at, submitted_at, score, max_score, violation_count, application_id, coding_assessments(id, title, duration_minutes, description, max_violations, pass_score)",
        )
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      res.json(
        (data || []).map((row) => {
          const submitted = ["submitted", "auto_submitted"].includes(row.status);
          return {
            ...row,
            score: submitted ? row.score : null,
            max_score: submitted ? row.max_score : null,
            can_start: ["assigned", "in_progress"].includes(row.status),
            coding_assessments: Array.isArray(row.coding_assessments)
              ? row.coding_assessments[0] ?? null
              : row.coding_assessments,
          };
        }),
      );
    }),
  );

  router.post(
    "/assessments/attempts/:id/start",
    asyncHandler(async (req, res) => {
      const candidateId = await getCandidateId(req.supabase, req.user.id);
      if (!candidateId) return fail(res, 403, "Candidate profile required.");
      const id = Number(req.params.id);

      const { data: attempt, error } = await db(req)
        .from("assessment_attempts")
        .select("*, coding_assessments(*)")
        .eq("id", id)
        .eq("candidate_id", candidateId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!attempt) return fail(res, 404, "Attempt not found.");

      const assessment = unwrap(attempt.coding_assessments) || {};

      if (["submitted", "auto_submitted"].includes(attempt.status)) {
        return fail(res, 400, "This test is already submitted.");
      }

      if (attempt.status === "in_progress" && attempt.started_at) {
        return res.json(serializeCandidateAttempt(attempt, assessment));
      }

      const order = shuffle(asQuestions(assessment).map((q) => q.id));

      const { data: updated, error: upErr } = await db(req)
        .from("assessment_attempts")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
          question_order: order,
          answers_json: asAnswersMap(attempt),
          violations_json: asViolations(attempt),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (upErr) throw new Error(upErr.message);
      res.json(serializeCandidateAttempt(updated, assessment));
    }),
  );

  router.get(
    "/assessments/attempts/:id",
    asyncHandler(async (req, res) => {
      const candidateId = await getCandidateId(req.supabase, req.user.id);
      if (!candidateId) return fail(res, 403, "Candidate profile required.");
      const id = Number(req.params.id);

      const { data: attempt, error } = await db(req)
        .from("assessment_attempts")
        .select("*, coding_assessments(*)")
        .eq("id", id)
        .eq("candidate_id", candidateId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!attempt) return fail(res, 404, "Attempt not found.");

      const assessment = unwrap(attempt.coding_assessments) || {};

      if (
        attempt.status === "in_progress" &&
        remainingSeconds(attempt, assessment) <= 0
      ) {
        const finalized = await finalizeAttempt(db(req), attempt, assessment, true);
        return res.json(serializeCandidateAttempt(finalized, assessment));
      }

      res.json(serializeCandidateAttempt(attempt, assessment));
    }),
  );

  router.put(
    "/assessments/attempts/:id/answers",
    asyncHandler(async (req, res) => {
      const candidateId = await getCandidateId(req.supabase, req.user.id);
      if (!candidateId) return fail(res, 403, "Candidate profile required.");
      const id = Number(req.params.id);

      const { data: attempt } = await db(req)
        .from("assessment_attempts")
        .select("*, coding_assessments(*)")
        .eq("id", id)
        .eq("candidate_id", candidateId)
        .maybeSingle();
      if (!attempt) return fail(res, 404, "Attempt not found.");
      if (attempt.status !== "in_progress" || !attempt.started_at) {
        return fail(res, 400, "Start the test before saving answers.");
      }

      const assessment = unwrap(attempt.coding_assessments) || {};
      if (remainingSeconds(attempt, assessment) <= 0) {
        await finalizeAttempt(db(req), attempt, assessment, true);
        return fail(res, 400, "Time is up. Test was auto-submitted.");
      }

      const allowedIds = new Set(
        asQuestions(assessment).map((q) => Number(q.id)),
      );
      const next = asAnswersMap(attempt);
      const items = Array.isArray(req.body?.answers) ? req.body.answers : [];
      for (const item of items) {
        const questionId = Number(item.question_id);
        if (!Number.isFinite(questionId) || !allowedIds.has(questionId)) continue;
        const prev = next[String(questionId)];
        next[String(questionId)] = {
          answer_text: item.answer_text == null ? "" : String(item.answer_text),
        };
        if (typeof prev === "object" && prev?.runtime_ms != null) {
          next[String(questionId)].runtime_ms = prev.runtime_ms;
        }
      }

      const { error } = await db(req)
        .from("assessment_attempts")
        .update({ answers_json: next })
        .eq("id", id);
      if (error) {
        return fail(
          res,
          400,
          /answers_json/i.test(error.message || "")
            ? "Run supabase/assessment-jsonb-fallback.sql in Supabase first."
            : error.message,
        );
      }

      res.json({ ok: true });
    }),
  );

  router.post(
    "/assessments/attempts/:id/violation",
    asyncHandler(async (req, res) => {
      const candidateId = await getCandidateId(req.supabase, req.user.id);
      if (!candidateId) return fail(res, 403, "Candidate profile required.");
      const id = Number(req.params.id);
      const type = String(req.body?.type || "tab_switch");
      if (!["tab_switch", "window_blur"].includes(type)) {
        return fail(res, 400, "Invalid violation type.");
      }

      const { data: attempt } = await db(req)
        .from("assessment_attempts")
        .select("*, coding_assessments(*)")
        .eq("id", id)
        .eq("candidate_id", candidateId)
        .maybeSingle();
      if (!attempt) return fail(res, 404, "Attempt not found.");
      if (attempt.status !== "in_progress" || !attempt.started_at) {
        return res.json({
          ok: true,
          auto_submitted: false,
          violation_count: attempt.violation_count || 0,
        });
      }

      const violations = [
        ...asViolations(attempt),
        { type, occurred_at: new Date().toISOString() },
      ];
      const nextCount = violations.length;
      const assessment = unwrap(attempt.coding_assessments) || {};
      const max = assessment.max_violations || 3;

      await db(req)
        .from("assessment_attempts")
        .update({
          violations_json: violations,
          violation_count: nextCount,
        })
        .eq("id", id);

      let autoSubmitted = false;
      if (nextCount >= max) {
        await finalizeAttempt(
          db(req),
          { ...attempt, violation_count: nextCount, violations_json: violations },
          assessment,
          true,
        );
        autoSubmitted = true;
      }

      res.json({
        ok: true,
        violation_count: nextCount,
        auto_submitted: autoSubmitted,
      });
    }),
  );

  router.post(
    "/assessments/attempts/:id/submit",
    asyncHandler(async (req, res) => {
      const candidateId = await getCandidateId(req.supabase, req.user.id);
      if (!candidateId) return fail(res, 403, "Candidate profile required.");
      const id = Number(req.params.id);
      const auto = Boolean(req.body?.auto);

      const { data: attempt } = await db(req)
        .from("assessment_attempts")
        .select("*, coding_assessments(*)")
        .eq("id", id)
        .eq("candidate_id", candidateId)
        .maybeSingle();
      if (!attempt) return fail(res, 404, "Attempt not found.");

      const assessment = unwrap(attempt.coding_assessments) || {};

      if (["submitted", "auto_submitted"].includes(attempt.status)) {
        return res.json(serializeCandidateAttempt(attempt, assessment));
      }

      if (attempt.status !== "in_progress" || !attempt.started_at) {
        return fail(res, 400, "Start the test before submitting.");
      }

      const allowedIds = new Set(
        asQuestions(assessment).map((q) => Number(q.id)),
      );
      const next = asAnswersMap(attempt);
      const items = Array.isArray(req.body?.answers) ? req.body.answers : [];
      for (const item of items) {
        const questionId = Number(item.question_id);
        if (!Number.isFinite(questionId) || !allowedIds.has(questionId)) continue;
        next[String(questionId)] = {
          answer_text: item.answer_text == null ? "" : String(item.answer_text),
        };
      }

      const updated = await finalizeAttempt(
        db(req),
        { ...attempt, answers_json: next },
        assessment,
        auto,
      );
      res.json(serializeCandidateAttempt(updated, assessment));
    }),
  );
}

module.exports = {
  mountCompanyAssessmentRoutes,
  mountCandidateAssessmentRoutes,
  finalizeAttempt,
};
