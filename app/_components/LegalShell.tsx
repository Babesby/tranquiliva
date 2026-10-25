import type { ReactNode } from "react";

export function LegalShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="legal-shell">
      <header className="legal-topbar">
        <a className="logo" href="/" aria-label="Tranquiliva homepage">
          <img className="brand-logo-icon" src="/tranquiliva-app-logo.png" alt="" />
          <strong>TRANQUILIVA</strong>
        </a>
        <a href="/">Back to home</a>
      </header>
      <main className="legal-content">
        <span className="legal-eyebrow">Tranquiliva · Information</span>
        <h1>{title}</h1>
        <p className="legal-intro">{intro}</p>
        {children}
      </main>
      <nav className="legal-bottom" aria-label="Information pages">
        <a href="/">Home</a>
        <a href="/privacy">Privacy</a>
        <a href="/safety">Safety</a>
        <a href="/terms">Terms</a>
        <a href="/accessibility">Accessibility</a>
        <a href="mailto:hello@tranquiliva.com">Contact support</a>
        <span>from ALLMORROW</span>
      </nav>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
