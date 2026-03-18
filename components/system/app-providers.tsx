"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import ToasterProvider from "@/components/system/toaster-provider";

/**
 * Wraps global client-side providers used across app routes.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        {children}
        <ToasterProvider />
      </AuthProvider>
    </ThemeProvider>
  );
}
