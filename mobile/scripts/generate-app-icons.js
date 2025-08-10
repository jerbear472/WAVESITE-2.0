const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// iOS Icon sizes
const iosIcons = [
  { size: 20, scale: 2, name: 'Icon-20@2x.png' },
  { size: 20, scale: 3, name: 'Icon-20@3x.png' },
  { size: 29, scale: 2, name: 'Icon-29@2x.png' },
  { size: 29, scale: 3, name: 'Icon-29@3x.png' },
  { size: 40, scale: 2, name: 'Icon-40@2x.png' },
  { size: 40, scale: 3, name: 'Icon-40@3x.png' },
  { size: 60, scale: 2, name: 'Icon-60@2x.png' },
  { size: 60, scale: 3, name: 'Icon-60@3x.png' },
  { size: 1024, scale: 1, name: 'Icon-1024.png' },
];

// Android Icon sizes
const androidIcons = [
  { size: 36, folder: 'mipmap-ldpi', name: 'ic_launcher.png' },
  { size: 48, folder: 'mipmap-mdpi', name: 'ic_launcher.png' },
  { size: 72, folder: 'mipmap-hdpi', name: 'ic_launcher.png' },
  { size: 96, folder: 'mipmap-xhdpi', name: 'ic_launcher.png' },
  { size: 144, folder: 'mipmap-xxhdpi', name: 'ic_launcher.png' },
  { size: 192, folder: 'mipmap-xxxhdpi', name: 'ic_launcher.png' },
];

const androidRoundIcons = [
  { size: 36, folder: 'mipmap-ldpi', name: 'ic_launcher_round.png' },
  { size: 48, folder: 'mipmap-mdpi', name: 'ic_launcher_round.png' },
  { size: 72, folder: 'mipmap-hdpi', name: 'ic_launcher_round.png' },
  { size: 96, folder: 'mipmap-xhdpi', name: 'ic_launcher_round.png' },
  { size: 144, folder: 'mipmap-xxhdpi', name: 'ic_launcher_round.png' },
  { size: 192, folder: 'mipmap-xxxhdpi', name: 'ic_launcher_round.png' },
];

async function generateIcons() {
  const sourceImage = path.join(__dirname, '../src/assets/images/logo2.png');
  
  if (!fs.existsSync(sourceImage)) {
    console.error('❌ Source image not found at:', sourceImage);
    console.log('Creating a default WaveSight icon...');
    await createDefaultIcon(sourceImage);
  }

  console.log('🎨 Generating app icons for WaveSight...');

  // Generate iOS icons
  console.log('📱 Generating iOS icons...');
  const iosIconPath = path.join(__dirname, '../ios/mobile/Images.xcassets/AppIcon.appiconset');
  
  for (const icon of iosIcons) {
    const outputPath = path.join(iosIconPath, icon.name);
    const size = icon.size * icon.scale;
    
    await sharp(sourceImage)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(outputPath);
    
    console.log(`  ✅ Generated ${icon.name} (${size}x${size})`);
  }

  // Generate Android icons
  console.log('🤖 Generating Android icons...');
  const androidPath = path.join(__dirname, '../android/app/src/main/res');
  
  for (const icon of androidIcons) {
    const folderPath = path.join(androidPath, icon.folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    const outputPath = path.join(folderPath, icon.name);
    
    await sharp(sourceImage)
      .resize(icon.size, icon.size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(outputPath);
    
    console.log(`  ✅ Generated ${icon.folder}/${icon.name} (${icon.size}x${icon.size})`);
  }

  // Generate round icons for Android
  console.log('🤖 Generating Android round icons...');
  for (const icon of androidRoundIcons) {
    const folderPath = path.join(androidPath, icon.folder);
    const outputPath = path.join(folderPath, icon.name);
    
    const roundedCorners = Buffer.from(
      `<svg width="${icon.size}" height="${icon.size}">
        <rect x="0" y="0" width="${icon.size}" height="${icon.size}" rx="${icon.size/2}" ry="${icon.size/2}"/>
      </svg>`
    );
    
    await sharp(sourceImage)
      .resize(icon.size, icon.size, {
        fit: 'cover'
      })
      .composite([{
        input: roundedCorners,
        blend: 'dest-in'
      }])
      .png()
      .toFile(outputPath);
    
    console.log(`  ✅ Generated ${icon.folder}/${icon.name} (${icon.size}x${icon.size} round)`);
  }

  console.log('\n✨ All icons generated successfully!');
}

async function createDefaultIcon(outputPath) {
  const size = 1024;
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#bg)" rx="180"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="400" font-weight="bold" 
            fill="white" text-anchor="middle" dominant-baseline="central">W</text>
    </svg>
  `;
  
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  
  console.log('✅ Created default WaveSight icon');
}

generateIcons().catch(console.error);