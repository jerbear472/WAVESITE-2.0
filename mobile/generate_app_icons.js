const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [
  { size: 20, scale: 2, name: 'Icon-20@2x.png' },
  { size: 20, scale: 3, name: 'Icon-20@3x.png' },
  { size: 29, scale: 2, name: 'Icon-29@2x.png' },
  { size: 29, scale: 3, name: 'Icon-29@3x.png' },
  { size: 40, scale: 2, name: 'Icon-40@2x.png' },
  { size: 40, scale: 3, name: 'Icon-40@3x.png' },
  { size: 60, scale: 2, name: 'Icon-60@2x.png' },
  { size: 60, scale: 3, name: 'Icon-60@3x.png' },
  { size: 1024, scale: 1, name: 'Icon-1024.png' }
];

function drawWaveIcon(ctx, size) {
  const padding = size * 0.15;
  const waveWidth = (size - padding * 2) / 4;
  const waveHeight = size - padding * 2;
  
  // Background with rounded corners
  const radius = size * 0.22;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Create gradient for the wave
  const gradient = ctx.createLinearGradient(0, padding, 0, size - padding);
  gradient.addColorStop(0, '#60B5FF');
  gradient.addColorStop(0.5, '#2E86FF');
  gradient.addColorStop(1, '#1B5FCC');

  // Draw the wave with 3D effect
  ctx.strokeStyle = gradient;
  ctx.lineWidth = waveWidth * 0.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Add shadow for 3D effect
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = size * 0.05;
  ctx.shadowOffsetX = size * 0.02;
  ctx.shadowOffsetY = size * 0.02;

  // Draw the sine wave
  ctx.beginPath();
  const amplitude = waveWidth * 0.8;
  const frequency = 3.5;
  const centerX = size / 2;
  const centerY = size / 2;
  
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const angle = t * Math.PI * 2 * frequency;
    const x = centerX + Math.cos(angle) * amplitude;
    const y = padding + t * waveHeight;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // Add highlight for 3D effect
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = waveWidth * 0.2;
  ctx.beginPath();
  
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const angle = t * Math.PI * 2 * frequency;
    const x = centerX + Math.cos(angle) * amplitude - waveWidth * 0.1;
    const y = padding + t * waveHeight - waveWidth * 0.1;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

const outputDir = path.join(__dirname, 'ios', 'mobile', 'Images.xcassets', 'AppIcon.appiconset');

sizes.forEach(({ size, scale, name }) => {
  const actualSize = size * scale;
  const canvas = createCanvas(actualSize, actualSize);
  const ctx = canvas.getContext('2d');
  
  drawWaveIcon(ctx, actualSize);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outputDir, name), buffer);
  console.log(`Generated ${name} (${actualSize}x${actualSize})`);
});

console.log('All app icons generated successfully!');