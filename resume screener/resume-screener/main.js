require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { parseResume } = require("./lib/parseResume");
const { rateResume, generateQuestions } = require("./lib/llm");

const RESUME_DIR = path.join(__dirname, "resumes");
const OUTPUT_DIR = path.join(__dirname, "output");
const JD_FILE = path.join(__dirname, "job_description.txt");
const SHORTLIST_COUNT = parseInt(process.env.SHORTLIST_COUNT || "10", 10);
const DELAY_MS = parseInt(process.env.DELAY_MS || "2200", 10); // throttle to stay under free-tier rate limits

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    if (!process.env.GROQ_API_KEY) {
        console.error("GROQ_API_KEY not found. Add it to your .env file.");
        process.exit(1);
    }

    if (!fs.existsSync(JD_FILE)) {
        console.error(`Missing job_description.txt. Create it at: ${JD_FILE}`);
        process.exit(1);
    }
    const jobDescription = fs.readFileSync(JD_FILE, "utf-8");

    if (!fs.existsSync(RESUME_DIR)) {
        console.error(`Missing resumes folder. Create it at: ${RESUME_DIR}`);
        process.exit(1);
    }
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

    const files = fs
        .readdirSync(RESUME_DIR)
        .filter((f) => [".pdf", ".docx"].includes(path.extname(f).toLowerCase()));

    if (files.length === 0) {
        console.error("No PDF/DOCX resumes found in resumes/ folder.");
        process.exit(1);
    }

    console.log(`Found ${files.length} resumes. Starting screening...\n`);

    const results = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(RESUME_DIR, file);
        console.log(`[${i + 1}/${files.length}] Processing ${file}...`);

        try {
            const text = await parseResume(filePath);
            const rating = await rateResume(text, jobDescription);
            results.push({ file, resumeText: text, ...rating });
            console.log(`  -> Match: ${rating.match_percentage}% | Verdict: ${rating.verdict}`);
        } catch (err) {
            console.error(`  -> Failed: ${err.message}`);
            results.push({ file, match_percentage: 0, verdict: "error", recommendation: err.message, resumeText: "" });
        }

        if (i < files.length - 1) await sleep(DELAY_MS);
    }

    // Rank by match percentage, highest first
    results.sort((a, b) => (b.match_percentage || 0) - (a.match_percentage || 0));

    // Save full ranked results (strip resume text so the JSON stays readable)
    const resultsSummary = results.map(({ resumeText, ...rest }) => rest);
    fs.writeFileSync(
        path.join(OUTPUT_DIR, "results.json"),
        JSON.stringify(resultsSummary, null, 2)
    );

    // CSV for quick scanning in Excel/Sheets
    const csvHeader = "file,candidate_name,match_percentage,verdict,recommendation\n";
    const csvRows = resultsSummary
        .map((r) =>
            [r.file, r.candidate_name, r.match_percentage, r.verdict, (r.recommendation || "").replace(/,/g, ";")].join(",")
        )
        .join("\n");
    fs.writeFileSync(path.join(OUTPUT_DIR, "results.csv"), csvHeader + csvRows);

    console.log(`\nAll results saved to output/results.json and output/results.csv`);

    // Shortlist top N by score
    const shortlisted = results.filter((r) => r.verdict !== "error").slice(0, SHORTLIST_COUNT);
    console.log(`\nShortlisting top ${shortlisted.length} candidates. Generating interview questions...\n`);

    const questionResults = [];

    for (let i = 0; i < shortlisted.length; i++) {
        const candidate = shortlisted[i];
        console.log(`[${i + 1}/${shortlisted.length}] Generating questions for ${candidate.file}...`);
        try {
            const questions = await generateQuestions(candidate.resumeText, jobDescription);
            questionResults.push({
                file: candidate.file,
                candidate_name: candidate.candidate_name,
                match_percentage: candidate.match_percentage,
                questions,
            });
        } catch (err) {
            console.error(`  -> Failed to generate questions: ${err.message}`);
        }
        if (i < shortlisted.length - 1) await sleep(DELAY_MS);
    }

    fs.writeFileSync(
        path.join(OUTPUT_DIR, "shortlist_questions.json"),
        JSON.stringify(questionResults, null, 2)
    );

    console.log(`\nDone! Shortlisted candidates + questions saved to output/shortlist_questions.json`);
}

main();
