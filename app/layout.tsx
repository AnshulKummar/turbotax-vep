import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TurboTax Virtual Expert Workbench",
  description:
    "Expert workbench for the TurboTax Virtual Expert Platform prototype.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="preconnect"
          href="https://rsms.me/"
        />
        <link
          rel="stylesheet"
          href="https://rsms.me/inter/inter.css"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
