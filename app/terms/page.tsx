import type { Metadata } from "next";
import { LegalShell, LegalSection } from "../_components/LegalShell";

export const metadata: Metadata = { title: "Terms | Tranquiliva" };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of use" intro="A straightforward overview of the expectations that support a respectful and safe Tranquiliva experience.">
      <LegalSection title="Using Tranquiliva">
        <p>Use the platform lawfully, protect your sign-in credentials, and provide accurate information where it is necessary to access a service. Please do not impersonate others, disrupt the service, or access another person’s information without permission.</p>
      </LegalSection>
      <LegalSection title="Wellbeing content">
        <p>The platform provides educational material, exercises and reflection tools. It does not replace medical diagnosis, emergency assistance or treatment from a licensed professional. Make your own decisions about when to seek qualified care.</p>
      </LegalSection>
      <LegalSection title="Your content and community conduct">
        <p>You are responsible for the material you choose to share. Avoid posting private information about other people or harmful, threatening or abusive content. Use community tools with care and respect for other members.</p>
      </LegalSection>
      <LegalSection title="Availability and changes">
        <p>Features may change as Tranquiliva develops. External websites and professional services have their own rules and availability. Questions about access or this page can be sent to <a href="mailto:hello@tranquiliva.com">hello@tranquiliva.com</a>.</p>
      </LegalSection>
    </LegalShell>
  );
}
