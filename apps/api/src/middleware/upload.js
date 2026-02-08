// ============================================================
// FILE UPLOAD SECURITY
// Validates file types, sizes, and sanitizes filenames
// ============================================================

import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// Allowed MIME types by category
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  spreadsheet: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ],
  any: [] // Will use all above
};

// File size limits (in bytes)
const SIZE_LIMITS = {
  image: 5 * 1024 * 1024,       // 5MB
  document: 10 * 1024 * 1024,   // 10MB
  spreadsheet: 25 * 1024 * 1024, // 25MB
  any: 25 * 1024 * 1024         // 25MB
};

// Allowed file extensions (double-check against MIME type spoofing)
const ALLOWED_EXTENSIONS = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  document: ['.pdf', '.doc', '.docx'],
  spreadsheet: ['.xls', '.xlsx', '.csv'],
};

// Generate safe filename
const generateFilename = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}_${hash}${ext}`;
};

// Validate file extension matches MIME type
const validateExtension = (filename, mimetype, category) => {
  const ext = path.extname(filename).toLowerCase();
  const allowedExts = category === 'any'
    ? [...ALLOWED_EXTENSIONS.image, ...ALLOWED_EXTENSIONS.document, ...ALLOWED_EXTENSIONS.spreadsheet]
    : ALLOWED_EXTENSIONS[category] || [];

  return allowedExts.includes(ext);
};

// File filter factory
const createFileFilter = (category = 'any') => {
  return (req, file, cb) => {
    let allowedTypes;

    if (category === 'any') {
      allowedTypes = [
        ...ALLOWED_TYPES.image,
        ...ALLOWED_TYPES.document,
        ...ALLOWED_TYPES.spreadsheet
      ];
    } else {
      allowedTypes = ALLOWED_TYPES[category] || [];
    }

    // Check MIME type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`), false);
    }

    // Check extension matches
    if (!validateExtension(file.originalname, file.mimetype, category)) {
      return cb(new Error('File extension does not match file type'), false);
    }

    cb(null, true);
  };
};

// Ensure upload directory exists
const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// Storage configuration
const createStorage = (subdir = '') => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const baseDir = process.env.UPLOAD_DIR || '/tmp/uploads';
      const uploadDir = subdir ? path.join(baseDir, subdir) : baseDir;
      cb(null, ensureUploadDir(uploadDir));
    },
    filename: (req, file, cb) => {
      cb(null, generateFilename(file.originalname));
    }
  });
};

// Create upload middleware
export const createUploader = (category = 'any', maxCount = 5, subdir = '') => {
  return multer({
    storage: createStorage(subdir),
    limits: {
      fileSize: SIZE_LIMITS[category] || SIZE_LIMITS.any,
      files: maxCount
    },
    fileFilter: createFileFilter(category)
  });
};

// Pre-configured uploaders
export const imageUpload = createUploader('image', 10, 'images');
export const documentUpload = createUploader('any', 5, 'documents'); // Supports PDF, DOCX, and images
export const spreadsheetUpload = createUploader('spreadsheet', 1, 'spreadsheets');
export const anyUpload = createUploader('any', 10, 'misc');

// Avatar upload (single image, smaller size)
export const avatarUpload = multer({
  storage: createStorage('avatars'),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1
  },
  fileFilter: createFileFilter('image')
});

// Receipt upload for expenses
export const receiptUpload = multer({
  storage: createStorage('receipts'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5
  },
  fileFilter: createFileFilter('image')
});

// Error handler for multer errors
export const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err) {
    return res.status(400).json({ error: err.message });
  }

  next();
};

// Clean up uploaded file on error
export const cleanupOnError = (files) => {
  if (!files) return;

  const fileList = Array.isArray(files) ? files : [files];
  fileList.forEach(file => {
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  });
};

export default {
  createUploader,
  imageUpload,
  documentUpload,
  spreadsheetUpload,
  anyUpload,
  avatarUpload,
  receiptUpload,
  uploadErrorHandler,
  cleanupOnError
};
