jest.mock('pdf-parse', () => {
    return {
        PDFParse: class PDFParse {
            constructor(options) {
                this.options = options;
                this.destroyed = false;
            }

            async getText() {
                return { text: `Parsed ${this.options.data.length} bytes` };
            }

            async destroy() {
                this.destroyed = true;
            }
        }
    };
});

const cvText = require('../../services/cvTextService');

describe('CV text extraction', () => {
    test('extracts plain text files', async () => {
        await expect(cvText.extractText(
            { extension: '.txt' },
            Buffer.from('Hello\n\nTheWay')
        )).resolves.toBe('Hello TheWay');
    });

    test('supports pdf-parse v2 PDFParse export', async () => {
        await expect(cvText.extractText(
            { extension: '.pdf' },
            Buffer.from('%PDF-1.7')
        )).resolves.toBe('Parsed 8 bytes');
    });
});
