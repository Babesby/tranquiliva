import type { Metadata } from "next";
import { LegalShell, LegalSection } from "../_components/LegalShell";

export const metadata: Metadata = { title: "Accessibility | Tranquiliva" };

export default function AccessibilityPage() {
  return (
    <LegalShell title="Accessibility" intro="We want Tranquiliva to feel clear, navigable and welcoming across devices, including for people using assistive technology.">
      <LegalSection title="Using the interface">
        <p>The website is designed for desktop and mobile screens, with text labels alongside illustrated controls and visible selection states. Interactive controls can be used with a keyboard, and key actions are identified in text rather than illustration alone.</p>
      </LegalSection>
      <LegalSection title="Reading comfortably">
        <p>Use your browser’s zoom, text-size and other accessibility settings to adjust the experience. Some screens also support a darker visual theme.</p>
      </LegalSection>
      <LegalSection title="Report a barrier">
        <p>Accessibility is ongoing work. If you have trouble navigating, reading or completing an action, tell us which page or action was affected and what device or assistive technology you use, if you are comfortable sharing it. Email <a href="mailto:hello@tranquiliva.com">hello@tranquiliva.com</a>.</p>
      </LegalSection>
    </LegalShell>
  );
}
