const storage = require('../../services/storageService');

describe('upload validation', () => {
    test('accepts a PDF with a matching signature', () => {
        expect(() => storage.validateUpload({
            originalname: 'cv.pdf',
            mimetype: 'application/pdf',
            size: 12,
            buffer: Buffer.from('%PDF-1.7')
        })).not.toThrow();
    });

    test('rejects mismatched signatures', () => {
        expect(() => storage.validateUpload({
            originalname: 'cv.pdf',
            mimetype: 'application/pdf',
            size: 12,
            buffer: Buffer.from('not a pdf')
        })).toThrow(/contents/i);
    });
});
