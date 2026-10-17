import React, { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useSSO } from "@clerk/expo/experimental";
import * as AuthSession from "expo-auth-session";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";

export function GoogleAuthButton({
  onError,
  disabled = false,
}: {
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function continueWithGoogle() {
    setLoading(true);
    try {
      const { createdSessionId } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ scheme: "mobile", path: "sso-callback" }),
      });
      if (!createdSessionId) {
        onError("Google sign-in needs another verification step. Continue with email or try again.");
        return;
      }
      router.replace("/(tabs)");
    } catch {
      onError("Google sign-in is unavailable right now. Try email instead.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Pressable
      onPress={continueWithGoogle}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: disabled || loading ? 0.55 : pressed ? 0.82 : 1,
        },
      ]}
    >
      <Feather name="globe" size={17} color={colors.foreground} />
      <Text style={[styles.text, { color: colors.foreground }]}>
        {loading ? "Connecting…" : "Continue with Google"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 49,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  text: { fontSize: 14, fontWeight: "600" },
});
