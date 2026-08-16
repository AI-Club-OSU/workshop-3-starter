import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Workshop 3 Showcase | AI Club at Oregon State",
  description:
    "Explore the websites built by AI Club at Oregon State participants during Workshop 3, or sign in with ChatGPT to share your own.",
  openGraph: {
    title: "Workshop 3 Showcase | AI Club at Oregon State",
    description:
      "A gallery of websites created by AI Club at Oregon State participants during Workshop 3.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Workshop 3 Showcase | AI Club at Oregon State",
    description:
      "See what AI Club at Oregon State participants made during Workshop 3.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
