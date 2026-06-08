const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../lib/config');
const { httpError } = require('../lib/response');

const MIME_BY_EXTENSION = {
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword', 'application/octet-stream'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'],
    '.png': ['image/png'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.webp': ['image/webp'],
    '.csv': ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel'],
    '.txt': ['text/plain']
};

let s3Client;

function s3() {
    if (s3Client) return s3Client;
    s3Client = new S3Client({
        endpoint: config.s3.endpoint,
        region: config.s3.region,
        forcePathStyle: Boolean(config.s3.endpoint),
        credentials: config.s3.accessKeyId ? {
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey
        } : undefined
    });
    return s3Client;
}

function normaliseExtension(name) {
    return path.extname(String(name || '')).toLowerCase();
}

function safeOriginalName(name) {
    const base = path.basename(String(name || 'upload.bin')).replace(/[^\w.\- ()]/g, '_');
    return base.slice(0, 180) || 'upload.bin';
}

function validateUpload(file) {
    if (!file) throw httpError(400, 'file_missing', 'File is required');
    const originalName = safeOriginalName(file.originalname);
    const extension = normaliseExtension(originalName);
    if (!config.uploads.allowedExtensions.includes(extension)) {
        throw httpError(400, 'file_type_not_allowed', 'This file type is not allowed');
    }
    if (Number(file.size || 0) > config.uploads.maxFileSize) {
        throw httpError(413, 'file_too_large', 'File is too large');
    }
    const allowedMimes = MIME_BY_EXTENSION[extension] || [];
    if (file.mimetype && allowedMimes.length && !allowedMimes.includes(file.mimetype)) {
        throw httpError(400, 'mime_type_not_allowed', 'File MIME type is not allowed');
    }
    const buffer = file.buffer;
    if (buffer && !signatureMatches(extension, buffer)) {
        throw httpError(400, 'file_signature_invalid', 'File contents do not match the extension');
    }
    return { originalName, extension, mimeType: file.mimetype || allowedMimes[0] || 'application/octet-stream' };
}

function signatureMatches(extension, buffer) {
    if (!buffer || buffer.length < 4) return ['.txt', '.csv'].includes(extension);
    const head4 = buffer.subarray(0, 4).toString('hex');
    if (extension === '.pdf') return buffer.subarray(0, 4).toString() === '%PDF';
    if (extension === '.png') return head4 === '89504e47';
    if (extension === '.jpg' || extension === '.jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (extension === '.webp') return buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
    if (extension === '.docx') return buffer.subarray(0, 2).toString() === 'PK';
    if (extension === '.doc') return head4 === 'd0cf11e0';
    if (extension === '.csv' || extension === '.txt') return !buffer.includes(0);
    return false;
}

async function storeUploadedFile(getConnection, userId, file, owner) {
    const metadata = validateUpload(file);
    const id = crypto.randomUUID();
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const objectKey = `${userId}/${id}${metadata.extension}`;

    if (config.uploads.driver === 's3') {
        await s3().send(new PutObjectCommand({
            Bucket: config.s3.bucket,
            Key: objectKey,
            Body: file.buffer,
            ContentType: metadata.mimeType,
            Metadata: {
                owner: userId,
                originalName: metadata.originalName
            }
        }));
    } else {
        const fullPath = path.join(config.uploads.localDir, objectKey);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, file.buffer);
    }

    const record = {
        id_file: id,
        id_user: userId,
        owner_type: owner && owner.type || 'user',
        owner_id: owner && owner.id || null,
        storage_driver: config.uploads.driver,
        bucket: config.uploads.driver === 's3' ? config.s3.bucket : null,
        object_key: objectKey,
        original_name: metadata.originalName,
        mime_type: metadata.mimeType,
        extension: metadata.extension,
        size_bytes: file.size,
        checksum_sha256: checksum,
        status: 'uploaded',
        visibility: 'private'
    };
    await insertFile(getConnection, record);
    return toPublicFile(record);
}

async function createPresignedUpload(getConnection, userId, input) {
    const originalName = safeOriginalName(input.originalName);
    const extension = normaliseExtension(originalName);
    if (!config.uploads.allowedExtensions.includes(extension)) {
        throw httpError(400, 'file_type_not_allowed', 'This file type is not allowed');
    }
    const id = crypto.randomUUID();
    const objectKey = `${userId}/${id}${extension}`;
    const mimeType = input.mimeType || (MIME_BY_EXTENSION[extension] || [])[0] || 'application/octet-stream';
    const record = {
        id_file: id,
        id_user: userId,
        owner_type: input.ownerType || 'user',
        owner_id: input.ownerId || null,
        storage_driver: config.uploads.driver,
        bucket: config.uploads.driver === 's3' ? config.s3.bucket : null,
        object_key: objectKey,
        original_name: originalName,
        mime_type: mimeType,
        extension,
        size_bytes: Number(input.size || 0),
        checksum_sha256: null,
        status: 'pending',
        visibility: 'private'
    };
    await insertFile(getConnection, record);

    if (config.uploads.driver === 's3') {
        const command = new PutObjectCommand({
            Bucket: config.s3.bucket,
            Key: objectKey,
            ContentType: mimeType
        });
        return {
            file: toPublicFile(record),
            upload: {
                method: 'PUT',
                url: await getSignedUrl(s3(), command, { expiresIn: 900 }),
                headers: { 'Content-Type': mimeType }
            }
        };
    }

    return {
        file: toPublicFile(record),
        upload: {
            method: 'POST',
            url: `/api/files/${id}/content`,
            headers: {}
        }
    };
}

async function completeUpload(getConnection, userId, fileId, details) {
    const file = await getFile(getConnection, fileId);
    if (!file || file.id_user !== userId) throw httpError(404, 'file_not_found', 'File not found');
    await updateFileStatus(getConnection, fileId, {
        status: 'uploaded',
        checksum: details && details.checksum || file.checksum_sha256,
        size: details && details.size || file.size_bytes
    });
    return toPublicFile(Object.assign(file, {
        status: 'uploaded',
        checksum_sha256: details && details.checksum || file.checksum_sha256,
        size_bytes: details && details.size || file.size_bytes
    }));
}

async function storePendingUploadContent(getConnection, userId, fileId, uploadedFile) {
    const existing = await getFile(getConnection, fileId);
    if (!existing || existing.id_user !== userId || existing.status !== 'pending') {
        throw httpError(404, 'file_not_found', 'Pending file upload not found');
    }
    const metadata = validateUpload(Object.assign({}, uploadedFile, {
        originalname: existing.original_name,
        mimetype: uploadedFile.mimetype || existing.mime_type
    }));
    if (metadata.extension !== existing.extension) {
        throw httpError(400, 'file_type_mismatch', 'Uploaded file type does not match the prepared upload');
    }
    const checksum = crypto.createHash('sha256').update(uploadedFile.buffer).digest('hex');
    if (existing.storage_driver === 's3') {
        await s3().send(new PutObjectCommand({
            Bucket: existing.bucket,
            Key: existing.object_key,
            Body: uploadedFile.buffer,
            ContentType: metadata.mimeType
        }));
    } else {
        const fullPath = path.join(config.uploads.localDir, existing.object_key);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, uploadedFile.buffer);
    }
    await updateFileStatus(getConnection, fileId, {
        status: 'uploaded',
        checksum,
        size: uploadedFile.size
    });
    return toPublicFile(Object.assign(existing, {
        status: 'uploaded',
        checksum_sha256: checksum,
        size_bytes: uploadedFile.size
    }));
}

async function readFileBuffer(getConnection, userId, fileId, allowAdmin) {
    const file = await getFile(getConnection, fileId);
    if (!file || file.deleted_at) throw httpError(404, 'file_not_found', 'File not found');
    if (!allowAdmin && file.id_user !== userId) throw httpError(403, 'forbidden', 'You do not have access to this file');
    if (file.storage_driver === 's3') {
        const result = await s3().send(new GetObjectCommand({ Bucket: file.bucket, Key: file.object_key }));
        const chunks = [];
        for await (const chunk of result.Body) chunks.push(chunk);
        return { file, buffer: Buffer.concat(chunks) };
    }
    const fullPath = path.join(config.uploads.localDir, file.object_key);
    return { file, buffer: await fs.readFile(fullPath) };
}

async function deleteFile(getConnection, userId, fileId, allowAdmin) {
    const file = await getFile(getConnection, fileId);
    if (!file || file.deleted_at) throw httpError(404, 'file_not_found', 'File not found');
    if (!allowAdmin && file.id_user !== userId) throw httpError(403, 'forbidden', 'You do not have access to this file');
    if (file.storage_driver === 's3') {
        await s3().send(new DeleteObjectCommand({ Bucket: file.bucket, Key: file.object_key }));
    } else {
        await fs.rm(path.join(config.uploads.localDir, file.object_key), { force: true });
    }
    const connection = await getConnection();
    try {
        await connection.execute('UPDATE file_asset SET status = ?, deleted_at = UTC_TIMESTAMP() WHERE id_file = ?', ['deleted', fileId]);
    } finally {
        connection.release();
    }
}

async function insertFile(getConnection, record) {
    const connection = await getConnection();
    try {
        await connection.execute(
            `INSERT INTO file_asset
             (id_file, id_user, owner_type, owner_id, storage_driver, bucket, object_key,
              original_name, mime_type, extension, size_bytes, checksum_sha256, status, visibility, uploaded_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'uploaded' THEN UTC_TIMESTAMP() ELSE NULL END)`,
            [
                record.id_file,
                record.id_user,
                record.owner_type,
                record.owner_id,
                record.storage_driver,
                record.bucket,
                record.object_key,
                record.original_name,
                record.mime_type,
                record.extension,
                record.size_bytes,
                record.checksum_sha256,
                record.status,
                record.visibility,
                record.status
            ]
        );
    } finally {
        connection.release();
    }
}

async function getFile(getConnection, fileId) {
    const connection = await getConnection();
    try {
        const [rows] = await connection.execute('SELECT * FROM file_asset WHERE id_file = ? LIMIT 1', [fileId]);
        return rows[0] || null;
    } finally {
        connection.release();
    }
}

async function updateFileStatus(getConnection, fileId, details) {
    const connection = await getConnection();
    try {
        await connection.execute(
            `UPDATE file_asset
             SET status = ?, checksum_sha256 = COALESCE(?, checksum_sha256),
                 size_bytes = COALESCE(?, size_bytes), uploaded_at = UTC_TIMESTAMP()
             WHERE id_file = ?`,
            [details.status, details.checksum || null, details.size || null, fileId]
        );
    } finally {
        connection.release();
    }
}

function toPublicFile(file) {
    return {
        id: file.id_file,
        id_file: file.id_file,
        originalName: file.original_name,
        mimeType: file.mime_type,
        extension: file.extension,
        size: Number(file.size_bytes) || 0,
        status: file.status,
        url: `/api/files/${file.id_file}`
    };
}

module.exports = {
    validateUpload,
    storeUploadedFile,
    createPresignedUpload,
    storePendingUploadContent,
    completeUpload,
    readFileBuffer,
    deleteFile,
    toPublicFile
};
