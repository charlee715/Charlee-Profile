import styles from "./Section.module.css";

type AnimatedEntryTitleProps = {
  title: string;
};

export function AnimatedEntryTitle({ title }: AnimatedEntryTitleProps) {
  const words = title.trim().split(/\s+/);

  return (
    <span className={styles.rowTitle} data-entry-title>
      <span className={styles.rowTitleTrack} data-entry-title-track>
        {words.map((word, index) => (
          <span key={`${word}-${index}`}>
            <span className={styles.rowTitleWord} data-entry-word>
              {word}
            </span>
            {index < words.length - 1 ? "\u00a0" : null}
          </span>
        ))}
      </span>
    </span>
  );
}
