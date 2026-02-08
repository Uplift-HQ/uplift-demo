// ============================================================
// DOCUMENTS API ROUTES
// Document management, uploads, downloads, and e-signatures
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';
import { documentUpload, uploadErrorHandler, cleanupOnError } from '../middleware/upload.js';
import storageService from '../services/storage.js';
import path from 'path';
import fs from 'fs';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/uploads';
const DOCUMENTS_DIR = path.join(UPLOAD_DIR, 'documents');

// Ensure documents directory exists
if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

// ==================== DOCUMENT LISTING ====================

// Get documents - filtered by role and access
router.get('/', async (req, res) => {
  try {
    const { organizationId, role, employeeId } = req.user;
    const { category, employeeId: filterEmployeeId, signatureStatus, search } = req.query;

    let query = `
      SELECT d.*,
             e.first_name || ' ' || e.last_name as employee_name,
             u.first_name || ' ' || u.last_name as uploaded_by_name,
             ds.signature_text,
             ds.signature_image,
             ds.signed_at,
             ds.ip_address as signature_ip,
             ds.employee_id as signer_employee_id,
             se.first_name || ' ' || se.last_name as signer_name
      FROM documents d
      LEFT JOIN employees e ON e.id = d.employee_id
      LEFT JOIN users u ON u.id = d.uploaded_by
      LEFT JOIN document_signatures ds ON ds.document_id = d.id
      LEFT JOIN employees se ON se.id = ds.employee_id
      WHERE d.organization_id = $1
    `;
    const params = [organizationId];
    let paramIndex = 2;

    // Access control based on role
    if (role === 'worker') {
      // Workers can only see documents assigned to them
      query += ` AND d.employee_id = $${paramIndex++}`;
      params.push(employeeId);
    } else if (role === 'manager') {
      // Managers can see their team's documents (employees they manage)
      // For now, allow managers to see documents at their location
      const managerEmployee = await db.query(
        `SELECT primary_location_id, department_id FROM employees WHERE id = $1`,
        [employeeId]
      );
      if (managerEmployee.rows.length > 0) {
        const { primary_location_id, department_id } = managerEmployee.rows[0];
        query += ` AND (d.employee_id = $${paramIndex++} OR e.primary_location_id = $${paramIndex++} OR e.department_id = $${paramIndex++})`;
        params.push(employeeId, primary_location_id, department_id);
      }
    }
    // Admins see all documents in their organization (no additional filter)

    // Optional filters
    if (category) {
      query += ` AND d.category = $${paramIndex++}`;
      params.push(category);
    }

    if (filterEmployeeId && (role === 'admin' || role === 'manager')) {
      query += ` AND d.employee_id = $${paramIndex++}`;
      params.push(filterEmployeeId);
    }

    if (signatureStatus) {
      query += ` AND d.signature_status = $${paramIndex++}`;
      params.push(signatureStatus);
    }

    if (search) {
      query += ` AND (d.title ILIKE $${paramIndex++} OR e.first_name ILIKE $${paramIndex} OR e.last_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY d.created_at DESC`;

    const result = await db.query(query, params);

    res.json({ documents: result.rows });
  } catch (error) {
    console.error('Failed to get documents:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// Get single document
router.get('/:id', async (req, res) => {
  try {
    const { organizationId, role, employeeId } = req.user;

    const result = await db.query(`
      SELECT d.*,
             e.first_name || ' ' || e.last_name as employee_name,
             u.first_name || ' ' || u.last_name as uploaded_by_name,
             ds.signature_text,
             ds.signature_image,
             ds.signed_at,
             ds.ip_address as signature_ip,
             ds.agreed_at,
             se.first_name || ' ' || se.last_name as signer_name
      FROM documents d
      LEFT JOIN employees e ON e.id = d.employee_id
      LEFT JOIN users u ON u.id = d.uploaded_by
      LEFT JOIN document_signatures ds ON ds.document_id = d.id
      LEFT JOIN employees se ON se.id = ds.employee_id
      WHERE d.id = $1 AND d.organization_id = $2
    `, [req.params.id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = result.rows[0];

    // Access control
    if (role === 'worker' && doc.employee_id !== employeeId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ document: doc });
  } catch (error) {
    console.error('Failed to get document:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

// ==================== DOCUMENT UPLOAD ====================

// Upload a new document
router.post('/upload',
  documentUpload.single('file'),
  uploadErrorHandler,
  async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { title, category, employeeId, requiresSignature } = req.body;

      if (!title || !employeeId) {
        if (req.file) cleanupOnError(req.file);
        return res.status(400).json({ error: 'Title and employee ID are required' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Get file info
      const file = req.file;
      const fileType = path.extname(file.originalname).slice(1).toLowerCase();

      // Store file using storage service (handles S3 or local)
      const storageKey = storageService.generateKey('documents', file.originalname);
      const storageResult = await storageService.uploadFromPath(
        file.path,
        storageKey,
        file.mimetype
      );

      // Insert document record
      const result = await db.query(`
        INSERT INTO documents (
          organization_id, title, category, employee_id, uploaded_by,
          file_name, file_path, file_type, file_size, mime_type,
          storage_key, signature_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        organizationId,
        title,
        category || 'other',
        employeeId,
        userId,
        file.originalname,
        storageResult.url,
        fileType,
        file.size,
        file.mimetype,
        storageResult.key,
        requiresSignature === 'true' || requiresSignature === true ? 'pending' : 'none'
      ]);

      res.status(201).json({
        document: result.rows[0],
        message: 'Document uploaded successfully'
      });
    } catch (error) {
      console.error('Failed to upload document:', error);
      if (req.file) cleanupOnError(req.file);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }
);

// ==================== DOCUMENT DOWNLOAD ====================

// Download/view document
router.get('/:id/download', async (req, res) => {
  try {
    const { organizationId, role, employeeId } = req.user;

    const result = await db.query(`
      SELECT d.*, e.id as assigned_employee_id
      FROM documents d
      LEFT JOIN employees e ON e.id = d.employee_id
      WHERE d.id = $1 AND d.organization_id = $2
    `, [req.params.id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = result.rows[0];

    // Access control
    if (role === 'worker' && doc.assigned_employee_id !== employeeId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get file URL from storage service
    if (doc.storage_key) {
      const url = await storageService.getUrl(doc.storage_key);

      // If using S3, redirect to signed URL
      if (storageService.useS3) {
        return res.redirect(url);
      }

      // Local file - stream it
      const filePath = path.join(UPLOAD_DIR, doc.storage_key);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on disk' });
      }

      res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } else {
      return res.status(404).json({ error: 'File path not found' });
    }
  } catch (error) {
    console.error('Failed to download document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// ==================== E-SIGNATURE ====================

// Sign a document
router.post('/:documentId/sign', async (req, res) => {
  try {
    const { organizationId, employeeId, userId } = req.user;
    const { documentId } = req.params;
    const { signature, signatureImage, agreedAt } = req.body;

    if (!signature && !signatureImage) {
      return res.status(400).json({ error: 'Signature is required' });
    }

    // Get the document
    const docResult = await db.query(`
      SELECT * FROM documents
      WHERE id = $1 AND organization_id = $2
    `, [documentId, organizationId]);

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docResult.rows[0];

    // Verify the employee is authorized to sign this document
    if (doc.employee_id !== employeeId) {
      return res.status(403).json({ error: 'You are not authorized to sign this document' });
    }

    // Check if already signed
    if (doc.signature_status === 'signed') {
      return res.status(400).json({ error: 'Document is already signed' });
    }

    // Get IP address from request
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] ||
                      req.socket?.remoteAddress ||
                      'unknown';

    // Create signature record in a transaction
    const result = await db.transaction(async (client) => {
      // Insert signature record
      await client.query(`
        INSERT INTO document_signatures (
          document_id, employee_id, signature_text, signature_image, signed_at, agreed_at, ip_address
        )
        VALUES ($1, $2, $3, $4, NOW(), $5, $6)
      `, [
        documentId,
        employeeId,
        signature || 'Signed electronically',
        signatureImage || null,
        agreedAt || new Date().toISOString(),
        ipAddress
      ]);

      // Update document status
      const updated = await client.query(`
        UPDATE documents
        SET signature_status = 'signed', signed_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [documentId]);

      return updated.rows[0];
    });

    // Get complete document with signature info
    const complete = await db.query(`
      SELECT d.*,
             e.first_name || ' ' || e.last_name as employee_name,
             ds.signature_text,
             ds.signature_image,
             ds.signed_at,
             ds.ip_address as signature_ip,
             ds.agreed_at
      FROM documents d
      LEFT JOIN employees e ON e.id = d.employee_id
      LEFT JOIN document_signatures ds ON ds.document_id = d.id
      WHERE d.id = $1
    `, [documentId]);

    res.json({
      document: complete.rows[0],
      message: 'Document signed successfully'
    });
  } catch (error) {
    console.error('Failed to sign document:', error);
    res.status(500).json({ error: 'Failed to sign document' });
  }
});

// Get signature details (admin/manager only)
router.get('/:documentId/signature', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { documentId } = req.params;

    const result = await db.query(`
      SELECT ds.id, ds.document_id, ds.employee_id, ds.signature_text, ds.signature_image,
             ds.signed_at, ds.agreed_at, ds.ip_address, ds.user_agent, ds.verification_hash, ds.created_at,
             e.first_name || ' ' || e.last_name as signer_name,
             e.email as signer_email,
             d.title as document_title
      FROM document_signatures ds
      JOIN employees e ON e.id = ds.employee_id
      JOIN documents d ON d.id = ds.document_id
      WHERE ds.document_id = $1 AND d.organization_id = $2
    `, [documentId, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Signature not found' });
    }

    res.json({ signature: result.rows[0] });
  } catch (error) {
    console.error('Failed to get signature:', error);
    res.status(500).json({ error: 'Failed to get signature' });
  }
});

// ==================== DOCUMENT MANAGEMENT ====================

// Update document metadata
router.patch('/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { title, category, employeeId, requiresSignature } = req.body;

    const updates = [];
    const values = [req.params.id, organizationId];
    let paramIndex = 3;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }

    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }

    if (employeeId !== undefined) {
      updates.push(`employee_id = $${paramIndex++}`);
      values.push(employeeId);
    }

    if (requiresSignature !== undefined) {
      updates.push(`signature_status = $${paramIndex++}`);
      values.push(requiresSignature ? 'pending' : 'none');
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = NOW()');

    const result = await db.query(`
      UPDATE documents
      SET ${updates.join(', ')}
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document: result.rows[0] });
  } catch (error) {
    console.error('Failed to update document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
router.delete('/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Get document first to delete file
    const doc = await db.query(`
      SELECT * FROM documents WHERE id = $1 AND organization_id = $2
    `, [req.params.id, organizationId]);

    if (doc.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from storage
    if (doc.rows[0].storage_key) {
      try {
        await storageService.remove(doc.rows[0].storage_key);
      } catch (err) {
        console.warn('Failed to delete file from storage:', err);
      }
    }

    // Delete signature records first (foreign key)
    await db.query(`DELETE FROM document_signatures WHERE document_id = $1`, [req.params.id]);

    // Delete document record
    await db.query(`DELETE FROM documents WHERE id = $1`, [req.params.id]);

    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('Failed to delete document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ==================== PENDING SIGNATURES ====================

// Get pending signatures (admin/manager)
router.get('/signatures/pending', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    const result = await db.query(`
      SELECT d.id, d.title, d.category, d.created_at as sent_date,
             e.first_name || ' ' || e.last_name as employee_name,
             e.id as employee_id,
             EXTRACT(DAY FROM NOW() - d.created_at)::integer as days_pending
      FROM documents d
      JOIN employees e ON e.id = d.employee_id
      WHERE d.organization_id = $1 AND d.signature_status = 'pending'
      ORDER BY d.created_at ASC
    `, [organizationId]);

    res.json({ pendingSignatures: result.rows });
  } catch (error) {
    console.error('Failed to get pending signatures:', error);
    res.status(500).json({ error: 'Failed to get pending signatures' });
  }
});

// Send signature reminder
router.post('/:documentId/remind', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { documentId } = req.params;

    // Get document and employee info
    const result = await db.query(`
      SELECT d.*, e.email, e.first_name
      FROM documents d
      JOIN employees e ON e.id = d.employee_id
      JOIN users u ON u.id = e.user_id
      WHERE d.id = $1 AND d.organization_id = $2 AND d.signature_status = 'pending'
    `, [documentId, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or already signed' });
    }

    // In production, this would send an email notification
    // For now, just log and return success
    console.log(`[Documents] Reminder sent for document ${documentId} to ${result.rows[0].email}`);

    res.json({ success: true, message: 'Reminder sent' });
  } catch (error) {
    console.error('Failed to send reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

export default router;
