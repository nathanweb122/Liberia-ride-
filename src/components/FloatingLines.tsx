/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react';
import './FloatingLines.css';

export interface FloatingLinesProps {
  linesGradient?: string[];
  enabledWaves?: Array<'top' | 'middle' | 'bottom'>;
  lineCount?: number | number[];
  lineDistance?: number | number[];
  topWavePosition?: { x?: number; y?: number; z?: number };
  middleWavePosition?: { x?: number; y?: number; z?: number };
  bottomWavePosition?: { x?: number; y?: number; z?: number };
  animationSpeed?: number;
  interactive?: boolean;
  bendRadius?: number;
  bendStrength?: number;
  mouseDamping?: number;
  parallax?: boolean;
  parallaxStrength?: number;
  mixBlendMode?: any;
  style?: React.CSSProperties;
  className?: string;
}

const DEFAULT_GRADIENT = ['#e9c349', '#10b981', '#34d399', '#f59e0b', '#fbbf24'];

export const FloatingLines: React.FC<FloatingLinesProps> = ({
  linesGradient = DEFAULT_GRADIENT,
  enabledWaves = ['top', 'middle', 'bottom'],
  lineCount = [5, 7, 5],
  animationSpeed = 0.7,
  interactive = true,
  parallax = true,
  parallaxStrength = 0.15,
  mixBlendMode = 'screen',
  style,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number = 0;
    let isVisible = !document.hidden;
    let width = 0;
    let height = 0;

    // Mouse coordinates & smoothing
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;
    let mouseInfluence = 0;
    let targetInfluence = 0;

    // Time tracker
    let startTime = performance.now();

    // Parse line counts
    const counts = Array.isArray(lineCount) ? lineCount : [lineCount, lineCount, lineCount];
    const topLines = enabledWaves.includes('top') ? (counts[0] || 4) : 0;
    const midLines = enabledWaves.includes('middle') ? (counts[1] || 6) : 0;
    const botLines = enabledWaves.includes('bottom') ? (counts[2] || 4) : 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));

      // Use a sensible DPI cap (1.25) to avoid GPU starvation on 3x retina displays
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);
    };

    resize();

    let resizeTimer: any = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    };

    window.addEventListener('resize', handleResize);

    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseX = e.clientX - rect.left;
      targetMouseY = e.clientY - rect.top;
      targetInfluence = 1.0;
    };

    const handlePointerLeave = () => {
      targetInfluence = 0.0;
    };

    if (interactive) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    }

    const handleVisibility = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        startTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Pre-create color stops
    const colors = linesGradient.length > 0 ? linesGradient : DEFAULT_GRADIENT;

    // Render loop - locked to requestAnimationFrame but ultra-lightweight
    const render = (now: number) => {
      if (!isVisible) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Smooth mouse lerping
      currentMouseX += (targetMouseX - currentMouseX) * 0.06;
      currentMouseY += (targetMouseY - currentMouseY) * 0.06;
      mouseInfluence += (targetInfluence - mouseInfluence) * 0.06;

      ctx.clearRect(0, 0, width, height);

      const elapsed = (now - startTime) * 0.001 * animationSpeed;

      // Parallax shift
      let parallaxX = 0;
      let parallaxY = 0;
      if (parallax && width > 0 && height > 0) {
        parallaxX = ((currentMouseX - width / 2) / width) * 30 * parallaxStrength;
        parallaxY = ((currentMouseY - height / 2) / height) * 30 * parallaxStrength;
      }

      // Draw a wave collection
      const drawWaveGroup = (
        lineTotal: number,
        baseYRatio: number,
        amplitude: number,
        speedMul: number,
        freq: number,
        colorOffset: number
      ) => {
        if (lineTotal <= 0) return;

        for (let i = 0; i < lineTotal; i++) {
          const t = i / Math.max(lineTotal - 1, 1);
          const color = colors[(i + colorOffset) % colors.length];
          const lineY = height * baseYRatio + (i - lineTotal / 2) * 16 + parallaxY;
          const alpha = 0.25 + 0.35 * (1 - Math.abs(t - 0.5) * 1.5);

          ctx.beginPath();
          ctx.lineWidth = 1.2 + (i % 2) * 0.6;
          ctx.strokeStyle = color;
          ctx.globalAlpha = Math.max(0.1, Math.min(0.65, alpha));

          // Draw bezier curve points across horizontal segments
          const segments = 12;
          const step = width / segments;

          ctx.moveTo(0, lineY);

          for (let s = 1; s <= segments; s++) {
            const x = s * step + parallaxX;
            const prevX = (s - 1) * step + parallaxX;

            const waveSin = Math.sin(x * freq + elapsed * speedMul + i * 0.3);
            const waveCos = Math.cos(x * freq * 0.5 + elapsed * (speedMul * 0.7));
            let y = lineY + (waveSin * 0.7 + waveCos * 0.3) * amplitude;

            // Interactive mouse deflection
            if (interactive && mouseInfluence > 0.01) {
              const dx = x - currentMouseX;
              const dy = y - currentMouseY;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const maxDist = 200;
              if (dist < maxDist) {
                const force = (1 - dist / maxDist) * 35 * mouseInfluence;
                y += (dy > 0 ? force : -force);
              }
            }

            const cpx = (prevX + x) / 2;
            ctx.quadraticCurveTo(prevX, y, cpx, y);
          }

          ctx.stroke();
        }
      };

      // 1. Top undulating waves (subtle golden/amber)
      drawWaveGroup(topLines, 0.22, 28, 0.9, 0.002, 0);

      // 2. Middle focal waves (emerald & gold)
      drawWaveGroup(midLines, 0.52, 42, 1.2, 0.0025, 1);

      // 3. Bottom sweeping waves
      drawWaveGroup(botLines, 0.82, 34, 0.8, 0.0018, 2);

      // Reset alpha
      ctx.globalAlpha = 1.0;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (interactive) {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerleave', handlePointerLeave);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [
    linesGradient,
    enabledWaves,
    lineCount,
    animationSpeed,
    interactive,
    parallax,
    parallaxStrength
  ]);

  return (
    <div
      ref={containerRef}
      className={`floating-lines-container ${className}`}
      style={{
        mixBlendMode,
        ...style
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

export default FloatingLines;
