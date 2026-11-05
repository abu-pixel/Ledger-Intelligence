import React, { useState } from "react";
import { Link } from "expo-router";
import { Pressable, Text } from "react-native";
import { acceptInvite, AuthError, login, requestPasswordRecovery, signup, updateUser } from "@netlify/identity";
import { AuthAction } from "@/components/AuthAction";
import { AuthField } from "@/components/AuthField";
import { AuthShell } from "@/components/AuthShell";
import { useIdentitySession } from "@/contexts/IdentitySessionContext";
import { useColors } from "@/hooks/useColors";

export function IdentityAuthScreen({ createAccount = false }: { createAccount?: boolean }) {
  const colors = useColors();
  const session = useIdentitySession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const reset = session.recovery;
  const needsEmail = !reset;
  const needsPassword = reset || !forgot;

  async function submit() {
    if (busy) return;
    if (needsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage("Enter a valid email address."); return;
    }
    if (needsPassword && ((createAccount || reset) ? password.length < 8 : !password)) {
      setMessage(createAccount || reset ? "Use at least 8 characters for your password." : "Enter your password."); return;
    }
    if (createAccount && !reset && !forgot && !name.trim()) {
      setMessage("Enter your full name."); return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (reset) {
        if (session.inviteToken) await acceptInvite(session.inviteToken, password);
        else await updateUser({ password });
        await session.refresh();
        session.finishRecovery();
      } else if (forgot) {
        await requestPasswordRecovery(email.trim().toLowerCase());
        setMessage("If an account matches this email, a password reset link is on its way. Check your inbox.");
      } else if (createAccount) {
        await signup(email.trim().toLowerCase(), password, { full_name: name.trim() });
        await session.refresh();
        setMessage("Check your email and follow the confirmation link, then sign in.");
      } else {
        await login(email.trim().toLowerCase(), password);
        await session.refresh();
      }
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.status === 401 || error.status === 400) setMessage("Sign-in failed. Check your email and password, and confirm your email before signing in.");
        else if (error.status === 429) setMessage("Too many attempts. Wait a moment and try again.");
        else if (error.status === 422) setMessage("Check your details. Your password may not meet the requirements, or this email may already have an account.");
        else setMessage("We couldn't complete that request. Check your details and try again.");
      } else setMessage("We couldn't connect. Check your connection and try again.");
    } finally { setBusy(false); }
  }

  return <AuthShell
    title={reset ? "Set your password" : forgot ? "Reset your password" : createAccount ? "Create your account" : "Welcome back"}
    subtitle={reset ? "Choose a new password with at least 8 characters." : forgot ? "Enter your email to receive a password reset link." : createAccount ? "Create an account for Ledgerly. Your books stay saved on this device." : "Sign in to your Ledgerly workspace. Your books stay saved on this device."}
  >
    {createAccount && !reset && !forgot ? <AuthField label="Full name" value={name} onChangeText={setName} autoComplete="name" /> : null}
    {needsEmail ? <AuthField label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" /> : null}
    {needsPassword ? <AuthField label={reset ? "New password" : "Password"} value={password} onChangeText={setPassword} secureTextEntry autoComplete={reset || createAccount ? "new-password" : "current-password"} onSubmitEditing={() => void submit()} /> : null}
    <AuthAction title={reset ? "Save password" : forgot ? "Send reset link" : createAccount ? "Create account" : "Sign in"} onPress={() => void submit()} loading={busy} />
    {!reset ? <>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>Previously signed in with Clerk? Create a new account here using your email. Existing cloud workspaces are not transferred.</Text>
      {!createAccount ? <Pressable disabled={busy} accessibilityRole="button" onPress={() => { setForgot(!forgot); setMessage(""); }}><Text style={{ color: colors.primary, textAlign: "center", padding: 6 }}>{forgot ? "Back to sign in" : "Forgot password?"}</Text></Pressable> : null}
      <Link href={createAccount ? "/(auth)/sign-in" : "/(auth)/sign-up"} style={{ color: colors.primary, textAlign: "center", padding: 6 }}>{createAccount ? "Already have an account? Sign in" : "New to Ledgerly? Create account"}</Link>
    </> : null}
    {message || session.message ? <Text accessibilityRole="alert" style={{ color: colors.foreground, fontSize: 13, lineHeight: 19, textAlign: "center" }}>{message || session.message}</Text> : null}
  </AuthShell>;
}
