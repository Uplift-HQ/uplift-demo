// ============================================================
// RECEIPT OCR SERVICE
// Extract data from receipt images using Tesseract.js
// ============================================================

import path from 'path';

// Conditional Tesseract import - may not be available on all platforms
let Tesseract = null;
let ocrAvailable = false;

try {
  const tesseractModule = await import('tesseract.js');
  Tesseract = tesseractModule.default;
  ocrAvailable = true;
  console.log('[OCR] Tesseract.js loaded successfully');
} catch (error) {
  console.warn('[OCR] Tesseract.js not available - OCR features disabled:', error.message);
  ocrAvailable = false;
}

// Currency patterns for extraction
const CURRENCY_PATTERNS = {
  GBP: /£\s*([\d,]+\.?\d*)/g,
  USD: /\$\s*([\d,]+\.?\d*)/g,
  EUR: /€\s*([\d,]+\.?\d*)/g,
};

// Common total keywords
const TOTAL_KEYWORDS = [
  'total',
  'grand total',
  'amount due',
  'balance due',
  'subtotal',
  'to pay',
  'amount',
];

// Date patterns
const DATE_PATTERNS = [
  /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,           // DD/MM/YYYY, MM/DD/YYYY
  /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/gi, // 15 January 2026
  /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}/gi, // January 15, 2026
];

/**
 * Check if OCR is available
 * @returns {boolean}
 */
export function isOcrAvailable() {
  return ocrAvailable;
}

/**
 * Extract data from a receipt image
 * @param {string} imagePath - Path to the receipt image
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} Extracted receipt data
 */
export async function extractReceiptData(imagePath, options = {}) {
  // Check if OCR is available
  if (!ocrAvailable || !Tesseract) {
    return {
      success: false,
      error: 'OCR not available - Tesseract.js could not be loaded on this platform',
      rawText: null,
      extracted: {
        amount: null,
        currency: null,
        date: null,
        merchant: null,
        items: [],
      },
      suggestions: ['OCR is not available. Please enter receipt details manually.'],
    };
  }

  const { language = 'eng', expectedCurrency } = options;

  try {
    console.log(`[OCR] Processing receipt: ${imagePath}`);

    // Run OCR
    const result = await Tesseract.recognize(imagePath, language, {
      logger: m => {
        if (m.status === 'recognizing text' && m.progress) {
          // Log progress for long operations
          if (m.progress > 0.9) console.log(`[OCR] Recognition ${Math.round(m.progress * 100)}% complete`);
        }
      },
    });

    const { text, confidence } = result.data;

    // Parse the extracted text
    const extracted = parseReceiptText(text, expectedCurrency);

    return {
      success: true,
      rawText: text,
      confidence: Math.round(confidence),
      extracted,
      suggestions: generateSuggestions(extracted, confidence),
    };
  } catch (error) {
    console.error('[OCR] Extraction failed:', error.message);
    return {
      success: false,
      error: error.message,
      rawText: null,
      extracted: {
        amount: null,
        currency: null,
        date: null,
        merchant: null,
        items: [],
      },
    };
  }
}

/**
 * Parse extracted text to find receipt data
 */
function parseReceiptText(text, expectedCurrency = null) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const result = {
    amount: null,
    currency: null,
    date: null,
    merchant: null,
    items: [],
    vatAmount: null,
    paymentMethod: null,
  };

  // 1. Extract merchant name (usually first non-empty line)
  if (lines.length > 0) {
    // Look for the first substantial line that could be a business name
    for (const line of lines.slice(0, 5)) {
      if (line.length > 3 && !line.match(/^\d/) && !line.match(/^[£$€]/)) {
        result.merchant = cleanMerchantName(line);
        break;
      }
    }
  }

  // 2. Extract amounts
  const amounts = extractAmounts(text, expectedCurrency);
  if (amounts.length > 0) {
    // The largest amount near a "total" keyword is likely the total
    const totalLine = findLineWithKeyword(lines, TOTAL_KEYWORDS);
    if (totalLine) {
      const lineAmounts = extractAmounts(totalLine, expectedCurrency);
      if (lineAmounts.length > 0) {
        result.amount = lineAmounts[lineAmounts.length - 1].value; // Last amount on total line
        result.currency = lineAmounts[lineAmounts.length - 1].currency;
      }
    }

    // If no total found, use the largest amount
    if (!result.amount) {
      const largest = amounts.reduce((max, curr) =>
        curr.value > max.value ? curr : max, amounts[0]
      );
      result.amount = largest.value;
      result.currency = largest.currency;
    }
  }

  // 3. Extract date
  for (const pattern of DATE_PATTERNS) {
    const dateMatches = text.match(pattern);
    if (dateMatches && dateMatches.length > 0) {
      result.date = normalizeDate(dateMatches[0]);
      break;
    }
  }

  // 4. Extract VAT if present
  const vatLine = findLineWithKeyword(lines, ['vat', 'tax', 'gst']);
  if (vatLine) {
    const vatAmounts = extractAmounts(vatLine, result.currency);
    if (vatAmounts.length > 0) {
      result.vatAmount = vatAmounts[vatAmounts.length - 1].value;
    }
  }

  // 5. Detect payment method
  const paymentKeywords = ['visa', 'mastercard', 'amex', 'cash', 'card', 'contactless', 'apple pay', 'google pay'];
  const lowerText = text.toLowerCase();
  for (const method of paymentKeywords) {
    if (lowerText.includes(method)) {
      result.paymentMethod = method.charAt(0).toUpperCase() + method.slice(1);
      break;
    }
  }

  // 6. Try to extract line items (simplified)
  const itemPattern = /(.+?)\s+([£$€]?\d+\.?\d*)\s*$/;
  lines.forEach(line => {
    const match = line.match(itemPattern);
    if (match && !TOTAL_KEYWORDS.some(k => line.toLowerCase().includes(k))) {
      const itemName = match[1].trim();
      const itemPrice = parseFloat(match[2].replace(/[£$€,]/g, ''));
      if (itemName.length > 2 && itemPrice > 0 && itemPrice < (result.amount || 1000)) {
        result.items.push({
          name: itemName,
          price: itemPrice,
        });
      }
    }
  });

  return result;
}

/**
 * Extract all monetary amounts from text
 */
function extractAmounts(text, preferredCurrency = null) {
  const amounts = [];

  // Check each currency pattern
  for (const [currency, pattern] of Object.entries(CURRENCY_PATTERNS)) {
    let match;
    const regex = new RegExp(pattern);
    while ((match = regex.exec(text)) !== null) {
      const value = parseFloat(match[1].replace(',', ''));
      if (!isNaN(value) && value > 0) {
        amounts.push({ value, currency, raw: match[0] });
      }
    }
  }

  // Also look for bare numbers near currency symbols
  const bareAmountPattern = /(\d+\.?\d*)\s*(?:GBP|USD|EUR)/gi;
  let match;
  while ((match = bareAmountPattern.exec(text)) !== null) {
    const value = parseFloat(match[1]);
    const currency = match[0].match(/GBP|USD|EUR/i)?.[0]?.toUpperCase() || 'GBP';
    if (!isNaN(value) && value > 0) {
      amounts.push({ value, currency, raw: match[0] });
    }
  }

  // Sort by value descending
  amounts.sort((a, b) => b.value - a.value);

  // If preferred currency specified, prioritize those
  if (preferredCurrency) {
    amounts.sort((a, b) => {
      if (a.currency === preferredCurrency && b.currency !== preferredCurrency) return -1;
      if (b.currency === preferredCurrency && a.currency !== preferredCurrency) return 1;
      return b.value - a.value;
    });
  }

  return amounts;
}

/**
 * Find a line containing any of the keywords
 */
function findLineWithKeyword(lines, keywords) {
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (keywords.some(k => lower.includes(k))) {
      return line;
    }
  }
  return null;
}

/**
 * Clean up merchant name
 */
function cleanMerchantName(name) {
  // Remove common receipt noise
  return name
    .replace(/^\*+|\*+$/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100); // Limit length
}

/**
 * Normalize date to ISO format
 */
function normalizeDate(dateStr) {
  try {
    // Try parsing with Date
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    // Try DD/MM/YYYY format
    const dmyMatch = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (dmyMatch) {
      let [, day, month, year] = dmyMatch;
      if (year.length === 2) year = `20${year}`;
      // Assume UK format (DD/MM/YYYY)
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return dateStr; // Return original if can't parse
  } catch {
    return dateStr;
  }
}

/**
 * Generate suggestions based on extraction quality
 */
function generateSuggestions(extracted, confidence) {
  const suggestions = [];

  if (confidence < 50) {
    suggestions.push('Low image quality - consider re-uploading a clearer image');
  }

  if (!extracted.amount) {
    suggestions.push('Could not detect total amount - please enter manually');
  }

  if (!extracted.date) {
    suggestions.push('Could not detect date - please enter manually');
  }

  if (!extracted.merchant) {
    suggestions.push('Could not detect merchant name - please enter manually');
  }

  return suggestions;
}

/**
 * Process receipt upload and extract data
 * Called from expense routes
 */
export async function processReceiptUpload(filePath, options = {}) {
  const ext = path.extname(filePath).toLowerCase();

  // Only process image files
  const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
  if (!supportedFormats.includes(ext)) {
    return {
      success: false,
      error: `Unsupported format: ${ext}. Supported: ${supportedFormats.join(', ')}`,
      extracted: null,
    };
  }

  return extractReceiptData(filePath, options);
}

export default {
  extractReceiptData,
  processReceiptUpload,
  isOcrAvailable,
};
