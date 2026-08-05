"use client";

import { useAuthStore, useAuthHydrated } from "@/lib/store";
import { LoginScreen } from "@/components/login-screen";
import { LockScreen } from "@/components/lock-screen";
import { Dashboard } from "@/components/dashboard";
import { Wallet } from "lucide-react";

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLocked = useAuthStore((s) => s.isLocked);
  const hydrated = useAuthHydrated();

  // Wait for Zustand persist to rehydrate from localStorage before rendering anything
  // This fixes the signup→signout→signin "user not exist" bug
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-950 dark:to-gray-900">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center animate-pulse">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <p className="text-muted-foreground text-sm">Loading your data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (isLocked) {
    return <LockScreen />;
  }

  return <Dashboard />;
}
