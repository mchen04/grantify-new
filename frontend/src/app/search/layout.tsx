import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Grants - Find Research Funding & Government Grants",
  description: "Search 2,000+ grants with AI-powered matching. Find research funding, government grants, NIH grants, NSF grants, and more. Advanced filters, instant results.",
  keywords: [
    "grant search",
    "research funding search", 
    "government grant search",
    "NIH grant search",
    "NSF grant search",
    "scholarship search",
    "funding database",
    "grant filter",
    "research grant finder",
    "academic funding search"
  ],
  openGraph: {
    title: "Search Grants - AI-Powered Grant Discovery",
    description: "Find relevant grants in seconds with advanced AI matching. Search 2,000+ funding opportunities with smart filters.",
    url: "https://grantify.ai/search",
  },
  twitter: {
    title: "Search Grants - AI-Powered Grant Discovery", 
    description: "Find relevant grants in seconds with advanced AI matching. Search 2,000+ funding opportunities.",
  },
  alternates: {
    canonical: "/search",
  },
};

export default function SearchLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Don't wrap search page in SearchProvider since it manages its own state
    <>{children}</>
  );
}