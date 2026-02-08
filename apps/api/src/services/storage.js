// ============================================================
// FILE STORAGE SERVICE
// S3-compatible storage (AWS S3, Supabase Storage, MinIO, etc.)
// Falls back to local disk when S3 is not configured
// ============================================================

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ENDPOINT = process.env.S3_ENDPOINT; // For Supabase/MinIO
const S3_CDN_URL = process.env.S3_CDN_URL; // Optional CDN prefix
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/uploads';

const useS3 = !!(S3_BUCKET && (process.env.AWS_ACCESS_KEY_ID || process.env.S3_ENDPOINT));

let s3;
if (useS3) {
  const config = {
    region: S3_REGION,
  };
  if (S3_ENDPOINT) {
    config.endpoint = S3_ENDPOINT;
    config.forcePathStyle = true; // Required for Supabase/MinIO
  }
  s3 = new S3Client(config);
  console.log(`[storage] Using S3 bucket: ${S3_BUCKET} (endpoint: ${S3_ENDPOINT || 'AWS'})`);
} else {
  console.log(`[storage] Using local disk: ${UPLOAD_DIR}`);
}

/**
 * Generate a storage key for a file
 */
function generateKey(subdir, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const filename = `${timestamp}_${hash}${ext}`;
  return subdir ? `${subdir}/${filename}` : filename;
}

/**
 * Upload a buffer or stream to storage
 * Returns { key, url }
 */
async function upload(buffer, key, contentType) {
  if (useS3) {
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    }));

    const url = S3_CDN_URL
      ? `${S3_CDN_URL}/${key}`
      : `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;

    return { key, url };
  }

  // Local fallback
  const filePath = path.join(UPLOAD_DIR, key);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, buffer);
  return { key, url: `/uploads/${key}` };
}

/**
 * Upload from a local file path (used with multer disk storage)
 */
async function uploadFromPath(filePath, key, contentType) {
  const buffer = fs.readFileSync(filePath);
  const result = await upload(buffer, key, contentType);
  // Clean up temp file
  fs.unlinkSync(filePath);
  return result;
}

/**
 * Get a signed URL for private file access (expires in 1 hour)
 */
async function getUrl(key, expiresIn = 3600) {
  if (useS3) {
    if (S3_CDN_URL) {
      return `${S3_CDN_URL}/${key}`;
    }
    return getSignedUrl(s3, new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    }), { expiresIn });
  }

  return `/uploads/${key}`;
}

/**
 * Delete a file from storage
 */
async function remove(key) {
  if (useS3) {
    await s3.send(new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    }));
    return;
  }

  const filePath = path.join(UPLOAD_DIR, key);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Middleware: after multer writes to disk, move file to S3
 * Attaches `storageKey` and `storageUrl` to each file object
 */
async function processUploads(req, res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0) return next();

    for (const file of files) {
      const subdir = path.relative(UPLOAD_DIR, path.dirname(file.path)) || 'misc';
      const key = generateKey(subdir, file.originalname);
      const result = await uploadFromPath(file.path, key, file.mimetype);
      file.storageKey = result.key;
      file.storageUrl = result.url;
    }
    next();
  } catch (err) {
    next(err);
  }
}

const storageService = {
  useS3,
  generateKey,
  upload,
  uploadFromPath,
  getUrl,
  remove,
  processUploads,
};

export default storageService;
export { useS3, generateKey, upload, uploadFromPath, getUrl, remove, processUploads };
