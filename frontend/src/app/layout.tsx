import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Elevate — AI-Powered Recruitment & ATS",
  description:
    "Companies post roles. Candidates apply. One kanban ATS with AI resume match scores from Applied to Hired.",
  keywords: [
    "ATS",
    "applicant tracking",
    "AI recruitment",
    "hiring pipeline",
    "Elevate",
    "DevFusion",
  ],
  openGraph: {
    title: "Elevate — AI-Powered Recruitment & ATS",
    description:
      "Five roles. One hiring system. Kanban pipeline plus AI match scores.",
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
        className={`${syne.variable} ${dmSans.variable} antialiased min-h-screen flex flex-col`}
      >
        {children}
      </body>
    </html>
  );
}
