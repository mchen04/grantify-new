import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Grantify.ai - AI Grant Discovery Platform by Michael Chen",
  description: "Learn about Grantify.ai, created by Michael Chen (UC Riverside CS, AMD AI Contest Winner). Democratizing access to research funding through advanced AI technology.",
  keywords: [
    "about grantify",
    "michael chen", 
    "grant discovery platform",
    "AI grant matching",
    "research funding platform",
    "UC Riverside",
    "AMD AI contest",
    "grant search founder",
    "funding discovery",
    "research grants AI"
  ],
  openGraph: {
    title: "About Grantify.ai - Mission to Democratize Grant Discovery",
    description: "Founded by Michael Chen (UC Riverside, AMD AI Contest Winner) to solve grant discovery inefficiencies. 85% match accuracy, 2,000+ grants.",
  },
  twitter: {
    title: "About Grantify.ai - AI Grant Discovery Platform", 
    description: "Founded by Michael Chen to democratize access to research funding through AI.",
  },
};

export default function InfoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}