"use client";

import { useRef } from "react";
import { publications } from "@/data/profile";
import { newestFirst } from "@/lib/dates";
import { MusicPlayer } from "../MusicPlayer/MusicPlayer";
import { PublicationsTitle } from "./PublicationsTitle";
import { AnimatedEntryTitle } from "../Section/AnimatedEntryTitle";
import { useEntryInteractions } from "../Section/useEntryInteractions";
import { useFiveItemScroller } from "../Section/useFiveItemScroller";
import styles from "../Section/Section.module.css";

export function Publications() {
  const sectionRef = useRef<HTMLElement>(null);
  const sortedPublications = newestFirst(publications);
  const hasOverflow = sortedPublications.length > 5;
  const listRef = useFiveItemScroller(hasOverflow);
  const entryInteractions = useEntryInteractions(sectionRef);

  return (
    <section ref={sectionRef} className={`${styles.section} ${styles.publicationsSection}`} aria-labelledby="publications-title" data-section>
      <div className={styles.rule} data-line />
      <header className={styles.header}>
        <PublicationsTitle />
      </header>
      <div
        ref={listRef}
        className={`${styles.list}${hasOverflow ? ` ${styles.scrollList}` : ""}`}
        data-scroll-list={hasOverflow ? "" : undefined}
        role={hasOverflow ? "region" : undefined}
        tabIndex={hasOverflow ? 0 : undefined}
        aria-label={hasOverflow ? "Scrollable publications list" : undefined}
      >
        {sortedPublications.map((item, index) => {
          return (
            <a
              className={styles.row}
              href={item.href}
              key={`${item.year}-${item.title}-${index}`}
              target="_blank"
              rel="noopener noreferrer"
              {...entryInteractions}
              data-entry-row
            >
              <span className={styles.rowIndex}>{String(index + 1).padStart(2, "0")}</span>
              <AnimatedEntryTitle title={item.title} />
              <span className={styles.rowMeta}>{item.venue}<br />{item.year}</span>
              <span className={styles.arrow} aria-hidden="true">↗</span>
            </a>
          );
        })}
      </div>
      <MusicPlayer />
    </section>
  );
}
