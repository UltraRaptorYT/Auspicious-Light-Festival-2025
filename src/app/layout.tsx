import Head from "next/head";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ResponsiveToaster } from "@/components/ResponsiveToaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const MODEL_URL = "/vosk-model-small-cn-0.3.tar.gz";

export const metadata: Metadata = {
  title: "Auspicious Light Festival 2025",
  description: "Auspicious Light Festival 2025 by BW Monastery",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Head>
        <link
          rel="preload"
          href={MODEL_URL}
          as="fetch"
          crossOrigin="anonymous"
        />
      </Head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <ResponsiveToaster />
      </body>
    </html>
  );
}
