import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";

export const metadata: Metadata = {
  title: "WaveSight - Get Paid to Spot Viral Trends",
  description: "Human spotters catch cultural shifts 2 weeks early. Earn money by identifying viral content before it trends.",
  keywords: "get paid, spot trends, viral content, earn money online, social media trends, trend spotting",
  authors: [{ name: "WaveSight" }],
  openGraph: {
    title: "WaveSight - Get Paid to Spot Viral Trends",
    description: "Human spotters catch cultural shifts 2 weeks early. Earn money by identifying viral content before it trends.",
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
        <GlobalErrorBoundary>
          <Providers>
            <div className="min-h-full dynamic-vh">
              {children}
            </div>
          </Providers>
        </GlobalErrorBoundary>
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
