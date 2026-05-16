import { createFileRoute, Link } from "@tanstack/react-router";
import "@/styles/splash.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ORBIS — Meditative Idle Orbiter" },
      { name: "description", content: "Let your little world grow, introduce baddies, defend it. Or just let it grow." },
      { property: "og:title", content: "ORBIS — Meditative Idle Orbiter" },
      { property: "og:description", content: "Let your little world grow, introduce baddies, defend it. Or just let it grow." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="orbis-splash orbis-splash-body">
      <h1 className="sr-only">ORBIS — Meditative Idle Orbiter</h1>

      <div className="bg" aria-hidden="true">
        <div className="ribbon r1" />
        <div className="ribbon r2" />
        <div className="ribbon r3" />
        <div className="ribbon r4" />
        <div className="ribbon r5" />
        <div className="ribbon r6" />
      </div>
      <div className="vignette" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <main>
        <div className="topbar fade-up d1">
          <div className="left">
            <span className="dot" />
            <span>System alive</span>
          </div>
          <div className="right">
            <span>v 0.1 — slow build</span>
            <span className="sep" />
            <span>Field log</span>
          </div>
        </div>

        <section className="hero">
          <div className="mark fade-up d2">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <ellipse cx="50" cy="50" rx="42" ry="22" stroke="currentColor" strokeOpacity="0.35" strokeWidth="0.8" style={{ color: "var(--accent)" }} />
              <circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: "var(--accent)" }} />
              <circle cx="50" cy="50" r="9" fill="currentColor" fillOpacity="0.15" style={{ color: "var(--accent)" }} />
              <g className="orbit-spin">
                <circle cx="92" cy="50" r="4" fill="currentColor" style={{ color: "var(--accent)" }} />
                <circle cx="92" cy="50" r="6.5" fill="currentColor" fillOpacity="0.22" style={{ color: "var(--accent)" }} />
              </g>
            </svg>
            <p className="wordmark">ORBIS</p>
          </div>

          <p className="tagline fade-up d3">Meditative &nbsp;·&nbsp; Idle &nbsp;·&nbsp; Orbiter</p>

          <p className="description fade-up d4">Let your little world grow, introduce baddies, defend it. Or just let it grow.</p>
        </section>

        <section className="cards">
          <article className="card fade-up d5">
            <div className="num">01 / Cycle</div>
            <div className="icon">
              <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="22" cy="30" r="14" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.10" />
                <circle cx="38" cy="30" r="14" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.10" />
                <ellipse cx="30" cy="30" rx="20" ry="14" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.35" strokeDasharray="2 3" />
              </svg>
            </div>
            <h3>Grow</h3>
            <p>Circles drift, attract, and merge. Your ecosystem builds itself, slowly, while you do other things.</p>
          </article>

          <article className="card fade-up d6">
            <div className="num">02 / Cycle</div>
            <div className="icon">
              <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="30" cy="30" r="11" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.10" />
                <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                  <line x1="30" y1="6" x2="30" y2="14" />
                  <line x1="30" y1="46" x2="30" y2="54" />
                  <line x1="6" y1="30" x2="14" y2="30" />
                  <line x1="46" y1="30" x2="54" y2="30" />
                  <line x1="13" y1="13" x2="18" y2="18" />
                  <line x1="42" y1="42" x2="47" y2="47" />
                  <line x1="47" y1="13" x2="42" y2="18" />
                  <line x1="18" y1="42" x2="13" y2="47" />
                </g>
                <circle cx="30" cy="30" r="3" fill="currentColor" />
              </svg>
            </div>
            <h3>Defend</h3>
            <p>Turn on the baddies. Watch the invasion. Intervene — or don't. Endings are optional.</p>
          </article>

          <article className="card fade-up d7">
            <div className="num">03 / Cycle</div>
            <div className="icon">
              <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle className="breath-ring r3" cx="30" cy="30" r="26" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.6" fill="none" />
                <circle className="breath-ring r2" cx="30" cy="30" r="19" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.6" fill="none" />
                <circle className="breath-ring" cx="30" cy="30" r="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" fill="none" />
                <circle cx="30" cy="30" r="6" fill="currentColor" />
                <circle cx="30" cy="30" r="9" fill="currentColor" fillOpacity="0.25" />
              </svg>
            </div>
            <h3>Breathe</h3>
            <p>Leave it running. Check in. It's always doing something, even when you aren't looking.</p>
          </article>
        </section>

        <section className="cta">
          <h2 className="cta-heading fade-up d8">
            Live in your <em>world</em>.
          </h2>
          <Link to="/game" className="begin fade-up d8">
            Begin
          </Link>
          <p className="micro fade-up d8">
            No install <span>◦</span> No account <span>◦</span> Just open
          </p>
        </section>
      </main>

      <div className="signature">
        <div className="row">
          ORBIS <span className="sep" /> A quiet place to leave running
        </div>
        <div className="row">
          Built with
          <svg className="heart" width="11" height="10" viewBox="0 0 24 22" fill="currentColor" aria-label="love" role="img">
            <path d="M12 21s-7.5-4.6-10-9.5C0.5 8 2 3.5 6 3c2.4-.3 4.4 1 6 3 1.6-2 3.6-3.3 6-3 4 .5 5.5 5 4 8.5C19.5 16.4 12 21 12 21z" />
          </svg>
          by{" "}
          <a href="https://wtfisecho.com/antigravity" target="_blank" rel="noopener noreferrer">
            Jeremy Wright
          </a>
        </div>
      </div>
    </div>
  );
}
