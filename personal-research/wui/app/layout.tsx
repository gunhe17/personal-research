import type { Metadata } from "next";
import type { ReactNode } from "react";
import Shell from "@/features/shell/Shell";
import WorkbenchProvider from "@/features/workbench/WorkbenchProvider";
import Toaster from "@/ui/Toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Research",
  icons: { icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='7' fill='none' stroke='%230071e3' stroke-width='2'/%3E%3Cpath d='M16.5 16.5L21 21' stroke='%230071e3' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <style>{"::highlight(doc-selection){background-color:#d1e8ff;color:#1d1d1f}::highlight(annotations){background-color:#fff1b8}"}</style>
      </head>
      <body className="booting h-full overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased">
        <WorkbenchProvider>
          <Shell>{children}</Shell>
        </WorkbenchProvider>
        <Toaster />
      </body>
    </html>
  );
}
