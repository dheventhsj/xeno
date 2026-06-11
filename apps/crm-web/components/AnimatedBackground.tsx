"use client";

import { useEffect, useRef } from "react";

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle class representing floating nodes in the grid
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.25; // Slow, elegant drift
        this.vy = (Math.random() - 0.5) * 0.25;
        this.radius = Math.random() * 2.2 + 1.2; // Slightly larger, more visible
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges smoothly
        if (this.x < 0 || this.x > width) this.vx = -this.vx;
        if (this.y < 0 || this.y > height) this.vy = -this.vy;
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fillStyle = "rgba(168, 85, 247, 0.65)"; // More visible glowing purple nodes
        c.fill();
      }
    }

    // Set particle density based on screen space
    const particleCount = Math.min(80, Math.floor((width * height) / 15000));
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Draw faint connecting line mesh
    const drawConnections = () => {
      const maxDistance = 160;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.45;
            ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`; // Elegant glowing purple links
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.update();
        p.draw(ctx);
      });

      drawConnections();

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-[#050505]">
      {/* Canvas for animated particle network */}
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full opacity-85" />

      {/* Slowly floating ambient glow circles (visible purple and blue backdrops) */}
      <div 
        className="absolute top-[-15%] left-[-15%] h-[65vw] w-[65vw] rounded-full blur-[150px] animate-blob" 
        style={{ 
          backgroundColor: "rgba(168, 85, 247, 0.16)", // Vivid Purple glow
          animationDelay: "0s" 
        }} 
      />
      <div 
        className="absolute bottom-[-15%] right-[-15%] h-[65vw] w-[65vw] rounded-full blur-[150px] animate-blob" 
        style={{ 
          backgroundColor: "rgba(59, 130, 246, 0.12)", // Vivid Blue/Slate glow
          animationDelay: "6s" 
        }} 
      />
    </div>
  );
}
