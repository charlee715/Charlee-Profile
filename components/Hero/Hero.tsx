import { profile } from "@/data/profile";
import { InteractiveLines } from "@/components/InteractiveLines/InteractiveLines";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section id="top" className={styles.heroStage} aria-labelledby="hero-title" data-hero-stage>
      <div className={styles.hero}>
        {/* A normal anchor intentionally performs the requested full-page reset. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className={styles.eyebrow} href="/" aria-label="Refresh profile">PROFILE | {profile.year}</a>
        <div className={styles.nameClip}>
          <h1 id="hero-title" className={styles.name} data-hero-name>{profile.name}</h1>
        </div>
        <p className={styles.statement} data-hero-statement>{profile.statement}</p>
        <InteractiveLines />
      </div>
    </section>
  );
}
