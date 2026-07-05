import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { ThemedToaster } from "@/components/themed-toaster";
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODE_STORAGE_KEY,
  MODES,
  STORAGE_KEY,
  THEME_IDS,
} from "@/lib/themes";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "wacrm - Self-Hostable CRM for WhatsApp",
    template: "%s — wacrm",
  },
  description: "Self-hostable CRM template for WhatsApp — shared inbox, contacts, sales pipelines, broadcasts, and no-code automations. Fork it, brand it, host it.",
  keywords: [
    "CRM",
    "WhatsApp",
    "WhatsApp Business API",
    "Next.js",
    "Supabase",
    "automation",
    "broadcast",
    "self-hosted",
    "template",
    "open-source",
    "customer support",
    "sales pipeline",
    "Kanban",
    "AI assistant",
  ],
  authors: [{ name: "Ashish Kumar" }],
  creator: "Ashish Kumar",
  publisher: "Ashish Kumar",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://wacrm.tech",
    siteName: "wacrm",
    title: "wacrm - Self-Hostable CRM for WhatsApp",
    description: "Self-hostable CRM template for WhatsApp — shared inbox, contacts, sales pipelines, broadcasts, and no-code automations.",
    images: [
      {
        url: "https://wacrm.tech/og-image.png",
        width: 1200,
        height: 630,
        alt: "wacrm - Self-Hostable CRM for WhatsApp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "wacrm - Self-Hostable CRM for WhatsApp",
    description: "Self-hostable CRM template for WhatsApp — shared inbox, contacts, sales pipelines, broadcasts, and no-code automations.",
    images: ["https://wacrm.tech/og-image.png"],
    creator: "@maajankiweb",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [{ url: "/favicon-32x32.svg", type: "image/svg+xml" }],
    shortcut: [
      { url: "/favicon-16x16.svg", sizes: "16x16", type: "image/svg+xml" },
      { url: "/favicon-32x32.svg", sizes: "32x32", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" }],
  },
  manifest: "/site.webmanifest",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://wacrm.tech",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

// Inline boot script — runs before React hydrates so the user's
// chosen accent (data-theme) AND mode (data-mode) are on the <html>
// element before first paint. Without this every page load flashes
// the server-rendered defaults for a frame before the React tree
// mounts and applies the picked values.
//
// Kept dependency-free (no imports, no JSX) — must be a string the
// browser can run as a single <script>. Knowledge of valid ids is
// sourced from the THEME_IDS / MODES constants so adding one doesn't
// silently break the boot path.
const THEME_BOOT_SCRIPT = `
(function(){
  var d = document.documentElement;
  try {
    var THEME_KEY = ${JSON.stringify(STORAGE_KEY)};
    var THEME_DEFAULT = ${JSON.stringify(DEFAULT_THEME)};
    var THEMES = ${JSON.stringify(THEME_IDS)};
    var savedTheme = localStorage.getItem(THEME_KEY);
    d.dataset.theme = THEMES.indexOf(savedTheme) !== -1 ? savedTheme : THEME_DEFAULT;

    var MODE_KEY = ${JSON.stringify(MODE_STORAGE_KEY)};
    var MODE_DEFAULT = ${JSON.stringify(DEFAULT_MODE)};
    var MODES = ${JSON.stringify(MODES)};
    var savedMode = localStorage.getItem(MODE_KEY);
    d.dataset.mode = MODES.indexOf(savedMode) !== -1 ? savedMode : MODE_DEFAULT;
  } catch (_e) {
    d.dataset.theme = ${JSON.stringify(DEFAULT_THEME)};
    d.dataset.mode = ${JSON.stringify(DEFAULT_MODE)};
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      data-mode={DEFAULT_MODE}
      data-scroll-behavior="auto"
      className={`${inter.variable} h-full antialiased`}
      // The `theme-boot` script below rewrites `data-theme` and
      // `data-mode` on <html> from localStorage before React hydrates,
      // so for any non-default choice the client DOM intentionally
      // differs from the server-rendered defaults. suppressHydration-
      // Warning silences the expected mismatch — it only applies to
      // this element's own attributes, so genuine mismatches in
      // children still surface.
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
        {/* Google Analytics / Plausible / Umami - Add your analytics here */}
        {/* <Script src="https://analytics.example.com/script.js" strategy="afterInteractive" /> */}

        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Structured Data for SEO */}
        <Script id="structured-data" type="application/ld+json" strategy="beforeInteractive">
          {`
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "wacrm",
              "description": "Self-hostable CRM template for WhatsApp — shared inbox, contacts, sales pipelines, broadcasts, and no-code automations.",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "All",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Person",
                "name": "Ashish Kumar"
              },
              "license": "https://opensource.org/licenses/MIT",
              "url": "https://wacrm.tech",
              "sameAs": [
                "https://github.com/maajankiweb/WhatsApp-CRM"
              ]
            }
          `}
        </Script>
      </head>
      <body className="min-h-full bg-background text-foreground font-sans" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <ThemedToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
