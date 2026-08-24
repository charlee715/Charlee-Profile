import type { Metadata } from "next";
import { PageLoader } from "@/components/PageLoader/PageLoader";
import { withBasePath } from "@/lib/paths";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Charlee Profile",
  title: "Charlee — Profile 2026",
  description: "Selected research, publications, awards, and contact details.",
  icons: { icon: withBasePath("/favicon.svg") },
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
  const assetVariables = {
    "--paper-texture": `url("${withBasePath("/xuan-paper-texture.png")}")`,
    "--contact-background": `url("${withBasePath("/images/contact-background-charlee-final.png")}")`,
  } as React.CSSProperties;

  return (
    <html lang="en" style={assetVariables}>
      <body>
        <PageLoader />
        {children}
      </body>
    </html>
  );
}
