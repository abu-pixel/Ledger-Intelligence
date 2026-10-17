import React, { useState } from "react";
import { Link, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSignIn } from "@clerk/expo";
import { AuthAction } from "@/components/AuthAction";
import { AuthField } from "@/components/AuthField";
import { AuthShell } from "@/components/AuthShell";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { useColors } from "@/hooks/useColors";

export default function SignInScreen() {
  const colors = useColors();
  const { signIn, fetchStatus } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function finishSignIn() {
    await signIn.finalize({
      navigate: ({ session }) => {
        if (session?.currentTask) {
          setMessage("Complete the remaining verification step in your account, then sign in again.");
          return;
        }
        router.replace("/(tabs)");
      },
    });
  }

  async function submitCredentials() {
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await signIn.password({
        emailAddress: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setMessage(error.message || "We couldn't sign you in. Check your email and password.");
        return;
      }
      if (signIn.status === "complete") {
        await finishSignIn();
      } else if (signIn.status === "needs_client_trust") {
        const { error: codeError } = await signIn.mfa.sendEmailCode();
        if (codeError) setMessage(codeError.message || "We couldn't send a verification code.");
        else setNeedsCode(true);
      } else {
        setMessage("Your account requires an additional verification step not available in this sign-in flow.");
      }
    } catch {
      setMessage("Sign-in is temporarily unavailable. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (busy || !verificationCode.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await signIn.mfa.verifyEmailCode({ code: verificationCode.trim() });
      if (error) {
        setMessage(error.message || "That verification code could not be verified.");
        return;
      }
      if (signIn.status === "complete") await finishSignIn();
      else setMessage("The verification step is not complete yet. Request a new code and try again.");
    } catch {
      setMessage("Verification is temporarily unavailable. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={needsCode ? "Check your email" : "Welcome back"}
      subtitle={needsCode ? "Enter the security code we sent to your email." : "Sign in to open your private finance workspace."}
    >
      {needsCode ? (
        <>
          <AuthField
            label="Email verification code"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            returnKeyType="done"
            onSubmitEditing={() => void verifyCode()}
          />
          <AuthAction title="Verify and continue" onPress={() => void verifyCode()} loading={busy} />
          <Pressable
            onPress={() => void signIn.mfa.sendEmailCode().then(({ error }) => {
              if (error) setMessage(error.message || "We couldn't send a new code.");
              else setMessage("A new verification code has been sent.");
            })}
            accessibilityRole="button"
          >
            <Text style={[styles.textLink, { color: colors.primary }]}>Send a new code</Text>
          </Pressable>
        </>
      ) : (
        <>
          <AuthField
            label="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
          />
          <AuthField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            autoComplete="current-password"
            returnKeyType="done"
            onSubmitEditing={() => void submitCredentials()}
          />
          <AuthAction
            title="Sign in"
            onPress={() => void submitCredentials()}
            loading={busy || fetchStatus === "fetching"}
            disabled={!email.trim() || !password}
          />
          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <Text style={[styles.or, { color: colors.mutedForeground }]}>or</Text>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>
          <GoogleAuthButton onError={setMessage} disabled={busy} />
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>New to Ledgerly? </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable><Text style={[styles.textLink, { color: colors.primary }]}>Create account</Text></Pressable>
            </Link>
          </View>
        </>
      )}
      {message ? <Text accessibilityRole="alert" style={[styles.message, { color: colors.destructive }]}>{message}</Text> : null}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 2 },
  line: { height: StyleSheet.hairlineWidth, flex: 1 },
  or: { fontSize: 12 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 3 },
  footerText: { fontSize: 13 },
  textLink: { fontSize: 13, fontWeight: "700", textAlign: "center", paddingVertical: 4 },
  message: { fontSize: 13, lineHeight: 19, textAlign: "center" },
});
