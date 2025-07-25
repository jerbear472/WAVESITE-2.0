import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "WaveSight - Trend Intelligence",
  description: "Spot trends before they break. AI-powered social media analytics.",
  keywords: "trends, social media, analytics, AI, viral content",
  authors: [{ name: "WaveSight" }],
  openGraph: {
    title: "WaveSight - Trend Intelligence",
    description: "Spot trends before they break. AI-powered social media analytics.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased bg-white dark:bg-neutral-950 text-gray-900 dark:text-gray-100">
        <Providers>
          <div className="min-h-full">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
