const path = require("path");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

async function parsePdfBuffer(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return String(result?.text || "").trim();
  } finally {
    if (typeof parser.destroy === "function") {
      await parser.destroy().catch(() => {});
    }
  }
}

async function parseResumeBuffer(buffer, fileNameOrType = "") {
  const hint = String(fileNameOrType || "").toLowerCase();
  const ext =
    path.extname(hint) ||
    (hint.includes("pdf") ? ".pdf" : hint.includes("doc") ? ".docx" : "");

  if (ext === ".pdf" || hint.includes("pdf")) {
    return parsePdfBuffer(buffer);
  }

  if (ext === ".docx" || hint.includes("word") || hint.includes("docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return String(result.value || "").trim();
  }

  // Sniff: PDF magic bytes
  if (buffer?.[0] === 0x25 && buffer?.[1] === 0x50 && buffer?.[2] === 0x44) {
    return parsePdfBuffer(buffer);
  }

  try {
    const text = await parsePdfBuffer(buffer);
    if (text) return text;
  } catch {
    /* fall through to docx */
  }

  const result = await mammoth.extractRawText({ buffer });
  const text = String(result.value || "").trim();
  if (!text) {
    throw new Error("Could not extract text from resume (PDF/DOCX only).");
  }
  return text;
}

module.exports = { parseResumeBuffer };
