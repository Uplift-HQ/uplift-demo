import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware } from '../middleware/index.js';
import { emailService } from '../services/email.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// =============================================================================
// CONTRACT TEMPLATES
// =============================================================================

// List templates for organization
router.get('/templates', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, variables, created_at, updated_at
       FROM contract_templates
       WHERE organization_id = $1
       ORDER BY name ASC`,
      [req.user.organization_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// Get single template
router.get('/templates/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, content_html, variables, created_at, updated_at
       FROM contract_templates
       WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organization_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create template
router.post('/templates', async (req, res) => {
  try {
    const { name, content_html, variables } = req.body;
    if (!name || !content_html) {
      return res.status(400).json({ error: 'Name and content_html are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO contract_templates (organization_id, name, content_html, variables)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, content_html, variables, created_at, updated_at`,
      [req.user.organization_id, name, content_html, JSON.stringify(variables || [])]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/templates/:id', async (req, res) => {
  try {
    const { name, content_html, variables } = req.body;
    const updates = [];
    const values = [req.params.id, req.user.organization_id];
    let paramIndex = 3;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (content_html !== undefined) {
      updates.push(`content_html = $${paramIndex++}`);
      values.push(content_html);
    }
    if (variables !== undefined) {
      updates.push(`variables = $${paramIndex++}`);
      values.push(JSON.stringify(variables));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');

    const { rows } = await db.query(
      `UPDATE contract_templates
       SET ${updates.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING id, name, content_html, variables, created_at, updated_at`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/templates/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM contract_templates
       WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organization_id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// =============================================================================
// CONTRACTS
// =============================================================================

// List contracts for organization
router.get('/', async (req, res) => {
  try {
    const { employee_id, status, template_id } = req.query;
    let query = `
      SELECT c.id, c.name, c.status, c.sent_at, c.viewed_at, c.signed_at,
             c.expires_at, c.document_url, c.created_at, c.updated_at,
             e.id as employee_id, e.first_name, e.last_name, e.email as employee_email,
             ct.id as template_id, ct.name as template_name
      FROM contracts c
      JOIN employees e ON c.employee_id = e.id
      LEFT JOIN contract_templates ct ON c.template_id = ct.id
      WHERE c.organization_id = $1
    `;
    const values = [req.user.organization_id];
    let paramIndex = 2;

    if (employee_id) {
      query += ` AND c.employee_id = $${paramIndex++}`;
      values.push(employee_id);
    }
    if (status) {
      query += ` AND c.status = $${paramIndex++}`;
      values.push(status);
    }
    if (template_id) {
      query += ` AND c.template_id = $${paramIndex++}`;
      values.push(template_id);
    }

    query += ' ORDER BY c.created_at DESC';

    const { rows } = await db.query(query, values);

    // Transform to include employee object
    const contracts = rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      sent_at: row.sent_at,
      viewed_at: row.viewed_at,
      signed_at: row.signed_at,
      expires_at: row.expires_at,
      document_url: row.document_url,
      created_at: row.created_at,
      updated_at: row.updated_at,
      employee: {
        id: row.employee_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.employee_email,
      },
      template: row.template_id ? {
        id: row.template_id,
        name: row.template_name,
      } : null,
    }));

    res.json(contracts);
  } catch (error) {
    console.error('Error listing contracts:', error);
    res.status(500).json({ error: 'Failed to list contracts' });
  }
});

// Get single contract
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*,
              e.first_name, e.last_name, e.email as employee_email,
              ct.name as template_name
       FROM contracts c
       JOIN employees e ON c.employee_id = e.id
       LEFT JOIN contract_templates ct ON c.template_id = ct.id
       WHERE c.id = $1 AND c.organization_id = $2`,
      [req.params.id, req.user.organization_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const row = rows[0];
    res.json({
      ...row,
      employee: {
        id: row.employee_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.employee_email,
      },
      template: row.template_id ? {
        id: row.template_id,
        name: row.template_name,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

// Create contract from template
router.post('/', async (req, res) => {
  try {
    const { template_id, employee_id, name, content_html, expires_at } = req.body;

    if (!employee_id) {
      return res.status(400).json({ error: 'employee_id is required' });
    }

    // Verify employee exists and belongs to org
    const { rows: empRows } = await db.query(
      `SELECT id, first_name, last_name, email FROM employees WHERE id = $1 AND organization_id = $2`,
      [employee_id, req.user.organization_id]
    );
    if (empRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const employee = empRows[0];

    let finalContent = content_html || '';
    let finalName = name || '';

    // If template provided, use its content
    if (template_id) {
      const { rows: templateRows } = await db.query(
        `SELECT name, content_html FROM contract_templates WHERE id = $1 AND organization_id = $2`,
        [template_id, req.user.organization_id]
      );
      if (templateRows.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }
      const template = templateRows[0];
      finalContent = finalContent || template.content_html;
      finalName = finalName || template.name;

      // Replace common variables
      finalContent = finalContent
        .replace(/\{\{employee_name\}\}/g, `${employee.first_name} ${employee.last_name}`)
        .replace(/\{\{employee_first_name\}\}/g, employee.first_name)
        .replace(/\{\{employee_last_name\}\}/g, employee.last_name)
        .replace(/\{\{employee_email\}\}/g, employee.email || '')
        .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('en-GB'))
        .replace(/\{\{year\}\}/g, new Date().getFullYear().toString());
    }

    if (!finalContent || !finalName) {
      return res.status(400).json({ error: 'Either template_id or both name and content_html are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO contracts (organization_id, template_id, employee_id, name, content_html, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.organization_id, template_id || null, employee_id, finalName, finalContent, expires_at || null]
    );

    res.status(201).json({
      ...rows[0],
      employee: {
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
      },
    });
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: 'Failed to create contract' });
  }
});

// Update contract
router.put('/:id', async (req, res) => {
  try {
    const { name, content_html, status, expires_at } = req.body;
    const updates = [];
    const values = [req.params.id, req.user.organization_id];
    let paramIndex = 3;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (content_html !== undefined) {
      updates.push(`content_html = $${paramIndex++}`);
      values.push(content_html);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (expires_at !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      values.push(expires_at);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');

    const { rows } = await db.query(
      `UPDATE contracts
       SET ${updates.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({ error: 'Failed to update contract' });
  }
});

// Delete contract
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM contracts
       WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organization_id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({ error: 'Failed to delete contract' });
  }
});

// Send contract to employee
router.post('/:id/send', async (req, res) => {
  try {
    // Get contract with employee info
    const { rows } = await db.query(
      `SELECT c.*, e.email, e.first_name, e.last_name, o.name as org_name
       FROM contracts c
       JOIN employees e ON c.employee_id = e.id
       JOIN organizations o ON c.organization_id = o.id
       WHERE c.id = $1 AND c.organization_id = $2`,
      [req.params.id, req.user.organization_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const contract = rows[0];

    if (!contract.email) {
      return res.status(400).json({ error: 'Employee has no email address' });
    }

    // Generate signing link (in production, this would be a unique token)
    const signingLink = `${process.env.PORTAL_URL || 'https://portal.uplift.app'}/contracts/sign/${contract.id}`;

    // Send email
    await emailService.sendNotification(contract.email, {
      title: `Contract: ${contract.name} - Action Required`,
      body: `Hello ${contract.first_name},\n\nYou have a new contract from ${contract.org_name} that requires your signature.\n\nContract: ${contract.name}\n\nThis link will expire ${contract.expires_at ? `on ${new Date(contract.expires_at).toLocaleDateString()}` : 'in 30 days'}.`,
      actionUrl: signingLink,
    });

    // Update contract status
    const { rows: updated } = await db.query(
      `UPDATE contracts
       SET status = 'sent', sent_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [contract.id]
    );

    res.json({
      success: true,
      contract: updated[0],
      sent_to: contract.email,
    });
  } catch (error) {
    console.error('Error sending contract:', error);
    res.status(500).json({ error: 'Failed to send contract' });
  }
});

// Employee views contract (called when they open the link)
router.post('/:id/view', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE contracts
       SET status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END,
           viewed_at = COALESCE(viewed_at, NOW()),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error marking contract viewed:', error);
    res.status(500).json({ error: 'Failed to update contract' });
  }
});

// Employee signs contract
router.post('/:id/sign', async (req, res) => {
  try {
    const { signature_data } = req.body;

    const { rows } = await db.query(
      `UPDATE contracts
       SET status = 'signed',
           signed_at = NOW(),
           signature_data = $2,
           updated_at = NOW()
       WHERE id = $1 AND status IN ('sent', 'viewed')
       RETURNING *`,
      [req.params.id, JSON.stringify(signature_data || {})]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found or already signed' });
    }

    res.json({
      success: true,
      contract: rows[0],
    });
  } catch (error) {
    console.error('Error signing contract:', error);
    res.status(500).json({ error: 'Failed to sign contract' });
  }
});

// =============================================================================
// DOCUMENT CHASES
// =============================================================================

// List chases for organization
router.get('/chases', async (req, res) => {
  try {
    const { contract_id } = req.query;
    let query = `
      SELECT dc.*, c.name as contract_name,
             e.first_name, e.last_name
      FROM document_chases dc
      JOIN contracts c ON dc.contract_id = c.id
      JOIN employees e ON c.employee_id = e.id
      WHERE dc.organization_id = $1
    `;
    const values = [req.user.organization_id];

    if (contract_id) {
      query += ' AND dc.contract_id = $2';
      values.push(contract_id);
    }

    query += ' ORDER BY dc.sent_at DESC';

    const { rows } = await db.query(query, values);
    res.json(rows);
  } catch (error) {
    console.error('Error listing chases:', error);
    res.status(500).json({ error: 'Failed to list chases' });
  }
});

// Send chase reminder
router.post('/chases/:contractId', async (req, res) => {
  try {
    const { message_type = 'email' } = req.body;

    // Get contract with employee info
    const { rows: contractRows } = await db.query(
      `SELECT c.*, e.email, e.phone, e.first_name, e.last_name, o.name as org_name
       FROM contracts c
       JOIN employees e ON c.employee_id = e.id
       JOIN organizations o ON c.organization_id = o.id
       WHERE c.id = $1 AND c.organization_id = $2`,
      [req.params.contractId, req.user.organization_id]
    );

    if (contractRows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const contract = contractRows[0];

    if (contract.status === 'signed') {
      return res.status(400).json({ error: 'Contract is already signed' });
    }

    const recipient = message_type === 'sms' ? contract.phone : contract.email;
    if (!recipient) {
      return res.status(400).json({ error: `Employee has no ${message_type === 'sms' ? 'phone number' : 'email address'}` });
    }

    const signingLink = `${process.env.PORTAL_URL || 'https://portal.uplift.app'}/contracts/sign/${contract.id}`;
    const messagePreview = `Reminder: Please sign your contract "${contract.name}" from ${contract.org_name}`;

    if (message_type === 'email') {
      await emailService.sendNotification(contract.email, {
        title: `Reminder: Contract "${contract.name}" Awaiting Signature`,
        body: `Hello ${contract.first_name},\n\nThis is a friendly reminder that your contract "${contract.name}" from ${contract.org_name} is still awaiting your signature.\n\nPlease review and sign at your earliest convenience.`,
        actionUrl: signingLink,
      });
    }
    // SMS sending would be implemented here with a service like Twilio

    // Record the chase
    const { rows } = await db.query(
      `INSERT INTO document_chases (organization_id, contract_id, message_type, recipient, message_preview)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.organization_id, contract.id, message_type, recipient, messagePreview]
    );

    res.status(201).json({
      success: true,
      chase: rows[0],
    });
  } catch (error) {
    console.error('Error sending chase:', error);
    res.status(500).json({ error: 'Failed to send chase' });
  }
});

// Get chase count for unsigned contracts (useful for dashboard)
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'draft') as draft,
         COUNT(*) FILTER (WHERE status = 'sent') as sent,
         COUNT(*) FILTER (WHERE status = 'viewed') as viewed,
         COUNT(*) FILTER (WHERE status = 'signed') as signed,
         COUNT(*) FILTER (WHERE status IN ('sent', 'viewed') AND expires_at < NOW()) as expired
       FROM contracts
       WHERE organization_id = $1`,
      [req.user.organization_id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
