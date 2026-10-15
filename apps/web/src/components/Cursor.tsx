"use client";

import { useEffect, useRef, useState } from "react";

export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const ringSizeRef = useRef(36);
  const hoveringRef = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    ringSizeRef.current = hovering ? 52 : 36;
  }, [hovering]);

  useEffect(() => {
    const finePointer =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!finePointer || reduceMotion) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.body.classList.add("custom-cursor");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let raf = 0;
    let firstMove = true;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate3d(${mouseX - 3}px, ${mouseY - 3}px, 0)`;
      if (firstMove) {
        ringX = mouseX;
        ringY = mouseY;
        firstMove = false;
      }
    };

    const tick = () => {
      ringX += (mouseX - ringX) * 0.32;
      ringY += (mouseY - ringY) * 0.32;
      const offset = ringSizeRef.current / 2;
      ring.style.transform = `translate3d(${ringX - offset}px, ${ringY - offset}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = !!target.closest(
        'a, button, [role="button"], input, textarea, select, label, [data-cursor="hover"]',
      );
      if (isInteractive !== hoveringRef.current) {
        hoveringRef.current = isInteractive;
        setHovering(isInteractive);
      }
    };

    const onLeave = () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
      firstMove = true;
    };

    const onEnter = () => {
      dot.style.opacity = "1";
      ring.style.opacity = "1";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      cancelAnimationFrame(raf);
      document.body.classList.remove("custom-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[10001] h-[6px] w-[6px] rounded-full bg-white mix-blend-difference"
        style={{
          willChange: "transform",
          transition: "background-color 0.2s ease, opacity 0.2s ease",
        }}
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[10001] flex items-center justify-center rounded-full border border-white/90 mix-blend-difference"
        style={{
          width: hovering ? 52 : 36,
          height: hovering ? 52 : 36,
          willChange: "transform, width, height",
          transition:
            "width 0.25s cubic-bezier(0.22,1,0.36,1), height 0.25s cubic-bezier(0.22,1,0.36,1), border-color 0.2s ease, background-color 0.2s ease, opacity 0.2s ease, box-shadow 0.25s ease",
          boxShadow: hovering
            ? "0 0 18px rgba(255,255,255,0.55), 0 0 36px rgba(255,255,255,0.25), inset 0 0 12px rgba(255,255,255,0.15)"
            : "0 0 14px rgba(255,255,255,0.35), 0 0 28px rgba(255,255,255,0.12)",
          background: "transparent",
        }}
      />
    </>
  );
}
