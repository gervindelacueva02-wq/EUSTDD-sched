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
  title: "EUSTDD Schedule",
  description: "EUSTDD Schedule Management System - Track events, personnel status, and projects",
  keywords: ["EUSTDD", "Schedule", "Events", "Personnel", "Project Management"],
  authors: [{ name: "EUSTDD" }],
  icons: {
    icon: "/DOST1.png",
    shortcut: "/DOST1.png",
    apple: "/DOST1.png",
  },
  openGraph: {
    title: "EUSTDD Schedule",
    description: "EUSTDD Schedule Management System",
    type: "website",
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
