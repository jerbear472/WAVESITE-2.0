const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [
  { size: 20, scale: 2 },
  { size: 20, scale: 3 },
  { size: 29, scale: 2 },
  { size: 29, scale: 3 },
  { size: 40, scale: 2 },
  { size: 40, scale: 3 },
  { size: 60, scale: 2 },
  { size: 60, scale: 3 },
  { size: 1024, scale: 1 }
];

async function generateAllIcons() {
  const logoPath = path.join(__dirname, '..', 'logo2.png');
  const outputDir = path.join(__dirname, 'ios', 'mobile', 'Images.xcassets', 'AppIcon.appiconset');
  
  console.log('Reading logo from:', logoPath);
  
  for (const { size, scale } of sizes) {
    const actualSize = size * scale;
    const filename = scale === 1 ? `Icon-${size}.png` : `Icon-${size}@${scale}x.png`;
    const outputPath = path.join(outputDir, filename);
    
    try {
      await sharp(logoPath)
        .resize(actualSize, actualSize, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(outputPath);
      
      console.log(`Generated ${filename} (${actualSize}x${actualSize})`);
    } catch (error) {
      console.error(`Error generating ${filename}:`, error);
    }
  }
  
  // Update Contents.json
  const contentsJson = {
    images: sizes.map(({ size, scale }) => ({
      size: `${size}x${size}`,
      idiom: size === 1024 ? 'ios-marketing' : 'iphone',
      filename: scale === 1 ? `Icon-${size}.png` : `Icon-${size}@${scale}x.png`,
      scale: `${scale}x`
    })),
    info: {
      version: 1,
      author: 'xcode'
    }
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
  
  console.log('All icons generated successfully from logo2.png!');
}

generateAllIcons().catch(console.error);