import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
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
  title: {
    default:  "NextFlow",
    template: "%s | NextFlow",
  },
  description: "Build, run, and monitor AI-powered workflows — visually, in real time, for free.",
  keywords:    ["workflow automation", "AI workflows", "visual programming", "no-code", "LLM"],
  openGraph: {
    title:       "NextFlow",
    description: "Build, run, and monitor AI-powered workflows — visually, in real time, for free.",
    type:        "website",
    siteName:    "NextFlow",
  },
  twitter: {
    card:        "summary_large_image",
    title:       "NextFlow",
    description: "Build, run, and monitor AI-powered workflows — visually, in real time, for free.",
  },
  robots: {
    index:  true,
    follow: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-dvh antialiased`}
      >
        <body className="h-full overflow-hidden">{children}</body>
      </html>
    </ClerkProvider>
  );
}
