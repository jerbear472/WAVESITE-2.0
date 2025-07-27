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
    <html lang="en" className="h-full smooth-scroll">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="h-full antialiased bg-white dark:bg-neutral-950 text-gray-900 dark:text-gray-100 responsive-container">
        <Providers>
          <div className="min-h-full dynamic-vh">
            {children}
          </div>
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Set viewport height for mobile
              function setVH() {
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', vh + 'px');
              }
              setVH();
              window.addEventListener('resize', setVH);
              window.addEventListener('orientationchange', () => setTimeout(setVH, 100));
            `,
          }}
        />
      </body>
    </html>
  );
}
