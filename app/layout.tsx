import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { normalizeSiteOrigin } from "@/lib/utils/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(normalizeSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL)),
  applicationName: "Tandem",
  title: "Tandem — group trip planning, together",
  description: "Bring your group trip out of the group chat. Plan the itinerary, lodging, flights, food, expenses, and decisions together in Tandem.",
  openGraph: {
    type: "website",
    siteName: "Tandem",
    title: "Tandem — group trip planning, together",
    description: "Bring your group trip out of the group chat. Keep every plan and decision together in Tandem.",
    images: [{ url: "/og-invite.png", width: 1200, height: 630, alt: "You’re invited to plan a trip in Tandem" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tandem — group trip planning, together",
    description: "Bring your group trip out of the group chat. Keep every plan and decision together in Tandem.",
    images: ["/og-invite.png"],
  },
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored ? stored === 'dark' : true;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

const GOOGLE_MAPS_AUTH_SCRIPT = `
window.gm_authFailure = function () {
  window.__googleMapsAuthFailed = true;
  window.dispatchEvent(new Event('google-maps-auth-failure'));
};
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <Script id="google-maps-auth-listener" strategy="beforeInteractive">
          {GOOGLE_MAPS_AUTH_SCRIPT}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}
