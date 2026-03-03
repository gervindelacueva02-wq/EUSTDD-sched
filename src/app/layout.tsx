import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EUSTDD Schedule - Event & Personnel Management",
  description: "EUSTDD Schedule application for managing events, personnel status, projects, and announcements. Track CTO/FL, WFH, and travel status.",
  keywords: ["EUSTDD", "Schedule", "Events", "Personnel", "Management", "Calendar"],
  authors: [{ name: "EUSTDD Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "EUSTDD Schedule",
    description: "Event & Personnel Management System",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EUSTDD Schedule",
    description: "Event & Personnel Management System",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
