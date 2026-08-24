"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { withBasePath } from "@/lib/paths";
import styles from "./MusicPlayer.module.css";

type Track = {
  title: string;
  src: string;
};

export function MusicPlayer() {
  const playerRef = useRef<HTMLDivElement>(null);
  const floatingControlRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const continueAfterTrackChangeRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasVisitedPublications, setHasVisitedPublications] = useState(false);
  const [floatingPosition, setFloatingPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const connectAnalyser = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioContextRef.current) {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      const source = audioContext.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return;
    try {
      await connectAnalyser();
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  }, [connectAnalyser, tracks.length]);

  useEffect(() => {
    let active = true;
    fetch(withBasePath("/music/playlist.json"), { cache: "no-store" })
      .then((response) => response.json() as Promise<Track[]>)
      .then((playlist) => {
        if (active) setTracks(playlist);
      })
      .catch(() => {
        if (active) setTracks([]);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    const section = playerRef.current?.closest("section");
    if (!section || tracks.length === 0) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.12) {
          setHasVisitedPublications(true);
          observer.disconnect();
        }
      },
      { threshold: [0.12] },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [tracks.length]);

  useEffect(() => {
    if (!continueAfterTrackChangeRef.current) return;
    continueAfterTrackChangeRef.current = false;
    const timeout = window.setTimeout(() => { void play(); }, 60);
    return () => window.clearTimeout(timeout);
  }, [play, trackIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let frame = 0;
    let pointerX = 0;
    let previousPointerX = 0;
    let pointerActive = false;
    let visible = true;
    const offsets: number[] = [];
    const velocities: number[] = [];
    const frequencyValues = new Uint8Array(128);

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = () => {
      frame = 0;
      context.clearRect(0, 0, width, height);
      const analyser = analyserRef.current;
      if (analyser && isPlaying) analyser.getByteFrequencyData(frequencyValues);
      else frequencyValues.fill(0);
      const barCount = Math.max(24, Math.floor(width / 9));
      const gap = 3;
      const barWidth = Math.max(1, (width - gap * (barCount - 1)) / barCount);
      context.fillStyle = "rgba(247, 247, 243, 0.92)";

      for (let index = 0; index < barCount; index += 1) {
        offsets[index] ??= 0;
        velocities[index] ??= 0;
        const barX = index * (barWidth + gap);
        const barCenter = barX + barWidth * 0.5;
        const distance = Math.abs(pointerX - barCenter);
        const influence = pointerActive
          ? Math.max(0, 1 - distance / Math.max(80, width * 0.16))
          : 0;
        const direction = pointerX < width * 0.5 ? 1 : -1;
        const pointerSpeed = Math.min(16, Math.abs(pointerX - previousPointerX) * 0.9);
        const targetOffset = direction * influence * influence * (4 + pointerSpeed);
        velocities[index] += (targetOffset - offsets[index]) * 0.11;
        velocities[index] *= pointerActive ? 0.76 : 0.86;
        offsets[index] += velocities[index];

        const sourceIndex = Math.floor((index / barCount) * frequencyValues.length * 0.72);
        const level = analyser && isPlaying ? frequencyValues[sourceIndex] / 255 : 0;
        const idle = 2 + Math.sin(index * 0.58) ** 4 * 5;
        const interactionHeight = influence * influence * height * 0.34;
        const barHeight = Math.min(height, Math.max(idle, level * height * 0.88) + interactionHeight);
        const edgeDistance = Math.min(barCenter, width - barCenter);
        const fadeProgress = Math.max(0, Math.min(1, edgeDistance / (width * 0.28)));
        context.globalAlpha = fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
        context.fillRect(barX + offsets[index], height - barHeight, barWidth, barHeight);
      }
      context.globalAlpha = 1;

      previousPointerX += (pointerX - previousPointerX) * 0.32;

      if (!reducedMotion && visible) frame = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointerX = event.clientX - bounds.left;
      if (!pointerActive) previousPointerX = pointerX;
      pointerActive = true;
    };
    const onPointerLeave = () => { pointerActive = false; };

    const resizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reducedMotion && !frame) {
        frame = window.requestAnimationFrame(draw);
      } else if (!visible && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    resizeObserver.observe(canvas);
    visibilityObserver.observe(canvas);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    resize();
    draw();
    return () => {
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [isPlaying]);

  useEffect(() => () => {
    void audioContextRef.current?.close();
  }, []);

  const currentTrack = tracks[trackIndex];
  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return;
    if (audio.paused) void play();
    else audio.pause();
  };

  const handleEnded = () => {
    if (tracks.length > 1) {
      continueAfterTrackChangeRef.current = true;
      setTrackIndex((index) => (index + 1) % tracks.length);
      return;
    }
    if (audioRef.current) audioRef.current.currentTime = 0;
    void play();
  };

  const handleDragStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setFloatingPosition({ x: bounds.left, y: bounds.top });
    setIsDragging(true);
  };

  const handleDragMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const control = floatingControlRef.current;
    if (!drag || !control || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (distance > 4) drag.moved = true;
    const margin = 8;
    const x = Math.min(window.innerWidth - control.offsetWidth - margin, Math.max(margin, event.clientX - drag.offsetX));
    const y = Math.min(window.innerHeight - control.offsetHeight - margin, Math.max(margin, event.clientY - drag.offsetY));
    setFloatingPosition({ x, y });
  };

  const handleDragEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    suppressClickRef.current = drag.moved;
    dragRef.current = null;
    setIsDragging(false);
  };

  const handleFloatingClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    togglePlayback();
  };

  const floatingControl = hasVisitedPublications && currentTrack && typeof document !== "undefined"
    ? createPortal(
        <button
          ref={floatingControlRef}
          className={`${styles.floatingControl} ${isDragging ? styles.dragging : ""}`}
          style={floatingPosition ? { left: floatingPosition.x, top: floatingPosition.y, right: "auto", bottom: "auto" } : undefined}
          type="button"
          onClick={handleFloatingClick}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          aria-label={isPlaying ? "Pause music" : "Play music"}
          title={isPlaying ? "Pause music" : "Play music"}
        >
          {isPlaying ? "Ⅱ" : "▶"}
        </button>,
        document.body,
      )
    : null;

  return (
    <>
      <div ref={playerRef} className={styles.player} data-music-player>
        {/* This element plays instrumental music, so there is no spoken content to caption. */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          ref={audioRef}
          src={currentTrack?.src}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleEnded}
        />
        <canvas className={styles.waveform} ref={canvasRef} aria-hidden="true" />
      </div>
      {floatingControl}
    </>
  );
}
