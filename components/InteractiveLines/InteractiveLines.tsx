"use client";

import { useEffect, useRef } from "react";
import styles from "./InteractiveLines.module.css";

type PointState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export function InteractiveLines() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = {
      targetX: 0,
      targetY: 0,
      smoothX: 0,
      smoothY: 0,
      lastX: 0,
      lastY: 0,
      speed: 0,
      angle: 0,
      active: false,
      hasPosition: false,
    };
    let pointStates: PointState[][] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    let previousTime = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = bounds.width;
      const nextHeight = bounds.height;
      const nextCanvasWidth = Math.round(nextWidth * ratio);
      const nextCanvasHeight = Math.round(nextHeight * ratio);
      const sizeChanged = canvas.width !== nextCanvasWidth || canvas.height !== nextCanvasHeight;

      width = nextWidth;
      height = nextHeight;
      if (sizeChanged) {
        canvas.width = nextCanvasWidth;
        canvas.height = nextCanvasHeight;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        pointStates = [];
      }
    };

    const updatePointer = (event: PointerEvent) => {
      if (document.documentElement.dataset.pageLoading === "true") {
        pointer.active = false;
        return;
      }
      const bounds = canvas.getBoundingClientRect();
      const nextX = event.clientX - bounds.left;
      const nextY = event.clientY - bounds.top;
      const isInside = nextX >= 0 && nextX <= width && nextY >= 0 && nextY <= height;

      if (isInside) {
        pointer.targetX = nextX;
        pointer.targetY = nextY;
        if (!pointer.hasPosition) {
          pointer.smoothX = nextX;
          pointer.smoothY = nextY;
          pointer.lastX = nextX;
          pointer.lastY = nextY;
          pointer.hasPosition = true;
        }
      } else {
        pointer.hasPosition = false;
      }
      pointer.active = isInside;
    };

    const draw = (time = 0) => {
      if (document.documentElement.dataset.pageLoading === "true") {
        previousTime = time;
        if (!reduceMotion && visible) frame = requestAnimationFrame(draw);
        return;
      }
      context.clearRect(0, 0, width, height);
      const elapsed = previousTime ? Math.min(time - previousTime, 50) : 16.67;
      previousTime = time;
      const frameScale = elapsed / 16.67;
      const pointerEase = 1 - Math.pow(0.9, frameScale);

      if (pointer.active) {
        pointer.smoothX += (pointer.targetX - pointer.smoothX) * pointerEase;
        pointer.smoothY += (pointer.targetY - pointer.smoothY) * pointerEase;
        if (Math.hypot(pointer.targetX - pointer.smoothX, pointer.targetY - pointer.smoothY) < 0.1) {
          pointer.smoothX = pointer.targetX;
          pointer.smoothY = pointer.targetY;
        }
        const moveX = pointer.targetX - pointer.lastX;
        const moveY = pointer.targetY - pointer.lastY;
        const rawSpeed = Math.min(100, Math.hypot(moveX, moveY));
        pointer.speed += (rawSpeed - pointer.speed) * pointerEase;
        if (rawSpeed > 0.01) pointer.angle = Math.atan2(moveY, moveX);
        pointer.lastX = pointer.targetX;
        pointer.lastY = pointer.targetY;
      } else {
        pointer.speed += (0 - pointer.speed) * pointerEase;
      }

      const interactionRadius = Math.min(170, width * 0.135);
      const gridOverscan = interactionRadius + 90;
      const coreLineCount = Math.max(44, Math.min(92, Math.round(width / 17)));
      const extraLineCount = Math.ceil(gridOverscan / 17);
      const lineCount = coreLineCount + extraLineCount * 2;
      const verticalStep = Math.max(13, Math.round(height / 58));
      const drift = reduceMotion ? 0 : time * 0.00042;
      const damping = Math.pow(0.925, frameScale);
      context.lineWidth = width < 768 ? 0.85 : 1.05;
      context.strokeStyle = "#ffffff";
      context.lineCap = "round";
      context.lineJoin = "round";

      for (let line = 0; line < lineCount; line += 1) {
        const baseX = -gridOverscan
          + ((line + 0.5) / lineCount) * (width + gridOverscan * 2);
        const lineStates = pointStates[line] ?? [];
        pointStates[line] = lineStates;
        const points: Array<{ x: number; y: number }> = [];
        let pointIndex = 0;

        for (let y = -gridOverscan; y <= height + gridOverscan; y += verticalStep) {
          const wave = Math.sin(y * 0.011 + line * 0.24 + drift) * 9
            + Math.sin(y * 0.024 - line * 0.11 - drift * 0.7) * 5;
          const restingX = baseX + wave;
          const state = lineStates[pointIndex] ?? { x: 0, y: 0, vx: 0, vy: 0 };
          lineStates[pointIndex] = state;

          if (pointer.active) {
            const distanceX = restingX - pointer.smoothX;
            const distanceY = y - pointer.smoothY;
            const distance = Math.hypot(distanceX, distanceY);
            if (distance < interactionRadius) {
              const falloff = 1 - distance / interactionRadius;
              const impulse = falloff * interactionRadius * pointer.speed * 0.00065;
              state.vx += Math.cos(pointer.angle) * impulse;
              state.vy += Math.sin(pointer.angle) * impulse;
            }
          }

          state.vx += (0 - state.x) * 0.005 * frameScale;
          state.vy += (0 - state.y) * 0.005 * frameScale;
          state.vx *= damping;
          state.vy *= damping;
          state.x += state.vx * 2 * frameScale;
          state.y += state.vy * 2 * frameScale;
          state.x = Math.max(-100, Math.min(100, state.x));
          state.y = Math.max(-100, Math.min(100, state.y));

          let attractionX = 0;
          if (pointer.active) {
            const deltaX = pointer.targetX - restingX;
            const deltaY = pointer.targetY - y;
            const distance = Math.hypot(deltaX, deltaY);
            if (distance < interactionRadius) {
              const influence = Math.pow(1 - distance / interactionRadius, 3);
              attractionX = deltaX * influence * 0.65;
            }
          }

          points.push({ x: restingX + state.x + attractionX, y: y + state.y });
          pointIndex += 1;
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

      if (pointer.active) {
        context.fillStyle = "#ffffff";
        context.beginPath();
        context.arc(pointer.smoothX, pointer.smoothY, 3.2, 0, Math.PI * 2);
        context.fill();
      }
      if (!reduceMotion && visible) frame = requestAnimationFrame(draw);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduceMotion && !frame) frame = requestAnimationFrame(draw);
      if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; }
    });
    const handleResize = () => { resize(); if (reduceMotion) draw(); };
    resize();
    observer.observe(canvas);
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("pointermove", updatePointer, { passive: true });
    if (reduceMotion) draw();
    else frame = requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", updatePointer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
