"use client";

import { useEffect, useRef } from "react";
import styles from "../Section/Section.module.css";

const TITLE = "PUBLICATIONS";
const SLICE_COUNT = 32;

export function PublicationsTitle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const offsets = new Float32Array(SLICE_COUNT);
    const velocities = new Float32Array(SLICE_COUNT);
    let pointerX = 0;
    let pointerY = 0;
    let previousX = 0;
    let pointerActive = false;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let animationFrame = 0;
    let visible = true;
    let fontFamily = "Arial, sans-serif";

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      fontFamily = getComputedStyle(document.documentElement)
        .getPropertyValue("--font-sans")
        .trim() || "Arial, sans-serif";
    };

    const draw = () => {
      animationFrame = 0;
      context.clearRect(0, 0, width, height);
      const sliceHeight = height / SLICE_COUNT;
      const fontSize = height * 0.91;
      context.font = `700 ${fontSize}px ${fontFamily}`;
      context.textBaseline = "top";
      context.fillStyle = "#f7f7f3";
      context.letterSpacing = `${-fontSize * 0.062}px`;

      const naturalWidth = context.measureText(TITLE).width;
      const baseScale = Math.min(1, width / naturalWidth);

      for (let index = 0; index < SLICE_COUNT; index += 1) {
        const centerY = (index + 0.5) * sliceHeight;
        const sliceInset = Math.max(1, sliceHeight * 0.22);
        let target = 0;
        if (pointerActive && !reducedMotion) {
          const verticalDistance = Math.abs(pointerY - centerY);
          const influence = Math.max(0, 1 - verticalDistance / (height * 0.34));
          const direction = pointerX < width * 0.5 ? 1 : -1;
          target = direction * influence * influence * Math.min(width * 0.065, Math.abs(pointerX - previousX) * 5 + width * 0.018);
        }

        velocities[index] += (target - offsets[index]) * 0.105;
        velocities[index] *= pointerActive ? 0.77 : 0.86;
        offsets[index] += velocities[index];

        context.save();
        context.beginPath();
        context.rect(
          0,
          index * sliceHeight + sliceInset,
          width,
          Math.max(1, sliceHeight - sliceInset * 2),
        );
        context.clip();
        context.translate(offsets[index], 0);
        context.scale(baseScale * (1 + Math.abs(offsets[index]) / width * 0.42), 1);
        context.fillText(TITLE, 0, height * 0.025);
        context.restore();
      }

      previousX += (pointerX - previousX) * 0.34;
      if (!reducedMotion && visible) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointerX = event.clientX - bounds.left;
      pointerY = event.clientY - bounds.top;
      if (!pointerActive) previousX = pointerX;
      pointerActive = true;
    };
    const onPointerLeave = () => { pointerActive = false; };

    const resizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reducedMotion && !animationFrame) {
        animationFrame = window.requestAnimationFrame(draw);
      } else if (!visible && animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    });
    resizeObserver.observe(canvas);
    visibilityObserver.observe(canvas);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    resize();
    draw();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div className={styles.interactiveTitle}>
      <h2 id="publications-title" className={styles.srOnly}>Publications</h2>
      <canvas ref={canvasRef} className={styles.titleCanvas} aria-hidden="true" />
    </div>
  );
}
