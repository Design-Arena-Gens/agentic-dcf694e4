import type { Metadata } from "next";
import "../styles/globals.css";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AI Customer Support",
  description: "Agentic AI support assistant",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
