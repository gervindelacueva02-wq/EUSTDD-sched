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
  description: "Official EUSTDD Scheduling System powered by DOST-PCIEERD.",
  keywords: ["EUSTDD", "Scheduling System", "DOST-PCIEERD", "University System"],
  authors: [{ name: "EUSTDD Interns" }],
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "EUSTDD Schedule",
    description: "Official EUSTDD Scheduling System powered by DOST-PCIEERD.",
    url: "https://eustdd-schedule.onrender.com",
    siteName: "EUSTDD Schedule",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EUSTDD Schedule",
    description: "Official EUSTDD Scheduling System powered by DOST-PCIEERD.",
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