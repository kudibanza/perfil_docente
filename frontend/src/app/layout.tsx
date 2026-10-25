import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Universidade de Luanda", template: "%s | UniLuanda" },
  description:
    "Portal de docentes, funcionários e investigadores científicos da Universidade de Luanda.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
