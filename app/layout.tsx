import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { CookieConsent } from "@/components/marketing/cookie-consent";
import { LocationPreference } from "@/components/marketing/location-preference";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppProviders } from "@/components/ui/providers";
import { getCurrentPublicUser } from "@/lib/auth/session";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://agilemindshub.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Agile Minds Hub",
  description:
    "Product strategy, AI learning, and MVP execution: from idea to buildable plan.",
  openGraph: {
    type: "website",
    siteName: "Agile Minds Hub",
    title: "Agile Minds Hub",
    description:
      "Product strategy, AI learning, and MVP execution: from idea to buildable plan.",
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agile Minds Hub",
    description:
      "Product strategy, AI learning, and MVP execution: from idea to buildable plan.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentPublicUser();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>
          <AuthProvider initialUser={user}>{children}</AuthProvider>
        </AppProviders>
        <LocationPreference />
        <CookieConsent />
      </body>
    </html>
  );
}