"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function MotionLayout({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const context = gsap.context(() => {
      const hero = document.querySelector("[data-hero-stage]");
      const heroTitle = document.querySelector("[data-hero-name]");
      const heroStatement = document.querySelector("[data-hero-statement]");
      if (hero && heroTitle && heroStatement) {
        gsap.fromTo(
          heroTitle,
          { xPercent: -2 },
          {
            xPercent: 110,
            ease: "none",
            scrollTrigger: {
              trigger: hero,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.15,
            },
          },
        );
        gsap.fromTo(
          heroStatement,
          {xPercent: 0,},
          {
            xPercent: -90,
            ease: "none",
            scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.15,
            },
          },
        );
      }

      gsap.utils.toArray<HTMLElement>("[data-section]").forEach((section) => {
        const line = section.querySelector("[data-line]");
        const reveals = section.querySelectorAll("[data-reveal]");
        if (line) gsap.from(line, { scaleX: 0, duration: 0.9, ease: "power2.out", scrollTrigger: { trigger: section, start: "top 78%" } });
        if (reveals.length) gsap.from(reveals, { y: 28, opacity: 0, duration: 0.75, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: section, start: "top 70%" } });
      });
    }, root);

    return () => context.revert();
  }, []);

  return <div ref={root}>{children}</div>;
}
