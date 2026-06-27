"use client";

import { AuthProvider } from "@/context/AuthContext";
import type { ReactNode } from "react";

export function ClientProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
