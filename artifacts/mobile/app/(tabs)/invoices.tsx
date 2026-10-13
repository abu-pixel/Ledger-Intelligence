import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { InvoiceComposer } from '@/components/Composers';
import {
  AppPage,
  BrandHeader,
  formatCurrency,
  formatShortDate,
  PageHeading,
  PrimaryButton,
  SectionTitle,
  Surface,
} from '@/components/FinanceUI';
import { useFinance, type Invoice } from '@/contexts/FinanceContext';

function InvoiceCard({ invoice, onMarkPaid }: { invoice: Invoice; onMarkPaid: () => void }) {
  const colors = useColors();
  const { state } = useFinance();
  const isPaid = invoice.status === 'paid';
  const overdue = !isPaid && new Date(invoice.dueDate).getTime() < Date.now();
  return (
    <Surface style={styles.invoiceCard}>
      <View style={styles.invoiceTop}>
        <View style={[styles.invoiceIcon, { backgroundColor: isPaid ? colors.successSurface : colors.accent }]}>
          <Feather name={isPaid ? 'check' : 'file-text'} size={17} color={colors.primary} />
        </View>
        <View style={styles.invoiceIdentity}>
          <Text style={[styles.clientName, { color: colors.foreground }]} numberOfLines={1}>
            {invoice.client}
          </Text>
          <Text style={[styles.dueDate, { color: overdue ? colors.destructive : colors.mutedForeground }]}>
            {isPaid
              ? `Paid · ${formatShortDate(invoice.dueDate, state.countryCode)}`
              : `${overdue ? 'Overdue · ' : 'Due · '}${formatShortDate(invoice.dueDate, state.countryCode)}`}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: isPaid ? colors.successSurface : colors.warningSurface }]}>
          <Text style={[styles.statusText, { color: isPaid ? colors.primary : colors.mutedForeground }]}>
            {isPaid ? 'PAID' : 'OPEN'}
          </Text>
        </View>
      </View>
      <View style={[styles.invoiceBottom, { borderTopColor: colors.border }]}>
        <Text style={[styles.invoiceAmount, { color: colors.foreground }]}>
          {formatCurrency(invoice.amount, state.currencyCode, state.countryCode)}
        </Text>
        {isPaid ? (
          <Text style={[styles.paidMessage, { color: colors.primary }]}>Received</Text>
        ) : (
          <Pressable
            onPress={onMarkPaid}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${invoice.client} invoice paid`}
            style={({ pressed }) => [styles.markPaidButton, { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 }]}
          >
            <Feather name="check" size={13} color={colors.primaryForeground} />
            <Text style={[styles.markPaidText, { color: colors.primaryForeground }]}>Mark paid</Text>
          </Pressable>
        )}
      </View>
    </Surface>
  );
}

export default function InvoicesScreen() {
  const colors = useColors();
  const { state, markInvoicePaid } = useFinance();
  const [composerOpen, setComposerOpen] = useState(false);
  const unpaid = useMemo(() => state.invoices.filter((item) => item.status === 'unpaid'), [state.invoices]);
  const paid = useMemo(() => state.invoices.filter((item) => item.status === 'paid'), [state.invoices]);
  const dueTotal = unpaid.reduce((sum, item) => sum + item.amount, 0);

  return (
    <AppPage>
      <BrandHeader eyebrow="SAMPLE BUSINESS" />
      <PageHeading title="Invoices" subtitle="Keep tabs on what’s coming in." />

      <Surface style={[styles.dueCard, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
        <View style={styles.dueTop}>
          <Text style={[styles.dueLabel, { color: colors.primaryForeground }]}>Outstanding</Text>
        <View style={[styles.dueIcon, { backgroundColor: colors.primaryForeground, opacity: 0.88 }]}>
          <Feather name="arrow-down-left" size={17} color={colors.primary} />
          </View>
        </View>
      <Text style={[styles.dueAmount, { color: colors.primaryForeground }]}>
        {formatCurrency(dueTotal, state.currencyCode, state.countryCode)}
      </Text>
      <Text style={[styles.dueFoot, { color: colors.primaryForeground }]}>
        {unpaid.length} open invoice{unpaid.length === 1 ? '' : 's'}
      </Text>
      </Surface>

      <PrimaryButton title="Create an invoice" icon="plus" onPress={() => setComposerOpen(true)} testID="create-invoice" />

      <View style={styles.invoiceSection}>
        <SectionTitle title="Awaiting payment" />
        {unpaid.length ? (
          unpaid.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onMarkPaid={() =>
                Alert.alert(
                  'Mark invoice as paid?',
                   `This records ${formatCurrency(invoice.amount, state.currencyCode, state.countryCode)} as income and updates your cash-flow report.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Mark paid', onPress: () => markInvoicePaid(invoice.id) },
                  ],
                )
              }
            />
          ))
        ) : (
          <Surface style={styles.emptyCard}>
            <Feather name="check-circle" size={23} color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.foreground }]}>You’re all caught up</Text>
            <Text style={[styles.emptyNote, { color: colors.mutedForeground }]}>
              New invoices will appear here until they’re paid.
            </Text>
          </Surface>
        )}
      </View>

      <View style={styles.invoiceSection}>
        <SectionTitle title="Recently paid" />
        {paid.length ? (
          paid.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} onMarkPaid={() => undefined} />)
        ) : (
          <Text style={[styles.emptyNote, { color: colors.mutedForeground }]}>Paid invoices will be listed here.</Text>
        )}
      </View>
      <InvoiceComposer visible={composerOpen} onClose={() => setComposerOpen(false)} />
    </AppPage>
  );
}

const styles = StyleSheet.create({
  dueCard: { padding: 20 },
  dueTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dueLabel: { fontSize: 12, fontWeight: '600', opacity: 0.78 },
  dueIcon: { width: 35, height: 35, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dueAmount: { fontSize: 33, fontWeight: '700', letterSpacing: -1, marginTop: 9 },
  dueFoot: { fontSize: 12, marginTop: 3, opacity: 0.72 },
  invoiceSection: { gap: 12 },
  invoiceCard: { padding: 15 },
  invoiceTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  invoiceIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  invoiceIdentity: { flex: 1, gap: 4 },
  clientName: { fontSize: 13, fontWeight: '700' },
  dueDate: { fontSize: 11 },
  statusPill: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  invoiceBottom: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 13,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceAmount: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
  markPaidButton: { borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  markPaidText: { fontSize: 11, fontWeight: '700' },
  paidMessage: { fontSize: 11, fontWeight: '700' },
  emptyCard: { alignItems: 'center', padding: 24, gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '700' },
  emptyNote: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
