"use client";

import { useLayoutEffect, useRef } from "react";

export function useFiveItemScroller(enabled: boolean) {
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !enabled) return;

    const visibleRows = Array.from(list.children).slice(0, 5) as HTMLElement[];
    const updateHeight = () => {
      const height = visibleRows.reduce(
        (total, row) => total + row.getBoundingClientRect().height,
        0,
      );
      list.style.setProperty("--five-item-height", `${Math.ceil(height)}px`);
    };

    const resizeObserver = new ResizeObserver(updateHeight);
    visibleRows.forEach((row) => resizeObserver.observe(row));
    updateHeight();

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const multiplier =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1;

      window.scrollBy({
        top: event.deltaY * multiplier,
        left: event.deltaX * multiplier,
        behavior: "auto",
      });
    };

    list.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      resizeObserver.disconnect();
      list.removeEventListener("wheel", handleWheel);
    };
  }, [enabled]);

  return listRef;
}
