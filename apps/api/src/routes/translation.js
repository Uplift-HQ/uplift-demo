// ============================================================
// TRANSLATION API ROUTES
// Language preferences and content translation
// ============================================================

import { Router } from 'express';
import { authMiddleware } from '../middleware/index.js';
import {
  getSupportedLanguages,
  getUserLanguage,
  setUserLanguage,
  translateText,
  translateBatch,
  translateFeedPost,
  detectLanguage,
  getLanguageInfo,
} from '../services/translation.js';
import { db } from '../lib/database.js';

const router = Router();

// ============================================================
// LANGUAGE SETTINGS
// ============================================================

// Get supported languages
router.get('/languages', async (req, res) => {
  try {
    const languages = getSupportedLanguages();
    res.json({
      languages,
      total: languages.length,
    });
  } catch (error) {
    console.error('Error getting languages:', error);
    res.status(500).json({ error: 'Failed to get supported languages' });
  }
});

// Get user's language preference
router.get('/preference', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const languageCode = await getUserLanguage(userId);
    const languageInfo = getLanguageInfo(languageCode);
    
    res.json({
      language: languageCode,
      ...languageInfo,
    });
  } catch (error) {
    console.error('Error getting language preference:', error);
    res.status(500).json({ error: 'Failed to get language preference' });
  }
});

// Set user's language preference
router.put('/preference', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { language } = req.body;
    
    if (!language) {
      return res.status(400).json({ error: 'Language code required' });
    }
    
    const result = await setUserLanguage(userId, language);
    const languageInfo = getLanguageInfo(language);
    
    res.json({
      ...result,
      ...languageInfo,
    });
  } catch (error) {
    console.error('Error setting language preference:', error);
    if (error.message.includes('Unsupported language')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to set language preference' });
  }
});

// ============================================================
// CONTENT TRANSLATION
// ============================================================

// Translate single text
router.post('/translate', authMiddleware, async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }
    
    if (!targetLanguage) {
      return res.status(400).json({ error: 'Target language required' });
    }
    
    const translation = await translateText(text, targetLanguage, sourceLanguage);
    
    res.json({
      original: text,
      translation,
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage,
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// Translate multiple texts
router.post('/translate/batch', authMiddleware, async (req, res) => {
  try {
    const { texts, targetLanguage, sourceLanguage } = req.body;
    
    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({ error: 'Texts array required' });
    }
    
    if (texts.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 texts per batch' });
    }
    
    if (!targetLanguage) {
      return res.status(400).json({ error: 'Target language required' });
    }
    
    const translations = await translateBatch(texts, targetLanguage, sourceLanguage);
    
    res.json({
      translations: texts.map((original, index) => ({
        original,
        translation: translations[index],
      })),
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage,
    });
  } catch (error) {
    console.error('Batch translation error:', error);
    res.status(500).json({ error: 'Batch translation failed' });
  }
});

// Detect language
router.post('/detect', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }
    
    const detectedLanguage = await detectLanguage(text);
    const languageInfo = getLanguageInfo(detectedLanguage);
    
    res.json({
      language: detectedLanguage,
      ...languageInfo,
    });
  } catch (error) {
    console.error('Language detection error:', error);
    res.status(500).json({ error: 'Language detection failed' });
  }
});

// ============================================================
// FEED TRANSLATION
// ============================================================

// Translate a feed post
router.post('/feed-post/:postId', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, organizationId } = req.user;
    const { targetLanguage } = req.body;
    
    // Get user's preferred language if not specified
    const targetLang = targetLanguage || await getUserLanguage(userId);
    
    // Fetch the post
    const postResult = await db.query(`
      SELECT 
        p.*,
        u.first_name || ' ' || u.last_name as author_name,
        u.avatar_url as author_avatar
      FROM feed_posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.id = $1 AND p.organization_id = $2
    `, [postId, organizationId]);
    
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = postResult.rows[0];
    
    // Fetch comments
    const commentsResult = await db.query(`
      SELECT 
        c.*,
        u.first_name || ' ' || u.last_name as author_name,
        u.avatar_url as author_avatar
      FROM feed_comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
    `, [postId]);
    
    post.comments = commentsResult.rows;
    
    // Translate the post and comments
    const translatedPost = await translateFeedPost(post, targetLang);
    
    res.json(translatedPost);
  } catch (error) {
    console.error('Feed translation error:', error);
    res.status(500).json({ error: 'Failed to translate post' });
  }
});

// Translate a comment
router.post('/comment/:commentId', authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId, organizationId } = req.user;
    const { targetLanguage } = req.body;
    
    const targetLang = targetLanguage || await getUserLanguage(userId);
    
    // Fetch the comment
    const result = await db.query(`
      SELECT c.*, u.first_name || ' ' || u.last_name as author_name
      FROM feed_comments c
      JOIN users u ON c.author_id = u.id
      JOIN feed_posts p ON c.post_id = p.id
      WHERE c.id = $1 AND p.organization_id = $2
    `, [commentId, organizationId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    const comment = result.rows[0];
    const translatedContent = await translateText(comment.content, targetLang);
    
    res.json({
      ...comment,
      content: translatedContent,
      originalContent: comment.content,
      isTranslated: true,
      translatedTo: targetLang,
    });
  } catch (error) {
    console.error('Comment translation error:', error);
    res.status(500).json({ error: 'Failed to translate comment' });
  }
});

// ============================================================
// ANNOUNCEMENT TRANSLATION
// ============================================================

// Translate an announcement
router.post('/announcement/:announcementId', authMiddleware, async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { userId, organizationId } = req.user;
    const { targetLanguage } = req.body;
    
    const targetLang = targetLanguage || await getUserLanguage(userId);
    
    // Fetch the announcement
    const result = await db.query(`
      SELECT * FROM announcements
      WHERE id = $1 AND organization_id = $2
    `, [announcementId, organizationId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    const announcement = result.rows[0];
    
    // Translate title and content
    const [translatedTitle, translatedContent] = await Promise.all([
      translateText(announcement.title, targetLang),
      translateText(announcement.content, targetLang),
    ]);
    
    res.json({
      ...announcement,
      title: translatedTitle,
      content: translatedContent,
      originalTitle: announcement.title,
      originalContent: announcement.content,
      isTranslated: true,
      translatedTo: targetLang,
    });
  } catch (error) {
    console.error('Announcement translation error:', error);
    res.status(500).json({ error: 'Failed to translate announcement' });
  }
});

// ============================================================
// MESSAGE TRANSLATION
// ============================================================

// Translate a message
router.post('/message/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.user;
    const { targetLanguage } = req.body;
    
    const targetLang = targetLanguage || await getUserLanguage(userId);
    
    // Fetch the message (verify user has access)
    const result = await db.query(`
      SELECT m.* FROM messages m
      JOIN message_participants mp ON m.conversation_id = mp.conversation_id
      WHERE m.id = $1 AND mp.user_id = $2
    `, [messageId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const message = result.rows[0];
    const translatedContent = await translateText(message.content, targetLang);
    
    res.json({
      ...message,
      content: translatedContent,
      originalContent: message.content,
      isTranslated: true,
      translatedTo: targetLang,
    });
  } catch (error) {
    console.error('Message translation error:', error);
    res.status(500).json({ error: 'Failed to translate message' });
  }
});

export default router;
