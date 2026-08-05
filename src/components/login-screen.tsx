"use client";

import { useState } from "react";
import { useAuthStore, SECURITY_QUESTIONS } from "@/lib/store";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wallet, Eye, EyeOff, LogIn, UserPlus, KeyRound, ArrowLeft } from "lucide-react";

type Screen = "login" | "forgot";

export function LoginScreen() {
  const [screen, setScreen] = useState<Screen>("login");
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Security question fields (signup)
  const [securityQ, setSecurityQ] = useState("");
  const [securityA, setSecurityA] = useState("");

  // Forgot password fields
  const [forgotUsername, setForgotUsername] = useState("");
  const [fetchedQuestion, setFetchedQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const getSecurityQuestion = useAuthStore((s) => s.getSecurityQuestion);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      if (!username.trim() || !password.trim()) {
        setError("Please fill in all fields");
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
      if (!securityQ) {
        setError("Please select a security question");
        return;
      }
      if (!securityA.trim()) {
        setError("Please answer the security question");
        return;
      }
      const result = await signup(username.trim(), password, securityQ, securityA);
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

  const handleForgotStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotLoading(true);
    try {
      if (!forgotUsername.trim()) {
        setForgotError("Please enter your username");
        return;
      }
      const result = await getSecurityQuestion(forgotUsername.trim());
      if (!result.success) {
        setForgotError(result.error || "User not found");
        return;
      }
      setFetchedQuestion(result.question || "");
      setForgotStep(2);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!securityAnswer.trim()) {
      setForgotError("Please enter your answer");
      return;
    }
    setForgotStep(3);
  };

  const handleForgotStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotLoading(true);
    try {
      if (newPassword.length < 6) {
        setForgotError("Password must be at least 6 characters");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setForgotError("Passwords do not match");
        return;
      }
      const result = await resetPassword(forgotUsername.trim(), securityAnswer, newPassword);
      if (!result.success) {
        setForgotError(result.error || "Failed to reset password");
        return;
      }
      setForgotSuccess(true);
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotFlow = () => {
    setScreen("login");
    setForgotUsername("");
    setFetchedQuestion("");
    setSecurityAnswer("");
    setNewPassword("");
    setConfirmNewPassword("");
    setForgotStep(1);
    setForgotError("");
    setForgotSuccess(false);
  };

  // Forgot Password Dialog
  const forgotPasswordDialog = (
    <Dialog open={screen === "forgot"} onOpenChange={(open) => { if (!open) resetForgotFlow(); }}>
      <DialogContent className="sm:max-w-md">
        {forgotSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <KeyRound className="w-5 h-5" /> Password Reset!
              </DialogTitle>
              <DialogDescription>
                Your password has been reset successfully. You can now sign in with your new password.
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
                {forgotStep === 1 && "Enter your username to look up your security question"}
                {forgotStep === 2 && `Answer your security question`}
                {forgotStep === 3 && "Enter your new password"}
              </DialogDescription>
            </DialogHeader>

            {forgotStep === 1 && (
              <form onSubmit={handleForgotStep1} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-username">Username</Label>
                  <Input
                    id="forgot-username"
                    placeholder="Enter your username"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    className="h-11"
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
                    {forgotLoading ? "Loading..." : "Continue"}
                  </Button>
                </DialogFooter>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleForgotStep2} className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm font-medium">{fetchedQuestion}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="security-answer">Your Answer</Label>
                  <Input
                    id="security-answer"
                    placeholder="Type your answer"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="h-11"
                  />
                </div>
                {forgotError && (
                  <p className="text-sm text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-md">{forgotError}</p>
                )}
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => { setForgotStep(1); setForgotError(""); }} className="cursor-pointer">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                    Continue
                  </Button>
                </DialogFooter>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleForgotStep3} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="h-11"
                  />
                </div>
                {forgotError && (
                  <p className="text-sm text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-md">{forgotError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Note: Password reset requires server configuration (Firebase Admin SDK). If it fails, you may need to create a new account.
                </p>
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => { setForgotStep(2); setForgotError(""); }} disabled={forgotLoading} className="cursor-pointer">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button type="submit" disabled={forgotLoading} className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                    {forgotLoading ? "Resetting..." : "Reset Password"}
                  </Button>
                </DialogFooter>
              </form>
            )}
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
            {isSignUp ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? "Sign up to start tracking your expenses"
              : "Sign in to your expense tracker"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSignUp ? (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="h-11"
                />
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

              <div className="space-y-2">
                <Label>Security Question</Label>
                <Select value={securityQ} onValueChange={setSecurityQ}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select a security question" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECURITY_QUESTIONS.map((q) => (
                      <SelectItem key={q} value={q}>
                        {q}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="security-answer">Security Answer</Label>
                <Input
                  id="security-answer"
                  placeholder="Your answer (used for password reset)"
                  value={securityA}
                  onChange={(e) => setSecurityA(e.target.value)}
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
                  onClick={() => { setIsSignUp(false); setError(""); setConfirmPassword(""); setSecurityQ(""); setSecurityA(""); }}
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
                  autoComplete="username"
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
