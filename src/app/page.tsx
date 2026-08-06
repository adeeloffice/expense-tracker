"use client";

import { useEffect, useRef } from "react";
import { useAuthStore, useExpenseStore, useSettingsStore, isFirebaseConfigured } from "@/lib/store";
import { LoginScreen } from "@/components/login-screen";

import { Dashboard } from "@/components/dashboard";
import { Wallet, CloudOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function FirebaseSetupGuide() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-950 dark:to-gray-900">
      <Card className="w-full max-w-lg shadow-xl border-0 dark:border dark:border-gray-800">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center">
            <CloudOff className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Firebase Not Configured</CardTitle>
          <CardDescription>
            Follow these steps to connect your app to Firebase for cloud sync
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
              <div className="text-sm space-y-3">
                <p className="font-medium text-amber-800 dark:text-amber-200">Quick Setup Steps:</p>
                <ol className="list-decimal list-inside space-y-2 text-amber-700 dark:text-amber-300">
                  <li>Go to <span className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">console.firebase.google.com</span></li>
                  <li>Create a new project (free)</li>
                  <li>Enable <strong>Authentication</strong> → Email/Password sign-in method</li>
                  <li>Create a <strong>Firestore Database</strong> (start in test mode)</li>
                  <li>Go to Project Settings → add a Web App → copy config</li>
                  <li>Paste the values into your <span className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">.env.local</span> file</li>
                  <li>Restart the dev server</li>
                </ol>
              </div>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Your .env.local file is located in your project root folder.
            Replace the placeholder values with your Firebase config.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const uid = useAuthStore((s) => s.uid);
  const initAuth = useAuthStore((s) => s.initAuth);
  const subscribeToExpenses = useExpenseStore((s) => s.subscribeToExpenses);
  const unsubscribeFromExpenses = useExpenseStore((s) => s.unsubscribeFromExpenses);
  const subscribeToSettings = useSettingsStore((s) => s.subscribeToSettings);
  const unsubscribeFromSettings = useSettingsStore((s) => s.unsubscribeFromSettings);

  const initRef = useRef(false);
  const prevUidRef = useRef<string | null>(null);

  // Initialize Firebase auth listener once
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const cleanup = initAuth();
    return cleanup;
  }, [initAuth]);

  // Subscribe/unsubscribe to Firestore when uid changes
  useEffect(() => {
    if (uid && uid !== prevUidRef.current) {
      prevUidRef.current = uid;
      subscribeToExpenses(uid);
      subscribeToSettings(uid);
    } else if (!uid && prevUidRef.current) {
      prevUidRef.current = null;
      unsubscribeFromExpenses();
      unsubscribeFromSettings();
    }
  }, [uid, subscribeToExpenses, unsubscribeFromExpenses, subscribeToSettings, unsubscribeFromSettings]);

  // Show Firebase setup guide if not configured
  if (!isFirebaseConfigured) {
    return <FirebaseSetupGuide />;
  }

  // Show loading while Firebase checks auth state
  if (isInitializing) {
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


  return <Dashboard />;
}
