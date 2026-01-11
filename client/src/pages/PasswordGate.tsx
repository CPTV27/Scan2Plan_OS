import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SessionStatus {
  authenticated: boolean;
  email: string | null;
  isEmailAllowed: boolean;
  hasPassword: boolean;
  passwordVerified: boolean;
  needsPasswordSetup: boolean;
  needsPasswordVerification: boolean;
  accessGranted: boolean;
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: sessionStatus, isLoading } = useQuery<SessionStatus>({
    queryKey: ["/api/auth/session-status"],
    retry: false,
    refetchOnWindowFocus: true,
  });

  const verifyPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/auth/verify-password", { password });
      return res.json();
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session-status"] });
    },
    onError: async (error: any) => {
      const data = await error.response?.json?.() || {};
      if (data.lockedOut) {
        setError("Too many failed attempts. Please try again in 15 minutes.");
      } else {
        setError(data.message || "Invalid password");
        if (data.remainingAttempts !== undefined) {
          setError(`Invalid password. ${data.remainingAttempts} attempts remaining.`);
        }
      }
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: async ({ password, confirmPassword }: { password: string; confirmPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/set-password", { password, confirmPassword });
      return res.json();
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session-status"] });
    },
    onError: async (error: any) => {
      const data = await error.response?.json?.() || {};
      setError(data.message || "Failed to set password");
    },
  });

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    verifyPasswordMutation.mutate(password);
  };

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setPasswordMutation.mutate({ password, confirmPassword });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sessionStatus?.authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in with your Replit account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-login"
            >
              Sign In with Replit
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionStatus.isEmailAllowed) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              This application is restricted to @scan2plan.io email addresses only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Your email <strong>{sessionStatus.email}</strong> is not authorized to access this application.
              </AlertDescription>
            </Alert>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionStatus.needsPasswordSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-primary" />
            <CardTitle>Set Up Your Password</CardTitle>
            <CardDescription>
              Create a password to secure your account. You'll need this password each time you sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetPassword} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a strong password"
                  minLength={8}
                  required
                  data-testid="input-password"
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  data-testid="input-confirm-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={setPasswordMutation.isPending}
                data-testid="button-set-password"
              >
                {setPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting Password...
                  </>
                ) : (
                  "Set Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionStatus.needsPasswordVerification) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-primary" />
            <CardTitle>Enter Your Password</CardTitle>
            <CardDescription>
              Welcome back! Please enter your password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyPassword} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  data-testid="input-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={verifyPasswordMutation.isPending}
                data-testid="button-verify-password"
              >
                {verifyPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>

              <div className="text-center">
                <Button 
                  variant="ghost" 
                  className="text-sm"
                  onClick={() => window.location.href = "/api/logout"}
                  data-testid="button-logout"
                >
                  Sign out and use a different account
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionStatus.accessGranted) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-muted-foreground" />
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
