import type { Metadata } from "next";
import { LegalShell, LegalSection } from "../_components/LegalShell";

export const metadata: Metadata = { title: "Safety | Tranquiliva" };

export default function SafetyPage() {
  return (
    <LegalShell title="Your safety matters" intro="Tranquiliva offers space to reflect and look for support. It is not an emergency service or a substitute for clinical care.">
      <LegalSection title="When you need immediate help">
        <p>If you or someone else may be in immediate danger, contact local emergency services or go to the nearest emergency department. For country-specific emotional support resources, you can visit <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">Find A Helpline</a>.</p>
      </LegalSection>
      <LegalSection title="Reflections and assessments">
        <p>Mood check-ins, AI conversations, exercises and self-assessments are offered for personal reflection and general wellbeing education. They do not diagnose a condition, prescribe treatment, or create a therapist-patient relationship.</p>
      </LegalSection>
      <LegalSection title="Community interactions">
        <p>Respect others’ privacy. Do not share another person’s personal details, threaten or harass other members, or assume that community posts are medical advice. Report safety concerns to <a href="mailto:hello@tranquiliva.com">hello@tranquiliva.com</a>.</p>
      </LegalSection>
      <LegalSection title="Professional support">
        <p>If you seek a therapist, check the professional’s credentials, scope of practice, location and availability before beginning care. You may need a local licensed professional for diagnosis, treatment or emergencies.</p>
      </LegalSection>
    </LegalShell>
  );
}
