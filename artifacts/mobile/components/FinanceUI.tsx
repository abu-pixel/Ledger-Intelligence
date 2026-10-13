import React, { type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useFinance, type Transaction } from '@/contexts/FinanceContext';
import { formatDate, formatMoney } from '@/lib/localization';

export function formatCurrency(
  amount: number,
  currencyCode = 'USD',
  countryCode = 'US',
) {
  return formatMoney(amount, currencyCode, countryCode);
}

export function formatShortDate(isoDate: string, countryCode = 'US') {
  return formatDate(isoDate, countryCode);
}

export function AppPage({ children }: { children: ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.page,
        {
          paddingTop: Platform.OS === 'web' ? 70 : insets.top + 12,
          paddingBottom: 118 + (Platform.OS === 'web' ? 34 : insets.bottom),
        },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function BrandHeader({
  eyebrow = 'NORTHSTAR STUDIO',
  trailing,
}: {
  eyebrow?: string;
  trailing?: ReactNode;
}) {
  const colors = useColors();
  const headerAction = trailing ?? (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      style={({ pressed }) => [
        styles.headerSettings,
        { backgroundColor: colors.secondary, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Feather name="settings" size={17} color={colors.secondaryForeground} />
    </Pressable>
  );
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandBlock}>
        <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
          <Feather name="trending-up" size={17} color={colors.accent} />
        </View>
        <View>
          <Text style={[styles.brandName, { color: colors.foreground }]}>Ledgerly</Text>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>{eyebrow}</Text>
        </View>
      </View>
      {headerAction}
    </View>
  );
}

export function PageHeading({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.headingRow}>
      <View style={styles.headingText}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button">
          <Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Surface({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.surface,
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PrimaryButton({
  title,
  icon,
  onPress,
  secondary = false,
  testID,
}: {
  title: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  secondary?: boolean;
  testID?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: secondary ? colors.secondary : colors.primary,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <Feather name={icon} size={17} color={secondary ? colors.secondaryForeground : colors.primaryForeground} />
      <Text
        style={[
          styles.actionText,
          { color: secondary ? colors.secondaryForeground : colors.primaryForeground },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const categoryIcons: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  'Client income': 'briefcase',
  Sales: 'shopping-bag',
  Payroll: 'users',
  Rent: 'home',
  Software: 'monitor',
  Supplies: 'package',
  'Professional services': 'file-text',
};

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const colors = useColors();
  const { state } = useFinance();
  const isIncome = transaction.kind === 'income';
  const icon = categoryIcons[transaction.category] ?? 'credit-card';
  return (
    <View style={[styles.transactionRow, { borderBottomColor: colors.border }]}>
      <View
        style={[
          styles.transactionIcon,
          { backgroundColor: isIncome ? colors.successSurface : colors.muted },
        ]}
      >
        <Feather name={icon} size={17} color={isIncome ? colors.primary : colors.mutedForeground} />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={[styles.transactionName, { color: colors.foreground }]} numberOfLines={1}>
          {transaction.title}
        </Text>
        <Text style={[styles.transactionMeta, { color: colors.mutedForeground }]}>
          {transaction.category} · {formatShortDate(transaction.date, state.countryCode)}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, { color: isIncome ? colors.primary : colors.foreground }]}>
        {isIncome ? '+' : '−'}{formatCurrency(transaction.amount, state.currencyCode, state.countryCode)}
      </Text>
    </View>
  );
}

export function MiniStat({
  label,
  amount,
  icon,
}: {
  label: string;
  amount: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}) {
  const colors = useColors();
  return (
    <View style={[styles.miniStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.miniStatIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.miniStatAmount, { color: colors.foreground }]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 22,
    gap: 23,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  headerSettings: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.25,
    marginTop: 2,
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headingText: { flex: 1, gap: 5 },
  pageTitle: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '700',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
  },
  surface: {
    borderWidth: 1,
    borderRadius: 23,
    padding: 18,
  },
  actionButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDetails: {
    flex: 1,
    gap: 4,
  },
  transactionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionMeta: {
    fontSize: 11,
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  miniStat: {
    flex: 1,
    minWidth: 140,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  miniStatIcon: {
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  miniStatLabel: {
    fontSize: 12,
  },
  miniStatAmount: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
