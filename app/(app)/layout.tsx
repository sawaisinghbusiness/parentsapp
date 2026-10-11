"use client";

import { ParentProvider } from "@/lib/parent";
import { AppShell } from "@/components/AppShell";
import { SignInGate } from "@/components/SignInGate";

export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return (
    <SignInGate>
      <ParentProvider>
        <AppShell>{children}</AppShell>
      </ParentProvider>
    </SignInGate>
  );
}
