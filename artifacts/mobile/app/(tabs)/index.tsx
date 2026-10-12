import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ExpenseComposer, InvoiceComposer } from '@/components/Composers';
import {
  AppPage,
  BrandHeader,
  formatCurrency,
  PrimaryButton,
  SectionTitle,
  Surface,
  TransactionRow,
} from '@/components/FinanceUI';
import { useFinance } from '@/contexts/FinanceContext';

const TAX_RATE = 0.25;

export default function HomeScreen() {
  const colors = useColors();
  const { state, storageError } = useFinance();
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).toUpperCase();

  const totals = useMemo(() => {
    const now = new Date();
    const thisMonth = state.transactions.filter((item) => {
      const date = new Date(item.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const income = thisMonth
      .filter((item) => item.kind === 'income')
      .reduce((sum, item) => sum + item.amount, 0);
    const expenses = thisMonth
      .filter((item) => item.kind === 'expense')
      .reduce((sum, item) => sum + item.amount, 0);
    const balance =
      state.openingCash +
      state.transactions.reduce(
        (sum, item) => sum + (item.kind === 'income' ? item.amount : -item.amount),
        0,
      );
    return {
      income,
      expenses,
      balance,
      estimate: Math.max(0, income - expenses) * TAX_RATE,
      recent: state.transactions.slice(0, 4),
      unpaidInvoices: state.invoices.filter((item) => item.status === 'unpaid'),
    };
  }, [state]);

  const outstanding = totals.unpaidInvoices.reduce((sum, item) => sum + item.amount, 0);

  return (
    <AppPage>
      <BrandHeader
        trailing={
          <View style={[styles.sampleBadge, { backgroundColor: colors.accent }]}>
            <View style={[styles.sampleDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.sampleBadgeText, { color: colors.accentForeground }]}>SAMPLE</Text>
          </View>
        }
      />

      <View style={styles.greeting}>
        <Text style={[styles.greetingLabel, { color: colors.mutedForeground }]}>{today}</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Good morning,</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Morgan.</Text>
      </View>

      <Surface style={styles.balanceCard}>
        <View style={styles.balanceTop}>
          <Text style={styles.balanceLabel}>Available cash</Text>
          <View style={styles.balancePill}>
            <Feather name="trending-up" size={13} color={colors.accentForeground} />
            <Text style={[styles.balancePillText, { color: colors.accentForeground }]}>On track</Text>
          </View>
        </View>
        <Text style={styles.balanceAmount}>{formatCurrency(totals.balance)}</Text>
        <Text style={styles.balanceFootnote}>Across your sample business ledger</Text>
        <View style={styles.balanceDivider} />
        <View style={styles.balanceBottom}>
          <View>
            <Text style={styles.balanceSmallLabel}>Income this month</Text>
            <Text style={styles.balanceSmallValue}>{formatCurrency(totals.income)}</Text>
          </View>
          <View style={styles.balanceBottomRule} />
          <View>
            <Text style={styles.balanceSmallLabel}>Expenses</Text>
            <Text style={styles.balanceSmallValue}>{formatCurrency(totals.expenses)}</Text>
          </View>
        </View>
        <View style={[styles.balanceOrb, { backgroundColor: colors.accent }]} />
      </Surface>

      {storageError ? (
        <View style={[styles.storageNotice, { backgroundColor: '#FBEDEA' }]}>
          <Feather name="alert-circle" size={15} color={colors.destructive} />
          <Text style={[styles.storageNoticeText, { color: colors.destructive }]}>{storageError}</Text>
        </View>
      ) : null}

      <View style={styles.quickActions}>
        <PrimaryButton
          title="Add expense"
          icon="plus"
          onPress={() => setExpenseOpen(true)}
          testID="quick-add-expense"
        />
        <PrimaryButton
          title="New invoice"
          icon="file-plus"
          secondary
          onPress={() => setInvoiceOpen(true)}
          testID="quick-new-invoice"
        />
      </View>

      <View style={styles.sectionBlock}>
        <SectionTitle title="Recent activity" />
        <Surface style={styles.activityCard}>
          {totals.recent.length ? (
            totals.recent.map((item) => <TransactionRow key={item.id} transaction={item} />)
          ) : (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              New transactions will show up here.
            </Text>
          )}
        </Surface>
      </View>

      <View style={styles.sectionBlock}>
        <SectionTitle title="A few things to know" />
        <View style={styles.signalRow}>
          <View style={[styles.signalIcon, { backgroundColor: colors.accent }]}>
            <Feather name="file-text" size={17} color={colors.primary} />
          </View>
          <View style={styles.signalCopy}>
            <Text style={[styles.signalTitle, { color: colors.foreground }]}>
              {totals.unpaidInvoices.length} invoices awaiting payment
            </Text>
            <Text style={[styles.signalDetail, { color: colors.mutedForeground }]}>
              {formatCurrency(outstanding)} outstanding in this sample
            </Text>
          </View>
        </View>
        <View style={styles.signalRow}>
          <View style={[styles.signalIcon, { backgroundColor: '#E9EEE7' }]}>
            <Feather name="shield" size={17} color={colors.primary} />
          </View>
          <View style={styles.signalCopy}>
            <Text style={[styles.signalTitle, { color: colors.foreground }]}>Estimated tax set-aside</Text>
            <Text style={[styles.signalDetail, { color: colors.mutedForeground }]}>
              {formatCurrency(totals.estimate)} at a simple 25% of this month’s net
            </Text>
          </View>
        </View>
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          Planning estimate only — not tax advice or a filing calculation.
        </Text>
      </View>

      <Pressable
        onPress={() => setExpenseOpen(true)}
        style={({ pressed }) => [styles.receiptShortcut, { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 }]}
        accessibilityRole="button"
      >
        <View style={[styles.receiptShortcutIcon, { backgroundColor: colors.card }]}>
          <Feather name="camera" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.receiptShortcutTitle, { color: colors.foreground }]}>Have a receipt?</Text>
          <Text style={[styles.receiptShortcutText, { color: colors.mutedForeground }]}>Attach a photo to an expense</Text>
        </View>
        <Feather name="arrow-up-right" size={17} color={colors.primary} />
      </Pressable>

      <ExpenseComposer visible={expenseOpen} onClose={() => setExpenseOpen(false)} />
      <InvoiceComposer visible={invoiceOpen} onClose={() => setInvoiceOpen(false)} />
    </AppPage>
  );
}

const styles = StyleSheet.create({
  sampleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sampleDot: { width: 6, height: 6, borderRadius: 99 },
  sampleBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  greeting: { gap: 1 },
  greetingLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1, marginBottom: 9 },
  title: { fontSize: 31, lineHeight: 35, fontWeight: '700', letterSpacing: -1.1 },
  balanceCard: {
    overflow: 'hidden',
    backgroundColor: '#194B3B',
    borderColor: '#194B3B',
    padding: 20,
  },
  balanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.78)' },
  balancePill: {
    backgroundColor: '#D7EE9B',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  balancePillText: { fontSize: 10, fontWeight: '700' },
  balanceAmount: { color: '#FFFFFF', fontSize: 36, lineHeight: 43, fontWeight: '700', letterSpacing: -1.3, marginTop: 15 },
  balanceFootnote: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 3 },
  balanceDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.23)', marginTop: 19, marginBottom: 15 },
  balanceBottom: { flexDirection: 'row', alignItems: 'center', gap: 17 },
  balanceBottomRule: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: 'rgba(255,255,255,0.28)' },
  balanceSmallLabel: { color: 'rgba(255,255,255,0.66)', fontSize: 10 },
  balanceSmallValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginTop: 5 },
  balanceOrb: { width: 125, height: 125, borderRadius: 99, position: 'absolute', top: -81, right: -48, opacity: 0.1 },
  quickActions: { flexDirection: 'row', gap: 10 },
  sectionBlock: { gap: 11 },
  activityCard: { paddingVertical: 4, paddingHorizontal: 14 },
  emptyText: { paddingVertical: 24, textAlign: 'center', fontSize: 13 },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  signalIcon: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  signalCopy: { flex: 1, gap: 4 },
  signalTitle: { fontSize: 13, fontWeight: '700' },
  signalDetail: { fontSize: 11, lineHeight: 15 },
  disclaimer: { fontSize: 10, lineHeight: 15, marginTop: -4 },
  storageNotice: { padding: 12, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  storageNoticeText: { flex: 1, fontSize: 11, lineHeight: 16 },
  receiptShortcut: { borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  receiptShortcutIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  receiptShortcutTitle: { fontSize: 13, fontWeight: '700' },
  receiptShortcutText: { fontSize: 11, marginTop: 3 },
});
