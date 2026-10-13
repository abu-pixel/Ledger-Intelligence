import React, { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  AppPage,
  BrandHeader,
  formatCurrency,
  PageHeading,
  SectionTitle,
  Surface,
} from '@/components/FinanceUI';
import { useColors } from '@/hooks/useColors';
import { useFinance } from '@/contexts/FinanceContext';

export default function InsightsScreen() {
  const colors = useColors();
  const { state, resetSampleWorkspace } = useFinance();
  const findings = useMemo(() => {
    const unpaid = state.invoices.filter((item) => item.status === 'unpaid');
    const overdue = unpaid.filter((item) => new Date(item.dueDate).getTime() < Date.now());
    const thisMonth = state.transactions.filter((item) => {
      const date = new Date(item.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const income = thisMonth.filter((item) => item.kind === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expenses = thisMonth.filter((item) => item.kind === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const topExpense = state.transactions
      .filter((item) => item.kind === 'expense')
      .reduce<{ title: string; amount: number } | null>(
        (best, item) => (!best || item.amount > best.amount ? { title: item.title, amount: item.amount } : best),
        null,
      );
    const cash = state.openingCash + state.transactions.reduce(
      (sum, item) => sum + (item.kind === 'income' ? item.amount : -item.amount),
      0,
    );
    return { unpaid, overdue, income, expenses, topExpense, cash };
  }, [state]);

  function confirmReset() {
    Alert.alert(
      'Reset the sample workspace?',
      'This replaces this device’s saved ledger and invoices with the original sample data.',
      [
        { text: 'Keep my data', style: 'cancel' },
        { text: 'Reset workspace', style: 'destructive', onPress: resetSampleWorkspace },
      ],
    );
  }

  const signals = [
    {
      icon: findings.overdue.length ? 'alert-circle' : 'file-text',
      tone: findings.overdue.length ? colors.destructive : colors.primary,
      title: findings.overdue.length
        ? `${findings.overdue.length} invoice${findings.overdue.length === 1 ? '' : 's'} past due`
        : `${findings.unpaid.length} invoice${findings.unpaid.length === 1 ? '' : 's'} still open`,
      detail: findings.overdue.length
        ? `Review ${findings.overdue.map((invoice) => invoice.client).join(', ')}.`
        : `${formatCurrency(findings.unpaid.reduce((sum, invoice) => sum + invoice.amount, 0), state.currencyCode, state.countryCode)} is awaiting payment.`,
      background: findings.overdue.length ? colors.dangerSurface : colors.accent,
    },
    {
      icon: 'pie-chart',
      tone: colors.primary,
      title: 'Current-month margin',
      detail: findings.income > 0
        ? `${Math.round(((findings.income - findings.expenses) / findings.income) * 100)}% from recorded income and expenses.`
        : 'Record income to calculate a monthly margin.',
      background: colors.muted,
    },
    {
      icon: 'trending-up',
      tone: colors.primary,
      title: 'Largest recorded expense',
      detail: findings.topExpense
        ? `${findings.topExpense.title} · ${formatCurrency(findings.topExpense.amount, state.currencyCode, state.countryCode)}`
        : 'No expenses have been entered yet.',
      background: colors.secondary,
    },
  ] as const;

  return (
    <AppPage>
      <BrandHeader eyebrow="LOCAL LEDGER SIGNALS" />
      <PageHeading title="Insights" subtitle="A quick read of the numbers you’ve recorded." />

      <Pressable
        onPress={() => router.push('/assistant')}
        accessibilityRole="button"
        accessibilityLabel="Open the accounting assistant"
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <Surface style={[styles.aiNotice, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <View style={styles.aiNoticeTop}>
            <View style={[styles.aiMark, { backgroundColor: colors.accent }]}>
              <Feather name="zap" size={17} color={colors.accentForeground} />
            </View>
            <Text style={[styles.aiNoticeLabel, { color: colors.primaryForeground }]}>AI ACCOUNTING ASSISTANT</Text>
          </View>
          <Text style={[styles.aiTitle, { color: colors.primaryForeground }]}>Ask about your numbers</Text>
          <Text style={[styles.aiBody, { color: colors.primaryForeground }]}>
            Get general guidance from an AI assistant using a limited summary of your ledger.
          </Text>
          <View style={styles.assistantLink}>
            <Text style={[styles.assistantLinkText, { color: colors.primaryForeground }]}>Open assistant</Text>
            <Feather name="arrow-up-right" size={15} color={colors.primaryForeground} />
          </View>
        </Surface>
      </Pressable>

      <View style={styles.findingBlock}>
        <SectionTitle title="Business signals" />
        {signals.map((signal, index) => (
          <Surface key={`${signal.title}-${index}`} style={styles.signalCard}>
            <View style={[styles.signalIcon, { backgroundColor: signal.background }]}>
              <Feather name={signal.icon} size={17} color={signal.tone} />
            </View>
            <View style={styles.signalText}>
              <Text style={[styles.signalTitle, { color: colors.foreground }]}>{signal.title}</Text>
              <Text style={[styles.signalDetail, { color: colors.mutedForeground }]}>{signal.detail}</Text>
            </View>
          </Surface>
        ))}
      </View>

      <Surface style={styles.cashNote}>
        <View style={[styles.cashIcon, { backgroundColor: colors.accent }]}>
          <Feather name="briefcase" size={17} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cashLabel, { color: colors.mutedForeground }]}>
            {state.sampleOnly ? 'Sample cash balance' : 'Recorded cash balance'}
          </Text>
          <Text style={[styles.cashValue, { color: colors.foreground }]}>
            {formatCurrency(findings.cash, state.currencyCode, state.countryCode)}
          </Text>
        </View>
      </Surface>

      <View style={styles.privacyNote}>
        <Feather name="lock" size={14} color={colors.mutedForeground} />
        <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
          Your ledger entries and receipt photos are stored on this device. No bank account is connected.
        </Text>
      </View>

      <Pressable onPress={confirmReset} style={styles.resetButton} accessibilityRole="button">
        <Text style={[styles.resetText, { color: colors.destructive }]}>Reset sample workspace</Text>
      </Pressable>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  aiNotice: { padding: 19 },
  aiNoticeTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  aiMark: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  aiNoticeLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.15, opacity: 0.74 },
  aiTitle: { fontSize: 21, fontWeight: '700', letterSpacing: -0.5, marginTop: 15 },
  aiBody: { fontSize: 12, lineHeight: 18, marginTop: 6, opacity: 0.78 },
  assistantLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  assistantLinkText: { fontSize: 12, fontWeight: '700' },
  findingBlock: { gap: 11 },
  signalCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  signalIcon: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  signalText: { flex: 1, gap: 4 },
  signalTitle: { fontSize: 13, fontWeight: '700' },
  signalDetail: { fontSize: 11, lineHeight: 16 },
  cashNote: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  cashIcon: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cashLabel: { fontSize: 11 },
  cashValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 3 },
  privacyText: { flex: 1, fontSize: 10, lineHeight: 15 },
  resetButton: { alignSelf: 'center', paddingVertical: 12 },
  resetText: { fontSize: 12, fontWeight: '700' },
});
