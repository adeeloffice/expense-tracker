"use client";

import { useAuthStore } from "@/lib/store";
import { LoginScreen } from "@/components/login-screen";
import { LockScreen } from "@/components/lock-screen";
import { Dashboard } from "@/components/dashboard";

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLocked = useAuthStore((s) => s.isLocked);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (isLocked) {
    return <LockScreen />;
  }

  return <Dashboard />;
}
