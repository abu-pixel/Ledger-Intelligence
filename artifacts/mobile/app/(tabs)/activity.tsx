import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ExpenseComposer } from '@/components/Composers';
import {
  AppPage,
  BrandHeader,
  formatCurrency,
  PageHeading,
  PrimaryButton,
  SectionTitle,
  Surface,
  TransactionRow,
} from '@/components/FinanceUI';
import { useFinance, type TransactionKind } from '@/contexts/FinanceContext';

type Filter = 'all' | TransactionKind;

export default function ActivityScreen() {
  const colors = useColors();
  const { state } = useFinance();
  const [filter, setFilter] = useState<Filter>('all');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const transactions = useMemo(
    () =>
      state.transactions
        .filter((item) => filter === 'all' || item.kind === filter)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [filter, state.transactions],
  );
  const spending = transactions
    .filter((item) => item.kind === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <AppPage>
      <BrandHeader eyebrow="SAMPLE BUSINESS" />
      <PageHeading
        title="Activity"
        subtitle="Every inflow and outflow, in one place."
        trailing={
          <Pressable
            onPress={() => setExpenseOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Add expense"
            testID="activity-add-expense"
            style={({ pressed }) => [styles.addIcon, { backgroundColor: colors.accent, opacity: pressed ? 0.75 : 1 }]}
          >
            <Feather name="plus" size={21} color={colors.primary} />
          </Pressable>
        }
      />

      <Surface style={styles.summaryCard}>
        <View style={[styles.summaryIcon, { backgroundColor: colors.accent }]}>
          <Feather name="activity" size={17} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
            {filter === 'expense' ? 'Recorded expenses' : filter === 'income' ? 'Recorded income' : 'Ledger entries'}
          </Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            {transactions.length} <Text style={styles.summarySub}>entries</Text>
          </Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Spend</Text>
          <Text style={[styles.summarySpend, { color: colors.foreground }]}>{formatCurrency(spending)}</Text>
        </View>
      </Surface>

      <View style={styles.filterRow}>
        {(['all', 'income', 'expense'] as Filter[]).map((item) => {
          const selected = filter === item;
          const label = item === 'all' ? 'All' : item === 'income' ? 'Money in' : 'Money out';
          return (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selected ? colors.primary : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{ color: selected ? colors.primaryForeground : colors.mutedForeground, fontSize: 12, fontWeight: '700' }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.listBlock}>
        <SectionTitle title="Transactions" action="Add expense" onAction={() => setExpenseOpen(true)} />
        <Surface style={styles.listCard}>
          {transactions.length ? (
            transactions.map((item) => <TransactionRow key={item.id} transaction={item} />)
          ) : (
            <View style={styles.empty}>
              <Feather name="inbox" size={22} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing to show yet</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                Add an expense to start your ledger.
              </Text>
              <PrimaryButton title="Add expense" icon="plus" onPress={() => setExpenseOpen(true)} />
            </View>
          )}
        </Surface>
      </View>
      <ExpenseComposer visible={expenseOpen} onClose={() => setExpenseOpen(false)} />
    </AppPage>
  );
}

const styles = StyleSheet.create({
  addIcon: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  summaryIcon: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 11 },
  summaryValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  summarySub: { fontSize: 12, fontWeight: '500' },
  summaryRight: { alignItems: 'flex-end', gap: 5 },
  summarySpend: { fontSize: 15, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingVertical: 10, paddingHorizontal: 15, borderWidth: 1, borderRadius: 99 },
  listBlock: { gap: 11 },
  listCard: { paddingHorizontal: 14, paddingVertical: 4 },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '700' },
  emptyBody: { fontSize: 12, textAlign: 'center', marginBottom: 7 },
});
