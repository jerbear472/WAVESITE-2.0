#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw
import numpy as np

def create_wave_icon(size):
    # Create a new image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background with rounded corners
    radius = int(size * 0.22)
    
    # Draw rounded rectangle background
    draw.rounded_rectangle([(0, 0), (size, size)], radius=radius, fill=(0, 0, 0, 255))
    
    # Wave parameters
    padding = int(size * 0.15)
    wave_width = int((size - padding * 2) / 4)
    wave_height = size - padding * 2
    amplitude = wave_width * 0.8
    frequency = 3.5
    center_x = size / 2
    
    # Generate wave points
    points = []
    num_points = 200
    
    for i in range(num_points + 1):
        t = i / num_points
        angle = t * np.pi * 2 * frequency
        x = center_x + np.cos(angle) * amplitude
        y = padding + t * wave_height
        points.append((x, y))
    
    # Draw main wave with gradient effect
    line_width = int(wave_width * 0.8)
    
    # Simulate gradient by drawing multiple lines with different colors
    colors = [
        (96, 181, 255),   # Light blue
        (46, 134, 255),   # Medium blue
        (27, 95, 204),    # Dark blue
    ]
    
    for j, color in enumerate(colors):
        offset = j * (line_width // len(colors))
        for i in range(len(points) - 1):
            x1, y1 = points[i]
            x2, y2 = points[i + 1]
            draw.line([(x1 + offset/2, y1), (x2 + offset/2, y2)], 
                     fill=color + (255,), width=line_width // len(colors))
    
    # Add highlight for 3D effect
    highlight_points = []
    for i in range(num_points + 1):
        t = i / num_points
        angle = t * np.pi * 2 * frequency
        x = center_x + np.cos(angle) * amplitude - wave_width * 0.1
        y = padding + t * wave_height - wave_width * 0.1
        highlight_points.append((x, y))
    
    # Draw highlight
    for i in range(len(highlight_points) - 1):
        x1, y1 = highlight_points[i]
        x2, y2 = highlight_points[i + 1]
        draw.line([(x1, y1), (x2, y2)], 
                 fill=(255, 255, 255, 77), width=int(wave_width * 0.2))
    
    return img

# Icon sizes for iOS
sizes = [
    (40, 2, 'Icon-40@2x.png'),
    (40, 3, 'Icon-40@3x.png'),
    (60, 2, 'Icon-60@2x.png'),
    (60, 3, 'Icon-60@3x.png'),
    (29, 2, 'Icon-29@2x.png'),
    (29, 3, 'Icon-29@3x.png'),
    (20, 2, 'Icon-20@2x.png'),
    (20, 3, 'Icon-20@3x.png'),
    (1024, 1, 'Icon-1024.png')
]

output_dir = 'ios/mobile/Images.xcassets/AppIcon.appiconset'

for base_size, scale, filename in sizes:
    actual_size = base_size * scale
    icon = create_wave_icon(actual_size)
    
    output_path = os.path.join(output_dir, filename)
    icon.save(output_path, 'PNG')
    print(f'Generated {filename} ({actual_size}x{actual_size})')

print('All icons generated successfully!')