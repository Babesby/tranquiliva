import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRANQUILIVA — Everyday mental wellbeing",
  description: "A private, calm space for reflection, practical support, moderated community and trusted therapists.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/tranquiliva-app-logo.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
