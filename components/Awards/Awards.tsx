"use client";

import { useRef } from "react";
import { awards } from "@/data/profile";
import { newestFirst } from "@/lib/dates";
import { AwardsAsciiBackground } from "../AwardsAsciiBackground/AwardsAsciiBackground";
import { AnimatedEntryTitle } from "../Section/AnimatedEntryTitle";
import { useEntryInteractions } from "../Section/useEntryInteractions";
import { useFiveItemScroller } from "../Section/useFiveItemScroller";
import styles from "../Section/Section.module.css";

export function Awards() {
  const sectionRef = useRef<HTMLElement>(null);
  const sortedAwards = newestFirst(awards);
  const hasOverflow = sortedAwards.length > 5;
  const listRef = useFiveItemScroller(hasOverflow);
  const entryInteractions = useEntryInteractions(sectionRef);

  return (
    <section ref={sectionRef} className={`${styles.section} ${styles.awardsSection}`} aria-labelledby="awards-title" data-section>
      <div className={styles.rule} data-line />
      <h2 id="awards-title" className={styles.srOnly}>Awards</h2>
      <div className={styles.awardsBody}>
        <AwardsAsciiBackground />
        <div
          ref={listRef}
          className={`${styles.list} ${styles.awardsList}${hasOverflow ? ` ${styles.scrollList}` : ""}`}
          data-awards-list
          data-scroll-list={hasOverflow ? "" : undefined}
          role={hasOverflow ? "region" : undefined}
          tabIndex={hasOverflow ? 0 : undefined}
          aria-label={hasOverflow ? "Scrollable awards list" : undefined}
        >
          {sortedAwards.map((item, index) => {
            return (
              <div
                className={`${styles.row} ${styles.awardsRow}`}
                key={`${item.year}-${item.title}-${index}`}
                {...entryInteractions}
                data-entry-row
              >
                <span className={styles.rowIndex}>{String(index + 1).padStart(2, "0")}</span>
                <AnimatedEntryTitle title={item.title} />
                <span className={styles.rowMeta}>{item.issuer}<br />{item.year}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
