"use client";

import { ParentProvider } from "@/lib/parent";
import { AppShell } from "@/components/AppShell";

export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return (
    <ParentProvider>
      <AppShell>{children}</AppShell>
    </ParentProvider>
  );
}
