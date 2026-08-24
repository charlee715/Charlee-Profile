"use client";

import {
  useLayoutEffect,
  type MouseEventHandler,
  type RefObject,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type EntryInteractionHandlers = {
  onMouseEnter: MouseEventHandler<HTMLElement>;
  onMouseLeave: MouseEventHandler<HTMLElement>;
};

export function useEntryInteractions(
  sectionRef: RefObject<HTMLElement | null>,
): EntryInteractionHandlers {
  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    gsap.registerPlugin(ScrollTrigger);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      const scrollList = section.querySelector<HTMLElement>("[data-scroll-list]");

      section.querySelectorAll<HTMLElement>("[data-entry-row]").forEach((row) => {
        const words = row.querySelectorAll<HTMLElement>("[data-entry-word]");
        gsap.fromTo(
          words,
          { opacity: 0.16, filter: "blur(3px)", y: 8 },
          {
            opacity: 1,
            filter: "blur(0px)",
            y: 0,
            stagger: 0.055,
            ease: "none",
            scrollTrigger: {
              trigger: row,
              scroller: scrollList ?? undefined,
              start: "top 88%",
              end: "top 58%",
              scrub: 0.45,
            },
          },
        );
      });
    }, section);

    return () => context.revert();
  }, [sectionRef]);

  const onMouseEnter: MouseEventHandler<HTMLElement> = (event) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const viewport = event.currentTarget.querySelector<HTMLElement>(
      "[data-entry-title]",
    );
    const track = event.currentTarget.querySelector<HTMLElement>(
      "[data-entry-title-track]",
    );
    if (!viewport || !track) return;

    const distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
    if (distance < 1) return;

    gsap.to(track, {
      x: -distance,
      duration: Math.max(5, distance / 55),
      ease: "none",
      overwrite: true,
    });
  };

  const onMouseLeave: MouseEventHandler<HTMLElement> = (event) => {
    const track = event.currentTarget.querySelector<HTMLElement>(
      "[data-entry-title-track]",
    );
    if (!track) return;

    gsap.to(track, {
      x: 0,
      duration: 0.8,
      ease: "power2.out",
      overwrite: true,
    });
  };

  return { onMouseEnter, onMouseLeave };
}
