"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  opacity: number;
  shape: "rect" | "circle";
};

// Brand + semantic palette (matches globals.css tokens).
const COLORS = ["#6ee7a0", "#f0c050", "#7eb8f0", "#c084fc"];

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      firedRef.current = false;
    }
  }, [active]);

  useEffect(() => {
    if (!active || firedRef.current || prefersReducedMotion()) return;
    firedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];

    const spawnBurst = (originX: number, count: number) => {
      const h = canvas.height;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.0;
        const speed = 7 + Math.random() * 10;
        particles.push({
          x: originX + (Math.random() - 0.5) * 32,
          y: h + 4,
          vx: Math.cos(angle) * speed * (0.55 + Math.random() * 0.7),
          vy: Math.sin(angle) * speed,
          w: 3 + Math.random() * 4,
          h: 4 + Math.random() * 5,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
          opacity: 0.75 + Math.random() * 0.2,
          shape: Math.random() > 0.55 ? "rect" : "circle",
        });
      }
    };

    const burstTimes = [0, 280, 560];
    let startTime: number | null = null;
    let burstIndex = 0;
    let raf = 0;

    const tick = (ts: number) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const w = canvas.width;
      const h = canvas.height;

      while (burstIndex < burstTimes.length && elapsed >= burstTimes[burstIndex]!) {
        spawnBurst(w * (0.28 + Math.random() * 0.44), 12 + Math.floor(Math.random() * 8));
        burstIndex++;
      }

      ctx.clearRect(0, 0, w, h);

      let alive = 0;
      for (const p of particles) {
        p.vy += 0.38;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        if (elapsed > 1400) p.opacity -= 0.018;

        if (p.opacity <= 0 || p.y > h + 60) continue;
        alive++;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        if (p.shape === "rect") {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (elapsed < 3200 && (alive > 0 || burstIndex < burstTimes.length)) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  if (prefersReducedMotion()) return null;

  return <canvas ref={canvasRef} className="confetti" aria-hidden />;
}
