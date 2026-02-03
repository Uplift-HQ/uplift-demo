const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// CORRECT brand color from guidelines
const MOMENTUM_ORANGE = '#FF6B35';

// The Rising U SVG - from brand/uplift-app-icon.svg
const createAppIconSVG = (size) => {
  // Scale factor for the 512 viewBox to target size
  const scale = size / 512;
  const rx = Math.round(96 * scale);

  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Rounded square background -->
  <rect x="0" y="0" width="512" height="512" rx="96" ry="96" fill="${MOMENTUM_ORANGE}"/>

  <!-- White Rising U mark -->
  <path d="
    M112 136
    L112 328
    Q112 392 176 392
    L336 392
    Q400 392 400 328
    L400 232
    L352 168
    L352 328
    Q352 344 336 344
    L176 344
    Q160 344 160 328
    L160 136
    Z
  " fill="white"/>

  <!-- Rising arrow -->
  <path d="
    M352 168
    L400 232
    L448 168
    L400 104
    Z
  " fill="white"/>
</svg>`;
};

// Favicon - smaller, simpler version
const createFaviconSVG = (size) => {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="12" fill="${MOMENTUM_ORANGE}"/>
  <path d="
    M14 17
    L14 41
    Q14 49 22 49
    L42 49
    Q50 49 50 41
    L50 29
    L44 21
    L44 41
    Q44 43 42 43
    L22 43
    Q20 43 20 41
    L20 17
    Z
  " fill="white"/>
  <path d="
    M44 21
    L50 29
    L56 21
    L50 13
    Z
  " fill="white"/>
</svg>`;
};

// Splash screen with UPLIFT wordmark
const createSplashSVG = (width, height) => {
  const logoHeight = Math.min(width, height) * 0.12;

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${MOMENTUM_ORANGE}"/>

  <!-- Rising U mark centered -->
  <g transform="translate(${width/2 - 60}, ${height/2 - 80})">
    <path d="
      M0 0
      L0 48
      Q0 64 16 64
      L104 64
      Q120 64 120 48
      L120 24
      L100 0
      L100 48
      Q100 52 96 52
      L24 52
      Q20 52 20 48
      L20 0
      Z
    " fill="white"/>
    <path d="
      M100 0
      L120 24
      L140 0
      L120 -24
      Z
    " fill="white"/>
  </g>

  <!-- UPLIFT wordmark below -->
  <text
    x="50%"
    y="${height/2 + 60}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="48"
    font-weight="900"
    fill="white"
    text-anchor="middle"
    letter-spacing="8"
  >UPLIFT</text>
</svg>`;
};

async function generateIcons() {
  const assetsDir = path.join(__dirname, '..', 'assets');

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  console.log('Generating Uplift brand icons with Rising U mark...');

  // 1. App Icon (1024x1024) - iOS App Store
  await sharp(Buffer.from(createAppIconSVG(1024)))
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('✓ icon.png (1024x1024) - Rising U mark');

  // 2. Adaptive Icon (1024x1024) - Android
  await sharp(Buffer.from(createAppIconSVG(1024)))
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('✓ adaptive-icon.png (1024x1024)');

  // 3. Favicon (64x64) - Web browser
  await sharp(Buffer.from(createFaviconSVG(64)))
    .png()
    .toFile(path.join(assetsDir, 'favicon.png'));
  console.log('✓ favicon.png (64x64)');

  // 4. Notification Icon (96x96)
  await sharp(Buffer.from(createFaviconSVG(96)))
    .png()
    .toFile(path.join(assetsDir, 'notification-icon.png'));
  console.log('✓ notification-icon.png (96x96)');

  // 5. Splash Screen (1284x2778 for iPhone 14 Pro Max)
  await sharp(Buffer.from(createSplashSVG(1284, 2778)))
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
  console.log('✓ splash.png (1284x2778) - with Rising U and wordmark');

  console.log('\n✅ All icons generated with correct Rising U branding!');
  console.log(`   Brand color: ${MOMENTUM_ORANGE}`);
}

generateIcons().catch(console.error);
