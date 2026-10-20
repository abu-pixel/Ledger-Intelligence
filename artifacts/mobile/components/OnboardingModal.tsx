import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { useFinance } from '@/contexts/FinanceContext';

export function OnboardingModal() {
  const colors = useColors();
  const { state, isReady, setOnboardingProfile } = useFinance();
  const [userName, setUserName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');

  const visible =
    !isReady ? false : !state.onboardingCompleted || !state.userName.trim();

  function handleSave() {
    if (!userName.trim()) {
      setError('Please enter your name.');
      return;
    }
    setError('');
    const finalBusiness = businessName.trim() || userName.trim();
    setOnboardingProfile(userName.trim(), finalBusiness);
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAwareScrollViewCompat
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
              <Feather name="trending-up" size={24} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Welcome to Ledgerly</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Set up your workspace to get started. All your data is stored locally on this device.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldBlock}>
              <Text style={[styles.label, { color: colors.foreground }]}>Your Full Name</Text>
              <TextInput
                value={userName}
                onChangeText={setUserName}
                placeholder="e.g. Alex Morgan"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                autoCapitalize="words"
                returnKeyType="next"
                testID="onboarding-user-name"
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.label, { color: colors.foreground }]}>Business / Studio Name (optional)</Text>
              <TextInput
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Northstar Studio"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleSave}
                testID="onboarding-business-name"
              />
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            ) : null}

            <Pressable
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="Get started"
              testID="onboarding-submit"
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                Get started
              </Text>
              <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
            </Pressable>
          </View>
        </KeyboardAwareScrollViewCompat>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 40 : 30,
    paddingBottom: 40,
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 320,
  },
  form: {
    gap: 20,
  },
  fieldBlock: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
