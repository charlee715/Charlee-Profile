import { profile } from "@/data/profile";
import { ContactKineticBackground } from "../ContactKineticBackground/ContactKineticBackground";
import { FilmGrain } from "../FilmGrain/FilmGrain";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer} data-section>
      <ContactKineticBackground />
      <FilmGrain />
      <div className={styles.contact} data-reveal>
        <p className={styles.identity}><span>{profile.contactName}</span></p>
        <nav className={styles.links} aria-label="Contact links">
          {profile.github ? (
            <a href={profile.github} target="_blank" rel="noreferrer">GitHub</a>
          ) : (
            <span aria-disabled="true">GitHub</span>
          )}
          <a href={`mailto:${profile.email}`}>Mailbox</a>
          {profile.orcid ? (
            <a href={profile.orcid} target="_blank" rel="noreferrer">Orcid</a>
          ) : (
            <span aria-disabled="true">Orcid</span>
          )}
          <a href={profile.universityUrl} target="_blank" rel="noreferrer">
            {profile.university}
          </a>
        </nav>
      </div>
      <div className={styles.contactLabel} aria-hidden="true">CONTACT</div>
    </footer>
  );
}
