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

async function generateIcon(size) {
  const padding = Math.floor(size * 0.15);
  const waveWidth = Math.floor((size - padding * 2) / 4);
  const waveHeight = size - padding * 2;
  const radius = Math.floor(size * 0.22);
  
  // Create SVG with wave pattern
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#60B5FF;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#2E86FF;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1B5FCC;stop-opacity:1" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="${size * 0.02}"/>
          <feOffset dx="${size * 0.015}" dy="${size * 0.015}" result="offsetblur"/>
          <feFlood flood-color="#000000" flood-opacity="0.3"/>
          <feComposite in2="offsetblur" operator="in"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#000000"/>
      
      <path d="${generateWavePath(size, padding, waveWidth, waveHeight)}" 
            stroke="url(#waveGradient)" 
            stroke-width="${waveWidth * 0.8}" 
            fill="none" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            filter="url(#shadow)"/>
      
      <path d="${generateWavePath(size, padding, waveWidth, waveHeight, -waveWidth * 0.1)}" 
            stroke="rgba(255,255,255,0.3)" 
            stroke-width="${waveWidth * 0.15}" 
            fill="none" 
            stroke-linecap="round" 
            stroke-linejoin="round"/>
    </svg>
  `;
  
  return Buffer.from(svg);
}

function generateWavePath(size, padding, waveWidth, waveHeight, offset = 0) {
  const amplitude = waveWidth * 0.8;
  const frequency = 3.5;
  const centerX = size / 2;
  const points = [];
  
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const angle = t * Math.PI * 2 * frequency;
    const x = centerX + Math.cos(angle) * amplitude + offset;
    const y = padding + t * waveHeight + offset;
    
    if (i === 0) {
      points.push(`M ${x} ${y}`);
    } else {
      points.push(`L ${x} ${y}`);
    }
  }
  
  return points.join(' ');
}

async function generateAllIcons() {
  const outputDir = path.join(__dirname, 'ios', 'mobile', 'Images.xcassets', 'AppIcon.appiconset');
  
  for (const { size, scale } of sizes) {
    const actualSize = size * scale;
    const filename = scale === 1 ? `Icon-${size}.png` : `Icon-${size}@${scale}x.png`;
    const outputPath = path.join(outputDir, filename);
    
    try {
      const svgBuffer = await generateIcon(actualSize);
      await sharp(svgBuffer)
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
  
  console.log('All icons generated successfully!');
}

generateAllIcons().catch(console.error);