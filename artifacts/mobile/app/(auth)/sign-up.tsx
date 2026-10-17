import React, { useState } from "react";
import { Link, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSignUp } from "@clerk/expo";
import { AuthAction } from "@/components/AuthAction";
import { AuthField } from "@/components/AuthField";
import { AuthShell } from "@/components/AuthShell";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { useColors } from "@/hooks/useColors";

export default function SignUpScreen() {
  const colors = useColors();
  const { signUp, fetchStatus } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function finishSignUp() {
    await signUp.finalize({
      navigate: ({ session }) => {
        if (session?.currentTask) {
          setMessage("Complete the remaining verification step in your account, then sign in again.");
          return;
        }
        router.replace("/(tabs)");
      },
    });
  }

  async function createAccount() {
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await signUp.password({
        emailAddress: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setMessage(error.message || "We couldn't create your account. Check your details and try again.");
        return;
      }
      const { error: codeError } = await signUp.verifications.sendEmailCode();
      if (codeError) setMessage(codeError.message || "We couldn't send the verification code.");
      else setNeedsCode(true);
    } catch {
      setMessage("Sign-up is temporarily unavailable. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmail() {
    if (busy || !verificationCode.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code: verificationCode.trim() });
      if (error) {
        setMessage(error.message || "That verification code could not be verified.");
        return;
      }
      if (signUp.status === "complete") await finishSignUp();
      else setMessage("The account is not ready yet. Check your code or request a new one.");
    } catch {
      setMessage("Verification is temporarily unavailable. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={needsCode ? "Verify your email" : "Create your account"}
      subtitle={needsCode ? "Confirm your address to protect your account." : "Create a secure account for your business books."}
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
            onSubmitEditing={() => void verifyEmail()}
          />
          <AuthAction title="Verify and continue" onPress={() => void verifyEmail()} loading={busy} />
          <Pressable
            onPress={() => void signUp.verifications.sendEmailCode().then(({ error }) => {
              if (error) setMessage(error.message || "We couldn't send a new code.");
              else setMessage("A new verification code has been sent.");
            })}
            accessibilityRole="button"
          >
            <Text style={[styles.link, { color: colors.primary }]}>Send a new code</Text>
          </Pressable>
          <View nativeID="clerk-captcha" />
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
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={() => void createAccount()}
          />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Use a unique password with at least 8 characters.
          </Text>
          <AuthAction
            title="Create account"
            onPress={() => void createAccount()}
            loading={busy || fetchStatus === "fetching"}
            disabled={!email.trim() || password.length < 8}
          />
          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <Text style={[styles.or, { color: colors.mutedForeground }]}>or</Text>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>
          <GoogleAuthButton onError={setMessage} disabled={busy} />
          <View nativeID="clerk-captcha" />
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Already have an account? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable><Text style={[styles.link, { color: colors.primary }]}>Sign in</Text></Pressable>
            </Link>
          </View>
        </>
      )}
      {message ? <Text accessibilityRole="alert" style={[styles.message, { color: colors.destructive }]}>{message}</Text> : null}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 11, lineHeight: 16, marginTop: -8 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 2 },
  line: { height: StyleSheet.hairlineWidth, flex: 1 },
  or: { fontSize: 12 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 3 },
  footerText: { fontSize: 13 },
  link: { fontSize: 13, fontWeight: "700", textAlign: "center", paddingVertical: 4 },
  message: { fontSize: 13, lineHeight: 19, textAlign: "center" },
});
