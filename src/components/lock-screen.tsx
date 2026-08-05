"use client";

import { useState } from "react";
import { useAuthStore, useAuthHydrated } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, Eye, EyeOff, LogOut } from "lucide-react";

export function LockScreen() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const currentUser = useAuthStore((s) => s.currentUser);
  const unlock = useAuthStore((s) => s.unlock);
  const logout = useAuthStore((s) => s.logout);
  const hydrated = useAuthHydrated();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const success = await unlock(password);
      if (!success) {
        setError("Incorrect password");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-950 dark:to-gray-900">
      <Card className="w-full max-w-sm shadow-xl border-0 dark:border dark:border-gray-800">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center mb-2">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Locked
          </CardTitle>
          <CardDescription>
            Welcome back, <span className="font-semibold text-foreground">{currentUser}</span>. Enter your password to unlock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unlock-password">Password</Label>
              <div className="relative">
                <Input
                  id="unlock-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold bg-amber-500 hover:bg-amber-600 cursor-pointer"
              disabled={isLoading || !hydrated}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Unlocking...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Unlock
                </span>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full h-10 text-muted-foreground hover:text-destructive cursor-pointer"
              onClick={logout}
            >
              <LogOut className="w-4 h-4 mr-2" /> Switch Account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
