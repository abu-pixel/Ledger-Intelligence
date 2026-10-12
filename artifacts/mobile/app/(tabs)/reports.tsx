import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { useFinance } from '@/contexts/FinanceContext';

type MonthFlow = { label: string; income: number; expense: number };

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

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
        label: monthLabel(month),
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
      taxEstimate: Math.max(0, current.income - current.expense) * 0.25,
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
      <BrandHeader eyebrow="SAMPLE BUSINESS" />
      <PageHeading title="Reports" subtitle="A clear view of how the business is moving." />

      <View style={styles.statRow}>
        <MiniStat label="Income this month" amount={formatCurrency(report.currentIncome)} icon="arrow-down-left" />
        <MiniStat label="Spend this month" amount={formatCurrency(report.currentExpense)} icon="arrow-up-right" />
      </View>

      <View style={styles.reportBlock}>
        <SectionTitle title="Cash flow" />
        <Surface style={styles.chartCard}>
          <View style={styles.chartHeading}>
            <View>
              <Text style={[styles.chartMain, { color: colors.foreground }]}>{formatCurrency(report.currentIncome - report.currentExpense)}</Text>
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
                    <Text style={[styles.categoryAmount, { color: colors.foreground }]}>{formatCurrency(amount)}</Text>
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
              <Text style={[styles.snapshotTitle, { color: colors.foreground }]}>Simple tax set-aside</Text>
              <Text style={[styles.snapshotNote, { color: colors.mutedForeground }]}>25% of this month’s net</Text>
            </View>
            <Text style={[styles.snapshotAmount, { color: colors.foreground }]}>{formatCurrency(report.taxEstimate)}</Text>
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
          Estimates use only entries in this sample ledger. Tax rates, deductions, payroll obligations, and filing rules vary. Consult a qualified tax professional.
        </Text>
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
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
