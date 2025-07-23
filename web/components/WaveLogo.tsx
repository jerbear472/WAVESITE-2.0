'use client'

import React from 'react'
import Image from 'next/image'

interface WaveLogoProps {
  size?: number
  className?: string
  animated?: boolean
  showTitle?: boolean
}

export default function WaveLogo({ size = 60, className = '', animated = false, showTitle = true }: WaveLogoProps) {
  return (
    <div className={`logo-container ${className}`}>
      <div 
        className={`relative logo-wrapper ${animated ? 'logo-animated' : ''}`} 
        style={{ width: size, height: size }}
      >
        <div className="logo-glow-effect"></div>
        <div className="rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm">
          <Image
            src="/logo2.png"
            alt="WaveSite Logo"
            width={size}
            height={size}
            className="object-cover logo-image w-full h-full"
            priority
          />
        </div>
        <div className="logo-shine"></div>
      </div>
      {showTitle && (
        <h1 className="logo-title">
          <span className="logo-text">WAVESITE</span>
          <span className="logo-subtitle">Next Generation Analytics</span>
        </h1>
      )}
      <style jsx>{`
        .logo-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .logo-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-glow-effect {
          position: absolute;
          inset: -20%;
          background: radial-gradient(circle, rgba(192, 192, 192, 0.3) 0%, transparent 70%);
          filter: blur(20px);
          animation: pulse-glow 3s ease-in-out infinite;
        }

        .logo-image {
          position: relative;
          z-index: 2;
          transition: transform 0.3s ease;
        }

        .logo-wrapper:hover .logo-image {
          transform: scale(1.05);
        }

        .logo-shine {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent 30%,
            rgba(255, 255, 255, 0.1) 50%,
            transparent 70%
          );
          animation: shine 3s infinite;
          pointer-events: none;
        }

        .logo-animated .logo-image {
          animation: float 3s ease-in-out infinite;
        }

        .logo-title {
          text-align: center;
          position: relative;
        }

        .logo-text {
          display: block;
          font-size: 2.5rem;
          font-weight: 300;
          letter-spacing: 0.5rem;
          background: linear-gradient(135deg, #ffffff 0%, #c0c0c0 50%, #ffffff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 2px 10px rgba(192, 192, 192, 0.3);
          animation: gradient-shift 5s ease infinite;
          background-size: 200% 200%;
        }

        .logo-subtitle {
          display: block;
          font-size: 0.875rem;
          font-weight: 200;
          letter-spacing: 0.2rem;
          color: rgba(192, 192, 192, 0.8);
          margin-top: 0.5rem;
          text-transform: uppercase;
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }

        @keyframes shine {
          0% {
            transform: translateX(-100%) translateY(-100%) rotate(45deg);
          }
          100% {
            transform: translateX(100%) translateY(100%) rotate(45deg);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @media (max-width: 768px) {
          .logo-text {
            font-size: 2rem;
            letter-spacing: 0.3rem;
          }
          
          .logo-subtitle {
            font-size: 0.75rem;
            letter-spacing: 0.1rem;
          }
        }
      `}</style>
    </div>
  )
}