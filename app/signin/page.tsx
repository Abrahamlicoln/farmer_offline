"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail01Icon, LockPasswordIcon, UserIcon } from "hugeicons-react";
import { useNetwork } from "@/context/NetworkContext";
import {
  authenticateUser,
  getActiveSession,
  clearAuthSession,
  AuthUser,
} from "@/lib/auth";

export default function SignInPage() {
  const router = useRouter();
  const { isOnline } = useNetwork();

  const [role, setRole] = useState<"officer" | "admin">("officer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<{
    token: string | null;
    user: AuthUser | null;
  }>({ token: null, user: null });

  // Check if a session is already stored perpetually
  useEffect(() => {
    const session = getActiveSession();
    if (session.token && session.user) {
      setActiveSession(session);
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const effectiveEmail =
      email.trim() ||
      (role === "officer"
        ? "officer.nigeria@oneacrefund.org"
        : "admin.operations@oneacrefund.org");

    const effectivePassword = password.trim() || "Password123!";

    try {
      const res = await authenticateUser(effectiveEmail, effectivePassword, isOnline);

      if (res.success && res.user) {
        toast.success(
          res.isOfflineAuth
            ? `Signed in offline as ${res.user.fullName}. Token saved perpetually.`
            : `Authenticated with server as ${res.user.fullName}!`
        );

        if (res.user.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/register");
        }
      } else {
        toast.error(res.message || "Invalid credentials. Please verify your email and password.");
      }
    } catch {
      toast.error("Authentication error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (newRole: "officer" | "admin") => {
    setRole(newRole);
    if (newRole === "officer") {
      setEmail("officer.nigeria@oneacrefund.org");
      setPassword("Password123!");
    } else {
      setEmail("admin.operations@oneacrefund.org");
      setPassword("Password123!");
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setActiveSession({ token: null, user: null });
    setEmail("");
    setPassword("");
    toast.info("Signed out. Local session token cleared.");
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative font-sans bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/farmers-hero.jpg')" }}
    >
      {/* Background dark scrim overlay for visual contrast */}
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1.5px]" />

      {/* Main Form Container */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md">
        {/* Centered Brand Logo using public/logo.png */}
        <div className="flex flex-col items-center justify-center mb-6 text-center">
          <img
            src="/logo.png"
            alt="One Acre Fund"
            className="h-12 sm:h-14 w-auto object-contain mb-2 drop-shadow-md brightness-0 invert"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <p className="text-sm font-normal text-white">
            Nigeria Operations • Farmers First
          </p>
        </div>

        {/* Centered Solid White Rounded Login Card */}
        <Card className="w-full border border-slate-200/90 rounded-[22px] bg-white shadow-none">
          <CardContent className="p-6 sm:p-8">
            {/* If an active persistent session token already exists */}
            {activeSession.user ? (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <p className="text-xs text-emerald-800 font-semibold mb-1">
                  Persistent Token Detected (Offline Ready)
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {activeSession.user.fullName}
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  {activeSession.user.email} • {activeSession.user.role === "admin" ? "Operations Admin" : "Field Officer"}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="brand"
                    onClick={() =>
                      router.push(
                        activeSession.user?.role === "admin"
                          ? "/admin"
                          : "/register"
                      )
                    }
                    className="flex-1 h-auto py-2.5 text-xs font-semibold rounded-md bg-emerald-700 hover:bg-emerald-800 text-white shadow-none"
                  >
                    Enter Portal
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLogout}
                    className="h-auto py-2.5 px-3 text-xs font-semibold rounded-md border-slate-300 text-slate-700 hover:bg-slate-100 shadow-none"
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Sign In to Portal
              </h2>
            </div>

            {/* Role Switcher Tabs: rounded-full, py-4, active bg is solid green */}
            <div className="grid grid-cols-2 gap-2.5 mb-6">
              <button
                type="button"
                onClick={() => handleRoleChange("officer")}
                className={`py-4 px-3 text-xs font-semibold rounded-full border transition-all flex items-center justify-center gap-1.5 shadow-none ${
                  role === "officer"
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <UserIcon className={`w-4 h-4 ${role === "officer" ? "text-white" : "text-slate-500"}`} />
                <span>Field Officer</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange("admin")}
                className={`py-4 px-3 text-xs font-semibold rounded-full border transition-all flex items-center justify-center gap-1.5 shadow-none ${
                  role === "admin"
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <UserIcon className={`w-4 h-4 ${role === "admin" ? "text-white" : "text-slate-500"}`} />
                <span>Operations Admin</span>
              </button>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <InputField
                label="Official Email / Officer ID"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  role === "officer"
                    ? "officer.nigeria@oneacrefund.org"
                    : "admin.operations@oneacrefund.org"
                }
                required
                icon={<Mail01Icon className="w-4 h-4 text-slate-400" />}
              />

              <InputField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                icon={<LockPasswordIcon className="w-4 h-4 text-slate-400" />}
              />

              <Button
                type="submit"
                variant="brand"
                isLoading={loading}
                className="w-full mt-2 h-auto py-4 text-sm font-semibold rounded-md bg-emerald-700 hover:bg-emerald-800 text-white shadow-none"
              >
                Continue as {role === "officer" ? "Field Officer" : "Admin"}
              </Button>
            </form>

            {/* Credential Quick-Reference Card */}
            <div className="mt-5 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center justify-between font-semibold text-slate-700 pb-1 border-b border-slate-200">
                <span>Default Credentials</span>
                <span className="text-[10px] text-emerald-700 font-bold uppercase">
                  Offline & Online
                </span>
              </div>
              <p>
                <strong className="text-slate-800">Email:</strong>{" "}
                <code className="text-[10.5px] bg-slate-200/70 px-1 py-0.5 rounded">
                  {role === "officer" ? "officer.nigeria@oneacrefund.org" : "admin.operations@oneacrefund.org"}
                </code>
              </p>
              <p>
                <strong className="text-slate-800">Password:</strong>{" "}
                <code className="text-[10.5px] bg-slate-200/70 px-1 py-0.5 rounded">
                  Password123!
                </code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
