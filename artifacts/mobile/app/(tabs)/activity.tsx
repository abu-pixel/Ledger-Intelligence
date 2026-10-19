import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ExpenseComposer, IncomeComposer } from '@/components/Composers';
import {
  AppPage,
  BrandHeader,
  formatCurrency,
  PageHeading,
  PrimaryButton,
  Surface,
  TransactionRow,
} from '@/components/FinanceUI';
import { useFinance, type Transaction, type TransactionKind } from '@/contexts/FinanceContext';

type Filter = 'all' | TransactionKind;

export default function ActivityScreen() {
  const colors = useColors();
  const { state, deleteTransaction } = useFinance();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);

  const transactions = useMemo(
    () =>
      state.transactions
        .filter((item) => filter === 'all' || item.kind === filter)
        .filter((item) => {
          const query = search.trim().toLowerCase();
          if (!query) return true;
          return `${item.title} ${item.category}`.toLowerCase().includes(query);
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [filter, search, state.transactions],
  );

  function confirmDelete(tx: Transaction) {
    Alert.alert(
      'Delete transaction?',
      `Are you sure you want to delete "${tx.title}" (${formatCurrency(tx.amount, state.currencyCode, state.countryCode)})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTransaction(tx.id),
        },
      ],
    );
  }
  const spending = transactions
    .filter((item) => item.kind === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <AppPage>
      <BrandHeader />
      <PageHeading
        title="Activity"
        subtitle="Every inflow and outflow, in one place."
        trailing={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setIncomeOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Record income"
              testID="activity-add-income"
              style={({ pressed }) => [styles.addIcon, { backgroundColor: colors.secondary, opacity: pressed ? 0.75 : 1 }]}
            >
              <Feather name="arrow-down-left" size={19} color={colors.secondaryForeground} />
            </Pressable>
            <Pressable
              onPress={() => setExpenseOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Add expense"
              testID="activity-add-expense"
              style={({ pressed }) => [styles.addIcon, { backgroundColor: colors.accent, opacity: pressed ? 0.75 : 1 }]}
            >
              <Feather name="plus" size={21} color={colors.primary} />
            </Pressable>
          </View>
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
          <Text style={[styles.summarySpend, { color: colors.foreground }]}>
            {formatCurrency(spending, state.currencyCode, state.countryCode)}
          </Text>
        </View>
      </Surface>

      <View style={[styles.searchInputRow, { backgroundColor: colors.card, borderColor: colors.input }]}>
        <Feather name="search" size={17} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search transactions…"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
          autoCorrect={false}
          accessibilityLabel="Search transactions"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} accessibilityLabel="Clear search">
            <Feather name="x-circle" size={17} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

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
        <View style={styles.actionRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Transactions</Text>
          <View style={styles.actionButtons}>
            <Pressable onPress={() => setIncomeOpen(true)} accessibilityRole="button">
              <Text style={[styles.sectionAction, { color: colors.primary }]}>+ Income</Text>
            </Pressable>
            <Pressable onPress={() => setExpenseOpen(true)} accessibilityRole="button">
              <Text style={[styles.sectionAction, { color: colors.primary }]}>+ Expense</Text>
            </Pressable>
          </View>
        </View>
        <Surface style={styles.listCard}>
          {transactions.length ? (
            transactions.map((item) => (
              <TransactionRow
                key={item.id}
                transaction={item}
                onDelete={() => confirmDelete(item)}
              />
            ))
          ) : (
            <View style={styles.empty}>
              <Feather name="inbox" size={22} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing to show yet</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                {search ? 'No transactions match your search query.' : 'Record an expense or income to start your ledger.'}
              </Text>
              <View style={styles.emptyActions}>
                <PrimaryButton title="Add expense" icon="plus" onPress={() => setExpenseOpen(true)} />
                <PrimaryButton title="Record income" icon="arrow-down-left" secondary onPress={() => setIncomeOpen(true)} />
              </View>
            </View>
          )}
        </Surface>
      </View>
      <ExpenseComposer visible={expenseOpen} onClose={() => setExpenseOpen(false)} />
      <IncomeComposer visible={incomeOpen} onClose={() => setIncomeOpen(false)} />
    </AppPage>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addIcon: { width: 41, height: 41, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  summaryIcon: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 11 },
  summaryValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  summarySub: { fontSize: 12, fontWeight: '500' },
  summaryRight: { alignItems: 'flex-end', gap: 5 },
  summarySpend: { fontSize: 15, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingVertical: 10, paddingHorizontal: 15, borderWidth: 1, borderRadius: 99 },
  searchInputRow: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, minHeight: 44, fontSize: 14 },
  listBlock: { gap: 11 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  sectionAction: { fontSize: 13, fontWeight: '700' },
  listCard: { paddingHorizontal: 14, paddingVertical: 4 },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '700' },
  emptyBody: { fontSize: 12, textAlign: 'center', marginBottom: 7 },
  emptyActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
});
