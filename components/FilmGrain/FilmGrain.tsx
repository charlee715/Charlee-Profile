"use client";

import { useEffect, useRef } from "react";
import styles from "./FilmGrain.module.css";

const PATTERN_SIZE = 200;
const GRAIN_DENSITY = 3;

export function FilmGrain() {
  const grainRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const grain = grainRef.current;
    if (!grain) return;

    const pattern = document.createElement("canvas");
    pattern.width = PATTERN_SIZE;
    pattern.height = PATTERN_SIZE;
    const context = pattern.getContext("2d");
    if (!context) return;

    for (let x = 0; x < PATTERN_SIZE; x += GRAIN_DENSITY) {
      for (let y = 0; y < PATTERN_SIZE; y += GRAIN_DENSITY) {
        const tone = Math.floor(Math.random() * 256);
        context.fillStyle = `rgb(${tone} ${tone} ${tone})`;
        context.fillRect(x, y, 1, 1);
      }
    }

    grain.style.backgroundImage = `url("${pattern.toDataURL("image/png")}")`;
    return () => {
      grain.style.removeProperty("background-image");
    };
  }, []);

  return <span ref={grainRef} className={styles.grain} aria-hidden="true" />;
}
