"use client";

import { useEffect, useState } from "react";

export function CursorTrailer() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hidden, setHidden] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (hidden) setHidden(false);
    };

    const handleMouseLeave = () => {
      setHidden(true);
    };

    const handleMouseEnter = () => {
      setHidden(false);
    };

    // Detect if mouse is hovering over interactive elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "BUTTON" ||
          target.tagName === "A" ||
          target.closest("button") ||
          target.closest("a") ||
          target.closest(".sidebar-link") ||
          target.closest(".glass-hover") ||
          target.closest(".btn-primary") ||
          target.closest(".btn-secondary") ||
          target.closest(".input") ||
          target.classList.contains("cursor-pointer") ||
          window.getComputedStyle(target).cursor === "pointer")
      ) {
        setHovered(true);
      } else {
        setHovered(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[9999] hidden -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen transition-all md:block"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: hovered ? "36px" : "16px",
        height: hovered ? "36px" : "16px",
        backgroundColor: hovered ? "rgba(216, 180, 254, 0.12)" : "rgba(216, 180, 254, 0.65)",
        border: hovered ? "1.5px solid rgba(216, 180, 254, 0.35)" : "none",
        boxShadow: hovered
          ? "0 0 20px rgba(216, 180, 254, 0.25)"
          : "0 0 10px rgba(216, 180, 254, 0.4)",
        transition: "width 0.2s ease, height 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, left 0.12s cubic-bezier(0.25, 1, 0.5, 1), top 0.12s cubic-bezier(0.25, 1, 0.5, 1)",
      }}
    />
  );
}
