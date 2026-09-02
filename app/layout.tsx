import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { CookieConsent } from "@/components/marketing/cookie-consent";
import { AuthProvider } from "@/components/auth/auth-provider";
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

export const metadata: Metadata = {
  title: "Rapid Launch",
  description:
    "Product strategy, AI learning, and MVP execution: from idea to buildable plan.",
  icons: {
    icon: "/logo-icon.svg",
    apple: "/logo-icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentPublicUser();

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider initialUser={user}>{children}</AuthProvider>
        <CookieConsent />
      </body>
    </html>
  );
}