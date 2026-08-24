import type { Metadata } from "next";
import { PageLoader } from "@/components/PageLoader/PageLoader";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Charlee Profile",
  title: "Charlee — Profile 2026",
  description: "Selected research, publications, awards, and contact details.",
  icons: { icon: "/favicon.svg" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Charlee — Profile 2026",
    description: "Selected research, publications, awards, and contact details.",
  },
  twitter: {
    card: "summary",
    title: "Charlee — Profile 2026",
    description: "Selected research, publications, awards, and contact details.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PageLoader />
        {children}
      </body>
    </html>
  );
}
