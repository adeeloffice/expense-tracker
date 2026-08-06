"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/store";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wallet, Eye, EyeOff, LogIn, UserPlus, KeyRound, Mail, ArrowLeft } from "lucide-react";

type Screen = "login" | "forgot";

export function LoginScreen() {
  const [screen, setScreen] = useState<Screen>("login");
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password fields
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const forgotPassword = useAuthStore((s) => s.forgotPassword);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      if (!username.trim() || !password.trim()) {
        setError("Username and password are required");
        return;
      }
      if (username.trim().length < 2) {
        setError("Username must be at least 2 characters");
        return;
      }
      if (email.trim() && (!email.trim().includes("@") || !email.trim().includes("."))) {
        setError("Please enter a valid email address");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      const result = await signup(username.trim(), email.trim(), password);
      if (!result.success) {
        setError(result.error || "Signup failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      if (!username.trim() || !password.trim()) {
        setError("Please fill in all fields");
        return;
      }
      const result = await login(username.trim(), password);
      if (!result.success) {
        setError(result.error || "Login failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotLoading(true);
    try {
      if (!forgotUsername.trim()) {
        setForgotError("Please enter your username");
        return;
      }
      const result = await forgotPassword(forgotUsername.trim());
      if (!result.success) {
        setForgotError(result.error || "Failed to send reset email");
        return;
      }
      setForgotEmail((result as { email: string }).email || "");
      setForgotSuccess(true);
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotFlow = () => {
    setScreen("login");
    setForgotUsername("");
    setForgotError("");
    setForgotSuccess(false);
    setForgotEmail("");
  };

  // Forgot Password Dialog
  const forgotPasswordDialog = (
    <Dialog open={screen === "forgot"} onOpenChange={(open) => { if (!open) resetForgotFlow(); }}>
      <DialogContent className="sm:max-w-md">
        {forgotSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <Mail className="w-5 h-5" /> Check Your Email!
              </DialogTitle>
              <DialogDescription className="space-y-2">
                <p>A password reset link has been sent to:</p>
                <p className="font-semibold text-foreground">{forgotEmail}</p>
                <p className="text-xs">Check your inbox and spam/junk folder. Click the link in the email to set a new password.</p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={resetForgotFlow}
                className="w-full bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
              >
                Back to Sign In
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" /> Forgot Password
              </DialogTitle>
              <DialogDescription>
                Enter your username and we will send a password reset link to your email.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-username">Username</Label>
                <Input
                  id="forgot-username"
                  placeholder="Enter your username"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  className="h-11"
                  autoFocus
                />
              </div>

              {forgotError && (
                <p className="text-sm text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-md">{forgotError}</p>
              )}

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={resetForgotFlow} className="cursor-pointer">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button type="submit" disabled={forgotLoading} className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                  {forgotLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-950 dark:to-gray-900">
      <Card className="w-full max-w-md shadow-xl border-0 dark:border dark:border-gray-800">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mb-2">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isSignUp ? "Create Account" : "Expense Tracker"}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? "Create your account to start tracking expenses"
              : "Sign in to manage your expenses"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSignUp ? (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email Address <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <div className="relative">
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="off"
                    className="h-11"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                <p className="text-xs text-muted-foreground">Add email to enable password reset if you forget your password</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="h-11"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Sign Up
                  </span>
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(""); setConfirmPassword(""); setEmail(""); }}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-username">Username</Label>
                <Input
                  id="login-username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" /> Sign In
                  </span>
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setScreen("forgot")}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
                <span className="text-muted-foreground">
                  No account?{" "}
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(true); setError(""); }}
                    className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                  >
                    Sign Up
                  </button>
                </span>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Your data syncs across all devices via cloud storage
              </p>
            </form>
          )}
        </CardContent>
      </Card>

      {forgotPasswordDialog}
    </div>
  );
}
