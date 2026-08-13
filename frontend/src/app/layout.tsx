import type { Metadata } from "next";
import { ThemeProvider, themeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elevate — AI-Powered Recruitment & ATS",
  description:
    "Companies post roles. Candidates apply. One ATS with AI match scores.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Source+Sans+3:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col bg-surface text-ink antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
