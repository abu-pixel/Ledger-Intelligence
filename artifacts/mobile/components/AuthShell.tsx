import React, { type ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.page,
        {
          paddingTop: insets.top + 26,
          paddingBottom: insets.bottom + 28,
        },
      ]}
      bottomOffset={72}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.brand}>
        <Image source={require("../assets/images/icon.png")} style={styles.logo} />
        <Text style={[styles.brandName, { color: colors.foreground }]}>Ledgerly</Text>
        <Text style={[styles.brandNote, { color: colors.mutedForeground }]}>Your books, in your hands.</Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        <View style={styles.form}>{children}</View>
      </View>
      <Text style={[styles.privacy, { color: colors.mutedForeground }]}>
        Your account protects access to your personal finance workspace.
      </Text>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  page: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22, gap: 20 },
  brand: { alignItems: "center", gap: 5 },
  logo: { width: 64, height: 64, borderRadius: 20, marginBottom: 5 },
  brandName: { fontSize: 23, fontWeight: "700", letterSpacing: -0.5 },
  brandNote: { fontSize: 13 },
  card: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    gap: 8,
  },
  title: { fontSize: 25, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  form: { gap: 14, marginTop: 10 },
  privacy: { maxWidth: 320, alignSelf: "center", textAlign: "center", fontSize: 11, lineHeight: 16 },
});
