import React from 'react';

/**
 * AnimatedBackground
 * Renders the exact background design and animation shown in the reference image:
 * - Geometric "SENTINEL AI" text watermark (custom E and A characters).
 * - Circuit-style SVG lines branching left/right with glowing terminal pads and flares.
 * - Solid floating planet-like spheres in bottom-left and top-right.
 * - Concentric tech ring outlines in corners.
 * - Dot matrices (top-left and bottom-right).
 * - Floating stardust particles.
 */
const AnimatedBackground = () => {
  return (
    <>
      <style>{`
        .bg-container {
            position: fixed;
            inset: 0;
            overflow: hidden;
            z-index: -1;
            pointer-events: none;
            background: var(--bg-body-gradient, linear-gradient(
                135deg,
                #030617 0%,
                #050b2b 45%,
                #02040f 100%
            ));
        }

        .bg-grid {
            position: absolute;
            inset: 0;
            background-image:
            linear-gradient(
                rgba(255,255,255,0.02) 1px,
                transparent 1px
            ),
            linear-gradient(
                90deg,
                rgba(255,255,255,0.02) 1px,
                transparent 1px
            );
            background-size: 60px 60px;
            opacity: .18;
        }

        /* Ambient Glows */
        .orange-glow {
            position: absolute;
            top: -200px;
            left: -200px;
            width: 600px;
            height: 600px;
            border-radius: 50%;
            background: radial-gradient(
                circle,
                rgba(255,120,0,0.14),
                transparent 70%
            );
            filter: blur(80px);
            animation: ambientFloat 15s ease-in-out infinite;
        }

        .blue-glow {
            position: absolute;
            bottom: -250px;
            right: -250px;
            width: 700px;
            height: 700px;
            border-radius: 50%;
            background: radial-gradient(
                circle,
                rgba(95,90,255,0.14),
                transparent 70%
            );
            filter: blur(90px);
            animation: ambientFloat2 18s ease-in-out infinite;
        }

        /* Tech Concentric Rings in Corners */
        .tech-circle {
            position: absolute;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.035);
        }

        .circle-1a {
            width: 700px;
            height: 700px;
            top: -350px;
            left: -250px;
        }

        .circle-1b {
            width: 500px;
            height: 500px;
            top: -250px;
            left: -150px;
            border: 1px dashed rgba(255, 145, 55, 0.05);
        }

        .circle-2a {
            width: 800px;
            height: 800px;
            bottom: -450px;
            right: -300px;
        }

        .circle-2b {
            width: 580px;
            height: 580px;
            bottom: -340px;
            right: -190px;
            border: 1px dashed rgba(95, 90, 255, 0.05);
        }

        /* Solid Floating Spheres (Planets) */
        .solid-sphere {
            position: absolute;
            border-radius: 50%;
            background: radial-gradient(
                circle at 35% 35%,
                rgba(59, 130, 246, 0.22),
                rgba(29, 78, 216, 0.12) 40%,
                rgba(3, 7, 29, 0.82) 80%
            );
            box-shadow: 
                0 0 35px rgba(95, 90, 255, 0.12),
                inset -5px -5px 20px rgba(0, 0, 0, 0.7);
        }
        body.light-mode .solid-sphere {
            display: none !important;
        }

        .sphere-bl {
            width: 110px;
            height: 110px;
            bottom: 10%;
            left: 8%;
            animation: floatSphere 12s ease-in-out infinite;
        }

        .sphere-tr {
            width: 80px;
            height: 80px;
            top: 12%;
            right: 10%;
            animation: floatSphere2 14s ease-in-out infinite;
        }

        /* Dot Matrices */
        .dot-matrix {
            position: absolute;
            width: 140px;
            height: 140px;
            background-image: radial-gradient(
                rgba(255, 145, 55, 0.35) 1px,
                transparent 1px
            );
            background-size: 18px 18px;
            opacity: .28;
        }

        .matrix-1 {
            top: 70px;
            left: 70px;
        }

        .matrix-2 {
            bottom: 90px;
            right: 90px;
        }

        /* Center Branding Elements */
        .center-branding {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            max-width: 1300px;
            z-index: 1;
            opacity: 0.22; /* Faded back watermark style */
            pointer-events: none;
        }

        .circuit-left, .circuit-right {
            flex-shrink: 0;
            width: 280px;
            height: 120px;
            display: flex;
            align-items: center;
        }

        .circuit-left svg, .circuit-right svg {
            width: 100%;
            height: 100%;
        }

        .circuit-left path, .circuit-right path {
            animation: pathPulse 5s ease-in-out infinite alternate;
        }

        .circuit-left circle, .circuit-right circle {
            animation: dotPulse 2.5s ease-in-out infinite alternate;
        }

        /* Styled Brand Text */
        .sentinel-brand {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-family: 'Syne', sans-serif;
            font-size: 84px;
            font-weight: 800;
            letter-spacing: 0.16em;
            color: #ff9137;
            text-shadow: 
                0 0 25px rgba(255, 145, 55, 0.65),
                0 0 50px rgba(255, 145, 55, 0.25);
            white-space: nowrap;
            margin: 0 24px;
            animation: textGlow 6s ease-in-out infinite;
        }

        /* Custom Geometric Letters */
        .letter-e {
            display: inline-flex;
            flex-direction: column;
            justify-content: space-between;
            width: 0.52em;
            height: 0.7em;
            padding: 0.09em 0;
            margin: 0 0.04em;
            vertical-align: middle;
            position: relative;
            top: -0.06em;
        }

        .letter-e .bar {
            height: 0.075em;
            background-color: #ff9137;
            box-shadow: 0 0 12px rgba(255, 145, 55, 0.85);
            border-radius: 0.035em;
        }

        .letter-a {
            position: relative;
            width: 0.58em;
            height: 0.7em;
            margin: 0 0.04em;
            display: inline-block;
            vertical-align: middle;
            top: -0.06em;
        }

        .letter-a::before, .letter-a::after {
            content: '';
            position: absolute;
            top: 0;
            width: 0.08em;
            height: 100%;
            background-color: #ff9137;
            box-shadow: 0 0 12px rgba(255, 145, 55, 0.85);
            border-radius: 0.04em;
        }

        .letter-a::before {
            left: 0.22em;
            transform: skewX(-22deg);
            transform-origin: top;
        }

        .letter-a::after {
            right: 0.22em;
            transform: skewX(22deg);
            transform-origin: top;
        }

        /* Particles */
        .particle {
            position: absolute;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: #ff9b4d;
            box-shadow: 0 0 12px rgba(255, 155, 77, 0.8);
            opacity: .5;
        }

        .p1 { top: 35%; left: 22%; animation: floatParticle 8s ease-in-out infinite; }
        .p2 { top: 65%; left: 28%; animation: floatParticle 10s ease-in-out infinite; }
        .p3 { top: 45%; left: 42%; animation: floatParticle 9s ease-in-out infinite; }
        .p4 { top: 58%; left: 56%; animation: floatParticle 11s ease-in-out infinite; }
        .p5 { top: 28%; left: 68%; animation: floatParticle 7s ease-in-out infinite; }
        .p6 { top: 62%; left: 74%; animation: floatParticle 9s ease-in-out infinite; }
        .p7 { top: 32%; left: 82%; animation: floatParticle 10s ease-in-out infinite; }
        .p8 { top: 70%; left: 78%; animation: floatParticle 8s ease-in-out infinite; }

        /* Keyframe Animations */
        @keyframes ambientFloat {
            0% { transform: translate(0px, 0px); }
            50% { transform: translate(25px, 15px); }
            100% { transform: translate(0px, 0px); }
        }

        @keyframes ambientFloat2 {
            0% { transform: translate(0px, 0px); }
            50% { transform: translate(-25px, -15px); }
            100% { transform: translate(0px, 0px); }
        }

        @keyframes floatSphere {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(180deg); }
            100% { transform: translateY(0px) rotate(360deg); }
        }

        @keyframes floatSphere2 {
            0% { transform: translateY(0px) rotate(360deg); }
            50% { transform: translateY(10px) rotate(180deg); }
            100% { transform: translateY(0px) rotate(0deg); }
        }

        @keyframes floatParticle {
            0% { transform: translateY(0px); opacity: .25; }
            50% { transform: translateY(-16px); opacity: 0.85; }
            100% { transform: translateY(0px); opacity: .25; }
        }

        @keyframes pathPulse {
            0% { opacity: 0.22; }
            100% { opacity: 0.85; }
        }

        @keyframes dotPulse {
            0% { transform: scale(0.8); opacity: 0.45; }
            100% { transform: scale(1.25); opacity: 0.95; }
        }

        @keyframes textGlow {
            0% {
                opacity: 0.88;
                transform: scale(1);
            }
            50% {
                opacity: 1;
                transform: scale(1.008);
            }
            100% {
                opacity: 0.88;
                transform: scale(1);
            }
        }
      `}</style>

      <div className="bg-container">
        {/* Background Grid Pattern */}
        <div className="bg-grid"></div>

        {/* Ambient Corner Lighting Glows */}
        <div className="orange-glow"></div>
        <div className="blue-glow"></div>

        {/* Concentric Tech Corner Rings */}
        <div className="tech-circle circle-1a"></div>
        <div className="tech-circle circle-1b"></div>
        <div className="tech-circle circle-2a"></div>
        <div className="tech-circle circle-2b"></div>

        {/* Corner Dot Matrices */}
        <div className="dot-matrix matrix-1"></div>
        <div className="dot-matrix matrix-2"></div>

        {/* Solid Floating Spheres (Planets) */}
        <div className="solid-sphere sphere-bl"></div>
        <div className="solid-sphere sphere-tr"></div>

        {/* Center Tech Watermark Branding */}
        <div className="center-branding">
          {/* Circuit branching left with terminal pad and flare */}
          <div className="circuit-left">
            <svg width="280" height="120" viewBox="0 0 280 120" fill="none">
              <path d="M280,60 L180,60 L140,25 L30,25" stroke="rgba(255,145,55,0.28)" strokeWidth="1.5" />
              <path d="M180,60 L140,95 L60,95" stroke="rgba(255,145,55,0.22)" strokeWidth="1.5" strokeDasharray="4 4" />
              <circle cx="30" cy="25" r="3" fill="#ff9137" />
              <circle cx="60" cy="95" r="3" fill="#ff9137" />
              <path d="M280,60 L100,60" stroke="url(#orange-flare-left)" strokeWidth="2" />
              <defs>
                <linearGradient id="orange-flare-left" x1="280" y1="60" x2="100" y2="60" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ff9137" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ff9137" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Custom Geometric Styled Brand Text */}
          <div className="sentinel-brand">
            <span>S</span>
            <span className="letter-e">
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </span>
            <span>N</span>
            <span>T</span>
            <span>I</span>
            <span>N</span>
            <span className="letter-e">
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </span>
            <span>L</span>
            <span>&nbsp;&nbsp;</span>
            <span className="letter-a"></span>
            <span>I</span>
          </div>

          {/* Circuit branching right with terminal pad and flare */}
          <div className="circuit-right">
            <svg width="280" height="120" viewBox="0 0 280 120" fill="none">
              <path d="M0,60 L100,60 L140,25 L250,25" stroke="rgba(255,145,55,0.28)" strokeWidth="1.5" />
              <path d="M100,60 L140,95 L220,95" stroke="rgba(255,145,55,0.22)" strokeWidth="1.5" strokeDasharray="4 4" />
              <circle cx="250" cy="25" r="3" fill="#ff9137" />
              <circle cx="220" cy="95" r="3" fill="#ff9137" />
              <path d="M0,60 L180,60" stroke="url(#orange-flare-right)" strokeWidth="2" />
              <defs>
                <linearGradient id="orange-flare-right" x1="0" y1="60" x2="180" y2="60" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ff9137" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ff9137" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Scattered Stardust Floating Particles */}
        <div className="particle p1"></div>
        <div className="particle p2"></div>
        <div className="particle p3"></div>
        <div className="particle p4"></div>
        <div className="particle p5"></div>
        <div className="particle p6"></div>
        <div className="particle p7"></div>
        <div className="particle p8"></div>
      </div>
    </>
  );
};

export default AnimatedBackground;
