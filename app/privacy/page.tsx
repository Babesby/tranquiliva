import type { Metadata } from "next";
import { LegalShell, LegalSection } from "../_components/LegalShell";

export const metadata: Metadata = { title: "Privacy | Tranquiliva" };

export default function PrivacyPage() {
  return (
    <LegalShell title="Your privacy" intro="Your reflections are personal. This page explains the types of information used in Tranquiliva and the controls currently available to you.">
      <LegalSection title="What you may share">
        <p>Depending on the features you use, Tranquiliva may process your account email, display name, goals, check-in responses, journal entries, saved activities, and information you choose to provide when requesting support. You decide whether to write optional reflections.</p>
      </LegalSection>
      <LegalSection title="How information is stored">
        <p>Some features use storage on your device. Account sign-in uses Firebase Authentication, and configured account-sync and backup features may store associated information in Firebase services. These are not the same as files held only on your current device.</p>
        <p>Access to information depends on the feature and its configuration. Avoid including information you would not want to share in community areas or with other participants.</p>
      </LegalSection>
      <LegalSection title="Your controls">
        <p>Within your signed-in account, open “Privacy and account” to export data held by the browser or delete Tranquiliva data stored on that device. Deleting browser data does not, by itself, delete your Firebase account or copies held by connected services.</p>
        <p>To request help with account-level information or deletion, contact <a href="mailto:hello@tranquiliva.com">hello@tranquiliva.com</a>.</p>
      </LegalSection>
      <LegalSection title="AI conversations and other services">
        <p>Tranquiliva includes automated conversational tools and may use external service providers for features such as authentication and support. AI messages are not a confidential clinical consultation and should not replace care from a qualified professional.</p>
      </LegalSection>
      <LegalSection title="Advertising and questions">
        <p>Tranquiliva is designed as a wellbeing product, not an advertising marketplace for personal reflections. For questions about information handling, contact <a href="mailto:hello@tranquiliva.com">hello@tranquiliva.com</a>.</p>
      </LegalSection>
    </LegalShell>
  );
}
