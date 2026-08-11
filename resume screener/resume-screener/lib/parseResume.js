const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

async function parseResume(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".pdf") {
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        return data.text;
    } else if (ext === ".docx") {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    } else {
        throw new Error(`Unsupported file type: ${ext}`);
    }
}

module.exports = { parseResume };
