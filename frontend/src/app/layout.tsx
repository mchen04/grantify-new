import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";
import StructuredData from "@/components/seo/StructuredData";
// import CookieConsent from "@/components/common/CookieConsent";
import Script from "next/script";
import type { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Find Research Grants 2025 | AI Grant Discovery - Grantify",
    template: "%s | Grantify"
  },
  description: "Discover perfect grant opportunities with AI-powered matching. Search 5,000+ active grants, get personalized recommendations, never miss deadlines. Start free today.",
  keywords: [
    "grants for nonprofits",
    "research grants",
    "academic grants",
    "federal grants",
    "grant search",
    "find grants",
    "grant opportunities",
    "funding opportunities",
    "NIH grants",
    "NSF grants",
    "grants.gov search",
    "grant database",
    "research funding",
    "nonprofit funding",
    "foundation grants",
    "grant matching",
    "AI grant discovery",
    "grant deadline tracker",
    "SBIR grants",
    "R01 grants",
    "community grants",
    "education grants",
    "healthcare grants",
    "environmental grants",
    "arts grants",
    "small business grants",
    "grant application tracker",
    "free grant search"
  ],
  authors: [{ name: "Michael Chen", url: "https://linkedin.com/in/michael-luo-chen" }],
  creator: "Michael Chen",
  publisher: "Grantify.ai",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://grantify.ai"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Grantify - Search NIH, NSF & Federal Grants with AI Matching",
    description: "One search across Grants.gov, NIH, NSF, and 5+ funding sources. AI matches grants to your profile. Track deadlines, save searches. 100% free grant discovery.",
    url: "https://grantify.ai",
    siteName: "Grantify",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Grantify - Search Federal Grants from NIH, NSF, Grants.gov",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Grantify - AI Grant Search for NIH, NSF & Federal Funding",
    description: "Search all federal grants in one place. AI matching finds grants you'd miss. Track deadlines and applications. Free for researchers & nonprofits.",
    images: ["/twitter-image.png"],
    creator: "@grantifyai",
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
  other: {
    "ai-content-discovery": "enabled",
    "ai-search-optimization": "enabled", 
    "claude-indexing": "allowed",
    "perplexity-indexing": "allowed",
    "chatgpt-indexing": "allowed",
  },
  verification: {
    google: "your-google-site-verification-code",
    yandex: "your-yandex-verification-code",
    yahoo: "your-yahoo-verification-code",
  },
  category: "technology",
  classification: "Research Tools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9240750767025089"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <Script id="error-handler" strategy="afterInteractive">
          {`
            // Handle unhandled promise rejections with Event objects
            window.addEventListener('unhandledrejection', function(event) {
              if (event.reason instanceof Event) {
                
                event.preventDefault();
                return;
              }
              // Also catch DOMException and other browser event-like objects
              if (event.reason && typeof event.reason === 'object' && 'type' in event.reason) {
                
                event.preventDefault();
                return;
              }
            });

            // Wrap window.dispatchEvent to catch Event dispatch errors
            const originalDispatchEvent = window.dispatchEvent;
            window.dispatchEvent = function(event) {
              try {
                return originalDispatchEvent.call(this, event);
              } catch (error) {
                
                return false;
              }
            };
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <StructuredData />
        <ClientLayout>
          {children}
        </ClientLayout>
        {/* <CookieConsent /> */}
      </body>
    </html>
  );
}
