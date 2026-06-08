const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { httpError } = require('../lib/response');

async function extractText(file, buffer) {
    const extension = String(file.extension || '').toLowerCase();
    if (extension === '.pdf') {
        const result = await parsePdf(buffer);
        return cleanText(result.text);
    }
    if (extension === '.docx') {
        const result = await mammoth.extractRawText({ buffer });
        return cleanText(result.value);
    }
    if (extension === '.txt' || extension === '.csv') {
        return cleanText(buffer.toString('utf8'));
    }
    throw httpError(400, 'cv_text_unsupported', 'Text extraction is only available for PDF, DOCX, TXT and CSV files');
}

async function parsePdf(buffer) {
    if (typeof pdfParse === 'function') {
        return pdfParse(buffer);
    }

    if (pdfParse && typeof pdfParse.PDFParse === 'function') {
        const parser = new pdfParse.PDFParse({ data: buffer });
        try {
            return await parser.getText();
        } finally {
            await parser.destroy();
        }
    }

    throw httpError(500, 'pdf_parser_unavailable', 'PDF parser is not available');
}

function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 24000);
}

module.exports = {
    extractText
};
