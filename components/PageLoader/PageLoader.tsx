"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import styles from "./PageLoader.module.css";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
};

export function PageLoader() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const backdrop = backdropRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!overlay || !backdrop || !canvas || !context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      overlay.style.display = "none";
      return;
    }

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.dataset.pageLoading = "true";

    const preventScroll = (event: Event) => event.preventDefault();
    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });

    let width = 0;
    let height = 0;
    const animation = { ring: 0, grow: 0 };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const distanceToEdge = (angle: number, centerX: number, centerY: number) => {
      const directionX = Math.cos(angle);
      const directionY = Math.sin(angle);
      const horizontal = Math.abs(directionX) < 0.0001
        ? Number.POSITIVE_INFINITY
        : (directionX > 0 ? width - centerX : centerX) / Math.abs(directionX);
      const vertical = Math.abs(directionY) < 0.0001
        ? Number.POSITIVE_INFINITY
        : (directionY > 0 ? height - centerY : centerY) / Math.abs(directionY);
      return Math.min(horizontal, vertical) + 2;
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const centerX = width * 0.5;
      const centerY = height * 0.5;
      const ringRadius = width < 768 ? 23 : 28;
      const lineCount = Math.max(44, Math.min(92, Math.round(width / 17)));
      const segmentCount = 64;
      const grownLength = smoothstep(animation.grow);
      const viewportRadius = Math.hypot(width * 0.5, height * 0.5) + 4;
      const coverageRadius = viewportRadius + Math.hypot(width, height) * 0.18;
      const coverageBlend = smoothstep((animation.grow - 0.72) / 0.28);
      const currentRingRadius = ringRadius * smoothstep(animation.ring);
      const innerRadius = currentRingRadius;
      const circularGrowthRadius = currentRingRadius
        + (viewportRadius - currentRingRadius) * grownLength;

      context.strokeStyle = "#ffffff";
      context.lineWidth = width < 768 ? 0.85 : 1.05;
      context.lineCap = "round";
      context.lineJoin = "round";

      for (let line = 0; line < lineCount; line += 1) {
        if (animation.grow <= 0.001) continue;
        const baseAngle = -Math.PI * 0.5 + (line / lineCount) * Math.PI * 2;
        const straightEdge = distanceToEdge(baseAngle, centerX, centerY);
        const grownOuterRadius = Math.min(circularGrowthRadius, straightEdge);
        const outerRadius = grownOuterRadius
          + (coverageRadius - grownOuterRadius) * coverageBlend;
        const points: Array<{ x: number; y: number }> = [];

        for (let point = 0; point <= segmentCount; point += 1) {
          const radialProgress = point / segmentCount;
          const radius = innerRadius + (outerRadius - innerRadius) * radialProgress;
          points.push({
            x: centerX + Math.cos(baseAngle) * radius,
            y: centerY + Math.sin(baseAngle) * radius,
          });
        }

        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        for (let point = 1; point < points.length - 1; point += 1) {
          const current = points[point];
          const next = points[point + 1];
          context.quadraticCurveTo(
            current.x,
            current.y,
            (current.x + next.x) * 0.5,
            (current.y + next.y) * 0.5,
          );
        }
        const last = points[points.length - 1];
        context.lineTo(last.x, last.y);
        context.stroke();
      }

      const centerMask = ringRadius;
      if (centerMask > 0.001) {
        context.save();
        context.globalCompositeOperation = "destination-out";
        context.fillStyle = "#000000";
        context.beginPath();
        context.arc(centerX, centerY, centerMask, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }

      const ringOpacity = smoothstep(animation.ring)
        * (1 - smoothstep((animation.grow - 0.3) / 0.3));
      if (ringOpacity > 0.001) {
        context.save();
        context.globalAlpha = ringOpacity;
        context.beginPath();
        context.arc(centerX, centerY, currentRingRadius, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      }
    };

    resize();
    draw();
    window.addEventListener("resize", resize, { passive: true });

    const timeline = gsap.timeline({
      defaults: { overwrite: "auto" },
      onUpdate: draw,
      onComplete: () => {
        delete document.documentElement.dataset.pageLoading;
        gsap.set(overlay, { display: "none" });
        window.history.scrollRestoration = previousScrollRestoration;
        window.removeEventListener("wheel", preventScroll);
        window.removeEventListener("touchmove", preventScroll);
      },
    });

    timeline
      .to(animation, { ring: 1, duration: 0.42, ease: "power2.out" })
      .to(animation, { grow: 1, duration: 1.35, ease: "power2.inOut" }, 0.2)
      .to(
        overlay,
        {
          autoAlpha: 0,
          duration: 1.5,
          ease: "power2.inOut",
          onStart: () => {
            delete document.documentElement.dataset.pageLoading;
          },
        },
        1.58,
      );

    return () => {
      timeline.kill();
      window.removeEventListener("resize", resize);
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
      window.history.scrollRestoration = previousScrollRestoration;
      delete document.documentElement.dataset.pageLoading;
    };
  }, []);

  return (
    <div ref={overlayRef} className={styles.overlay} aria-hidden="true">
      <div ref={backdropRef} className={styles.backdrop} />
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
