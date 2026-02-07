#!/usr/bin/env node
/**
 * Sync all translation files to match the structure of en.json
 * - Keeps existing translations for keys that exist in en.json
 * - Removes stale keys not in en.json
 * - Adds missing keys with English fallback (marked for translation)
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/i18n/locales');
const enPath = path.join(localesDir, 'en.json');

// Read English source
const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Get all locale files except en.json
const localeFiles = fs.readdirSync(localesDir)
  .filter(f => f.endsWith('.json') && f !== 'en.json');

console.log(`Found ${localeFiles.length} locale files to sync`);
console.log(`English source has ${countKeys(enContent)} keys\n`);

function countKeys(obj, prefix = '') {
  let count = 0;
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      count += countKeys(obj[key], `${prefix}${key}.`);
    } else {
      count++;
    }
  }
  return count;
}

function syncObject(source, target, langCode) {
  const result = {};

  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      // Nested object - recurse
      result[key] = syncObject(
        source[key],
        (target && typeof target[key] === 'object') ? target[key] : {},
        langCode
      );
    } else {
      // Leaf value - use existing translation or fallback to English
      if (target && target[key] !== undefined) {
        result[key] = target[key];
      } else {
        // Missing translation - use English as fallback
        result[key] = source[key];
      }
    }
  }

  return result;
}

let synced = 0;
let errors = 0;

for (const file of localeFiles) {
  const filePath = path.join(localesDir, file);
  const langCode = file.replace('.json', '');

  try {
    const targetContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const beforeKeys = countKeys(targetContent);

    // Sync to match English structure
    const syncedContent = syncObject(enContent, targetContent, langCode);
    const afterKeys = countKeys(syncedContent);

    // Write synced file with proper formatting
    fs.writeFileSync(filePath, JSON.stringify(syncedContent, null, 2) + '\n');

    const removed = beforeKeys - afterKeys;
    console.log(`✓ ${file}: ${beforeKeys} → ${afterKeys} keys (removed ${removed} stale keys)`);
    synced++;
  } catch (err) {
    console.error(`✗ ${file}: ${err.message}`);
    errors++;
  }
}

console.log(`\nDone! Synced ${synced} files, ${errors} errors`);
