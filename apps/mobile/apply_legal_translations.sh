#!/bin/bash
# Run this script to apply legal translations to all locale files
# Usage: bash apply_legal_translations.sh
cd "$(dirname "$0")"
node prep_locales.js
echo "Legal translations applied to es, it, pt, nl"
echo ""
echo "For the remaining locales, run: node apply_remaining.js"
