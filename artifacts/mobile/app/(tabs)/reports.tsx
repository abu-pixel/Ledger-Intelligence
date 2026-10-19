import React, { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  AppPage,
  BrandHeader,
  formatCurrency,
  MiniStat,
  PageHeading,
  SectionTitle,
  Surface,
} from '@/components/FinanceUI';
import { useColors } from '@/hooks/useColors';
import { useFinance, type Transaction } from '@/contexts/FinanceContext';
import { formatMonth } from '@/lib/localization';

function exportLedgerCsv(transactions: Transaction[]) {
  const header = 'ID,Date,Kind,Category,Title,Amount\n';
  const rows = transactions
    .map(
      (t) =>
        `"${t.id}","${t.date}","${t.kind}","${t.category}","${t.title.replace(/"/g, '""')}",${t.amount}`,
    )
    .join('\n');
  const csvContent = header + rows;
  Alert.alert(
    'Ledger CSV Data',
    `Exported ${transactions.length} transactions:\n\n${csvContent.slice(0, 250)}${csvContent.length > 250 ? '...' : ''}`,
    [{ text: 'Close', style: 'cancel' }],
  );
}

type MonthFlow = { label: string; income: number; expense: number };

export default function ReportsScreen() {
  const colors = useColors();
  const { state } = useFinance();
  const report = useMemo(() => {
    const now = new Date();
    const flows: MonthFlow[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const month = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const items = state.transactions.filter((item) => {
        const date = new Date(item.date);
        return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
      });
      flows.push({
        label: formatMonth(month, state.countryCode),
        income: items.filter((item) => item.kind === 'income').reduce((sum, item) => sum + item.amount, 0),
        expense: items.filter((item) => item.kind === 'expense').reduce((sum, item) => sum + item.amount, 0),
      });
    }
    const current = flows[flows.length - 1];
    const totalExpenses = state.transactions
      .filter((item) => item.kind === 'expense')
      .reduce((sum, item) => sum + item.amount, 0);
    const totalIncome = state.transactions
      .filter((item) => item.kind === 'income')
      .reduce((sum, item) => sum + item.amount, 0);
    const expenseGroups = state.transactions
      .filter((item) => item.kind === 'expense')
      .reduce<Record<string, number>>((groups, item) => {
        groups[item.category] = (groups[item.category] ?? 0) + item.amount;
        return groups;
      }, {});
    return {
      flows,
      currentIncome: current.income,
      currentExpense: current.expense,
      net: totalIncome - totalExpenses,
      totalExpenses,
      categories: Object.entries(expenseGroups).sort((a, b) => b[1] - a[1]),
    };
  }, [state.transactions]);

  const maxValue = Math.max(1, ...report.flows.flatMap((flow) => [flow.income, flow.expense]));
  const margin = report.currentIncome > 0
    ? Math.round(((report.currentIncome - report.currentExpense) / report.currentIncome) * 100)
    : 0;

  return (
    <AppPage>
      <BrandHeader />
      <PageHeading
        title="Reports"
        subtitle="A clear view of how the business is moving."
        trailing={
          <Pressable
            onPress={() => exportLedgerCsv(state.transactions)}
            accessibilityRole="button"
            accessibilityLabel="Export ledger CSV"
            style={({ pressed }) => [styles.exportButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.75 : 1 }]}
          >
            <Feather name="download" size={16} color={colors.secondaryForeground} />
            <Text style={[styles.exportText, { color: colors.secondaryForeground }]}>CSV</Text>
          </Pressable>
        }
      />

      <View style={styles.statRow}>
        <MiniStat label="Income this month" amount={formatCurrency(report.currentIncome, state.currencyCode, state.countryCode)} icon="arrow-down-left" />
        <MiniStat label="Spend this month" amount={formatCurrency(report.currentExpense, state.currencyCode, state.countryCode)} icon="arrow-up-right" />
      </View>

      <View style={styles.reportBlock}>
        <SectionTitle title="Cash flow" />
        <Surface style={styles.chartCard}>
          <View style={styles.chartHeading}>
            <View>
              <Text style={[styles.chartMain, { color: colors.foreground }]}>
                {formatCurrency(report.currentIncome - report.currentExpense, state.currencyCode, state.countryCode)}
              </Text>
              <Text style={[styles.chartSub, { color: colors.mutedForeground }]}>net movement this month</Text>
            </View>
            <View style={[styles.legend, { backgroundColor: colors.muted }]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.legendText, { color: colors.mutedForeground }]}>In</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Out</Text>
              </View>
            </View>
          </View>
          <View style={styles.chart}>
            {report.flows.map((flow) => (
              <View key={flow.label} style={styles.barGroup}>
                <View style={styles.bars}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(4, (flow.income / maxValue) * 96),
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(4, (flow.expense / maxValue) * 96),
                        backgroundColor: colors.accent,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.monthLabel, { color: colors.mutedForeground }]}>{flow.label}</Text>
              </View>
            ))}
          </View>
        </Surface>
      </View>

      <View style={styles.reportBlock}>
        <SectionTitle title="Spending by category" />
        <Surface style={styles.categoryCard}>
          {report.categories.length ? (
            report.categories.slice(0, 5).map(([category, amount]) => {
              const share = report.totalExpenses ? amount / report.totalExpenses : 0;
              return (
                <View key={category} style={styles.categoryRow}>
                  <View style={styles.categoryTop}>
                    <Text style={[styles.categoryName, { color: colors.foreground }]}>{category}</Text>
                    <Text style={[styles.categoryAmount, { color: colors.foreground }]}>
                      {formatCurrency(amount, state.currencyCode, state.countryCode)}
                    </Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.muted }]}>
                    <View style={[styles.fill, { width: `${Math.round(share * 100)}%`, backgroundColor: colors.primary }]} />
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={[styles.chartSub, { color: colors.mutedForeground }]}>Expenses will appear after you record them.</Text>
          )}
        </Surface>
      </View>

      <View style={styles.reportBlock}>
        <SectionTitle title="Planning snapshot" />
        <Surface style={styles.snapshotCard}>
          <View style={styles.snapshotRow}>
            <View style={[styles.snapshotIcon, { backgroundColor: colors.accent }]}>
              <Feather name="shield" size={17} color={colors.primary} />
            </View>
            <View style={styles.snapshotCopy}>
              <Text style={[styles.snapshotTitle, { color: colors.foreground }]}>Configured VAT reference</Text>
              <Text style={[styles.snapshotNote, { color: colors.mutedForeground }]}>
                {state.vatRatePercent === null
                  ? 'No verified default rate'
                  : 'Profile rate only · no filing calculation'}
              </Text>
            </View>
            <Text style={[styles.snapshotAmount, { color: colors.foreground }]}>
              {state.vatRatePercent === null ? '—' : `${state.vatRatePercent}%`}
            </Text>
          </View>
          <View style={[styles.snapshotDivider, { backgroundColor: colors.border }]} />
          <View style={styles.snapshotRow}>
            <View style={[styles.snapshotIcon, { backgroundColor: colors.muted }]}>
              <Feather name="activity" size={17} color={colors.primary} />
            </View>
            <View style={styles.snapshotCopy}>
              <Text style={[styles.snapshotTitle, { color: colors.foreground }]}>Net margin this month</Text>
              <Text style={[styles.snapshotNote, { color: colors.mutedForeground }]}>Income less recorded expenses</Text>
            </View>
            <Text style={[styles.snapshotAmount, { color: colors.foreground }]}>{margin}%</Text>
          </View>
        </Surface>
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          Totals use this device’s ledger. Tax eligibility, deductions, filing, payroll obligations, and local rules are not calculated.
        </Text>
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  exportButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exportText: { fontSize: 12, fontWeight: '700' },
  statRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  reportBlock: { gap: 11 },
  chartCard: { padding: 17 },
  chartHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  chartMain: { fontSize: 23, fontWeight: '700', letterSpacing: -0.7 },
  chartSub: { fontSize: 11, marginTop: 4, lineHeight: 16 },
  legend: { flexDirection: 'row', borderRadius: 99, paddingHorizontal: 9, paddingVertical: 7, gap: 9 },
  legendItem: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  legendDot: { width: 7, height: 7, borderRadius: 99 },
  legendText: { fontSize: 9, fontWeight: '600' },
  chart: { height: 132, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingTop: 18 },
  barGroup: { alignItems: 'center', gap: 8, flex: 1 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4 },
  bar: { width: 11, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  monthLabel: { fontSize: 10, fontWeight: '600' },
  categoryCard: { paddingHorizontal: 17, paddingVertical: 3 },
  categoryRow: { paddingVertical: 12, gap: 8 },
  categoryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryName: { fontSize: 12, fontWeight: '600' },
  categoryAmount: { fontSize: 12, fontWeight: '700' },
  track: { width: '100%', height: 6, borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
  snapshotCard: { paddingHorizontal: 15 },
  snapshotRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11 },
  snapshotIcon: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  snapshotCopy: { flex: 1, gap: 4 },
  snapshotTitle: { fontSize: 12, fontWeight: '700' },
  snapshotNote: { fontSize: 10 },
  snapshotAmount: { fontSize: 14, fontWeight: '700' },
  snapshotDivider: { height: StyleSheet.hairlineWidth },
  disclaimer: { fontSize: 10, lineHeight: 15 },
});
