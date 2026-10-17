import React from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useColors } from "@/hooks/useColors";

export function AuthField({
  label,
  ...props
}: TextInputProps & { label: string }) {
  const colors = useColors();

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        autoCorrect={false}
        style={[
          styles.input,
          {
            color: colors.foreground,
            backgroundColor: colors.background,
            borderColor: colors.input,
          },
          props.style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 7 },
  label: { fontSize: 13, fontWeight: "600" },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
});
