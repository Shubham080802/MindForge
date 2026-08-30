"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don&apos;t match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  searchParams: Promise<{ token?: string }>;
}

export default function ResetPasswordForm({ searchParams }: ResetPasswordFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setMessage({ type: "error", text: "Invalid or missing reset token" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Failed to reset password");
      }

      setMessage({ type: "success", text: result.message || "Password has been reset successfully. Redirecting to sign in..." });

      setTimeout(() => {
        router.push("/auth/signin");
        router.refresh();
      }, 2000);
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  // Extract token from searchParams
  const initToken = async () => {
    const params = await searchParams;
    if (params.token) {
      setToken(params.token);
    } else {
      setMessage({ type: "error", text: "Invalid or missing reset token. Please request a new password reset link." });
    }
  };

  initToken();

  return (
    <div className="w-full max-w-md">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle>Set New Password</CardTitle>
          <CardDescription>Your new password must be different from previous passwords</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              message.type === "success" ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-destructive/10 text-destructive"
            )} role="alert">
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="........"
                  className="pl-10 pr-10 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register("password")}
                  disabled={isLoading || !token}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive" role="alert">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="........"
                  className="pl-10 pr-10 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register("confirmPassword")}
                  disabled={isLoading || !token}
                  aria-invalid={!!errors.confirmPassword}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive" role="alert">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !token} size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>

          <div className="text-center">
            <Link href="/auth/signin" className="text-sm text-primary hover:underline">
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}