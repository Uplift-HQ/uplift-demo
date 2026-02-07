const fs = require('fs');
const path = require('path');

// 1x1 orange pixel PNG as base64
const orangePixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');

// Create placeholder files
const files = [
  'assets/icon.png',
  'assets/splash.png', 
  'assets/adaptive-icon.png',
  'assets/favicon.png',
  'assets/notification-icon.png'
];

files.forEach(file => {
  fs.writeFileSync(file, orangePixel);
  console.log('Created:', file);
});

// Create empty sound file
fs.writeFileSync('assets/sounds/notification.wav', Buffer.alloc(44));
console.log('Created: assets/sounds/notification.wav');
