import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import Script from "next/script";
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
      <head>
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1541653908008877');
              fbq('track', 'PageView');
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1541653908008877&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <AppProviders>
          <AuthProvider initialUser={user}>{children}</AuthProvider>
        </AppProviders>
        <LocationPreference />
        <CookieConsent />
      </body>
    </html>
  );
}