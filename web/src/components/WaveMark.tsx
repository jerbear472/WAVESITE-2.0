"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

// The WaveSight mark — a wave gaining amplitude, drawn as a single gradient
// stroke. Vector-native: crisp at 16px or 600px, and can draw itself in.
// Geometry is generated (growing-amplitude sine); public/wavesight-mark.svg
// is the standalone export of the same path.

const D =
  "M 7.0 25.6 L 8.2 24.3 L 9.5 23.0 L 10.8 21.8 L 12.0 20.6 L 13.2 19.5 L 14.5 18.7 L 15.8 18.1 L 17.0 17.8 L 18.2 17.8 L 19.5 18.1 L 20.8 18.7 L 22.0 19.6 L 23.2 20.8 L 24.5 22.3 L 25.8 23.9 L 27.0 25.6 L 28.2 27.5 L 29.5 29.3 L 30.8 31.0 L 32.0 32.6 L 33.2 34.0 L 34.5 35.1 L 35.8 35.8 L 37.0 36.2 L 38.2 36.2 L 39.5 35.7 L 40.8 34.8 L 42.0 33.6 L 43.2 32.0 L 44.5 30.1 L 45.8 27.9 L 47.0 25.7 L 48.2 23.3 L 49.5 21.0 L 50.8 18.8 L 52.0 16.8 L 53.2 15.1 L 54.5 13.7 L 55.8 12.8 L 57.0 12.4 L 58.2 12.5 L 59.5 13.1 L 60.8 14.2 L 62.0 15.8 L 63.2 17.8 L 64.5 20.2 L 65.8 22.8 L 67.0 25.6 L 68.2 28.5 L 69.5 31.4 L 70.8 34.0 L 72.0 36.5 L 73.2 38.5 L 74.5 40.1 L 75.8 41.1 L 77.0 41.6 L 78.2 41.5 L 79.5 40.7 L 80.8 39.3 L 82.0 37.4 L 83.2 35.0 L 84.5 32.1 L 85.8 29.0 L 87.0 25.7 L 88.2 22.2 L 89.5 18.9 L 90.8 15.8 L 92.0 12.9 L 93.2 10.6 L 94.5 8.7 L 95.8 7.5 L 97.0 7.0 L 98.2 7.2 L 99.5 8.1 L 100.8 9.7 L 102.0 12.0 L 103.2 14.8 L 104.5 18.1 L 105.8 21.8 L 107.0 25.6";

export function WaveMark({
  className,
  animated = false,
  title,
}: {
  className?: string;
  /** Draw the stroke in on mount (use for hero moments, not nav). */
  animated?: boolean;
  title?: string;
}) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 114 49"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={cn("block", className)}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#35bdf2" />
          <stop offset="1" stopColor="#3478f6" />
        </linearGradient>
      </defs>
      <path
        d={D}
        stroke={`url(#${id})`}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={animated ? "ws-draw" : undefined}
      />
    </svg>
  );
}
