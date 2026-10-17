import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useGetCurrencyRates } from '@workspace/api-client-react';
import { AppPage, PageHeading, SectionTitle, Surface } from '@/components/FinanceUI';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useFinance, type TaxRuleMode } from '@/contexts/FinanceContext';
import { useColors } from '@/hooks/useColors';
import { getCountryName, parseLocalizedAmount } from '@/lib/localization';

const ETHIOPIA_VAT_DIRECTIVE =
  'https://justice.gov.et/en?jet_download=90bc83fd30006baae50de5f0d366cdaeb5c816d4';

function formatCurrency(amount: number, code: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 4,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${code}`;
  }
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Update time unavailable';
  return `Provider update: ${date.toLocaleString()}`;
}

export default function ToolsScreen() {
  const colors = useColors();
  const {
    state,
    addTaxRule,
    deleteTaxRule,
    updateCountry,
  } = useFinance();
  const countryName = getCountryName(state.countryCode);
  const [ruleName, setRuleName] = useState('');
  const [ruleRate, setRuleRate] = useState('');
  const [ruleMode, setRuleMode] = useState<TaxRuleMode>('exclusive');
  const [ruleError, setRuleError] = useState('');
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [quoteCurrency, setQuoteCurrency] = useState(
    state.currencyCode === 'USD' ? 'ETB' : 'USD',
  );
  const [convertAmount, setConvertAmount] = useState('1');

  const countryRules = useMemo(
    () => state.taxRules.filter((rule) => rule.countryCode === state.countryCode),
    [state.countryCode, state.taxRules],
  );
  const selectedRule =
    countryRules.find((rule) => rule.id === selectedRuleId) ?? countryRules[0];

  useEffect(() => {
    if (!countryRules.some((rule) => rule.id === selectedRuleId)) {
      setSelectedRuleId(countryRules[0]?.id ?? '');
    }
  }, [countryRules, selectedRuleId]);

  useEffect(() => {
    if (quoteCurrency === state.currencyCode) {
      setQuoteCurrency(state.currencyCode === 'USD' ? 'ETB' : 'USD');
    }
  }, [quoteCurrency, state.currencyCode]);

  const normalizedQuote = quoteCurrency.trim().toUpperCase();
  const ratesQuery = useGetCurrencyRates(
    { base: state.currencyCode },
    {
      query: {
        enabled: /^[A-Z]{3}$/.test(state.currencyCode),
        staleTime: 60 * 60 * 1000,
        retry: 1,
      },
    },
  );
  const rate =
    normalizedQuote === state.currencyCode
      ? 1
      : ratesQuery.data?.rates[normalizedQuote];
  const convertValue = parseLocalizedAmount(convertAmount, state.countryCode);
  const taxValue = parseLocalizedAmount(taxAmount, state.countryCode);

  const calculation = useMemo(() => {
    if (!selectedRule || !Number.isFinite(taxValue) || taxValue < 0) return null;
    const fraction = selectedRule.ratePercent / 100;
    const base =
      selectedRule.mode === 'inclusive'
        ? taxValue / (1 + fraction)
        : taxValue;
    const tax = selectedRule.mode === 'inclusive' ? taxValue - base : taxValue * fraction;
    return {
      base,
      tax,
      total: selectedRule.mode === 'inclusive' ? taxValue : taxValue + tax,
    };
  }, [selectedRule, taxValue]);

  function saveRule() {
    const rateValue = parseLocalizedAmount(ruleRate, state.countryCode);
    if (!ruleName.trim() || ruleName.trim().length > 80) {
      setRuleError('Enter a name of up to 80 characters.');
      return;
    }
    if (!Number.isFinite(rateValue) || rateValue < 0 || rateValue > 100) {
      setRuleError('Enter a percentage from 0 to 100.');
      return;
    }
    addTaxRule({
      name: ruleName.trim(),
      countryCode: state.countryCode,
      ratePercent: rateValue,
      mode: ruleMode,
    });
    setRuleName('');
    setRuleRate('');
    setRuleError('');
  }

  function removeRule(ruleId: string, name: string) {
    Alert.alert('Delete this rule?', `“${name}” will be removed from this account.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTaxRule(ruleId) },
    ]);
  }

  function openCountryResource() {
    const url =
      state.countryCode === 'ET'
        ? ETHIOPIA_VAT_DIRECTIVE
        : `https://www.google.com/search?q=${encodeURIComponent(`${countryName} official government tax authority`)}`;
    void Linking.openURL(url).catch(() => {
      Alert.alert('Could not open the resource', 'Check your connection and try again.');
    });
  }

  const shownRate =
    rate !== undefined && Number.isFinite(rate) && rate > 0 ? rate : null;

  return (
    <AppPage>
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={styles.content}
        bottomOffset={30}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeading
          title="Tax & currency tools"
          subtitle={`Personal calculators and resources for ${countryName}.`}
        />

        <View style={styles.section}>
          <SectionTitle title={`Tax calculator · ${countryName}`} />
          <Surface style={styles.card}>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Create rules using rates you verify for your own situation. These calculations are estimates, not tax advice or a filing tool.
            </Text>
            <Text style={[styles.label, { color: colors.foreground }]}>Rule name</Text>
            <TextInput
              value={ruleName}
              onChangeText={setRuleName}
              placeholder="e.g. Standard sales tax"
              placeholderTextColor={colors.mutedForeground}
              maxLength={80}
              style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
              accessibilityLabel="Tax rule name"
            />
            <Text style={[styles.label, { color: colors.foreground }]}>Rate (%)</Text>
            <TextInput
              value={ruleRate}
              onChangeText={setRuleRate}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              maxLength={8}
              style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
              accessibilityLabel="Tax rate percentage"
            />
            <View style={styles.modeRow}>
              {([
                ['exclusive', 'Add tax to amount'],
                ['inclusive', 'Tax included in amount'],
              ] as const).map(([mode, label]) => {
                const selected = ruleMode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => setRuleMode(mode)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.modeChoice,
                      {
                        backgroundColor: selected ? colors.primary : colors.secondary,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: selected ? colors.primaryForeground : colors.secondaryForeground, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {ruleError ? <Text style={[styles.error, { color: colors.destructive }]}>{ruleError}</Text> : null}
            <Pressable
              onPress={saveRule}
              accessibilityRole="button"
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 }]}
            >
              <Feather name="plus" size={16} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: 13 }}>Save tax rule</Text>
            </Pressable>
          </Surface>

          {countryRules.length ? (
            <View style={styles.ruleList}>
              {countryRules.map((rule) => {
                const selected = selectedRule?.id === rule.id;
                return (
                  <Pressable
                    key={rule.id}
                    onPress={() => setSelectedRuleId(rule.id)}
                    onLongPress={() => removeRule(rule.id, rule.name)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.ruleRow,
                      {
                        backgroundColor: selected ? colors.successSurface : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[styles.ruleName, { color: colors.foreground }]}>{rule.name}</Text>
                      <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                        {rule.ratePercent}% · {rule.mode === 'inclusive' ? 'included' : 'added'} · {rule.countryCode}
                      </Text>
                    </View>
                    <Text style={[styles.ruleRate, { color: colors.primary }]}>{rule.ratePercent}%</Text>
                    <Pressable
                      onPress={() => removeRule(rule.id, rule.name)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${rule.name}`}
                      hitSlop={8}
                    >
                      <Feather name="trash-2" size={16} color={colors.mutedForeground} />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Surface style={styles.emptyCard}>
              <Feather name="percent" size={20} color={colors.mutedForeground} />
              <Text style={[styles.helper, { color: colors.mutedForeground, textAlign: 'center' }]}>
                No tax rules for {countryName}. Add a rate you have verified to use the calculator.
              </Text>
            </Surface>
          )}

          {selectedRule ? (
            <Surface style={styles.card}>
              <Text style={[styles.ruleName, { color: colors.foreground }]}>Calculate with {selectedRule.name}</Text>
              <Text style={[styles.label, { color: colors.foreground }]}>
                {selectedRule.mode === 'inclusive' ? 'Amount including tax' : 'Amount before tax'} ({state.currencyCode})
              </Text>
              <TextInput
                value={taxAmount}
                onChangeText={setTaxAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
                accessibilityLabel="Amount to calculate tax"
              />
              {calculation ? (
                <View style={[styles.resultBox, { backgroundColor: colors.secondary }]}>
                  <ResultRow label="Before tax" value={formatCurrency(calculation.base, state.currencyCode)} />
                  <ResultRow label="Tax" value={formatCurrency(calculation.tax, state.currencyCode)} />
                  <View style={[styles.resultDivider, { backgroundColor: colors.border }]} />
                  <ResultRow label="Total" value={formatCurrency(calculation.total, state.currencyCode)} strong />
                </View>
              ) : (
                <Text style={[styles.helper, { color: colors.mutedForeground }]}>Enter an amount to see the estimate.</Text>
              )}
            </Surface>
          ) : null}
        </View>

        <View style={styles.section}>
          <SectionTitle title="Currency converter" />
          <Surface style={styles.card}>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Indicative exchange rates from ExchangeRate-API. Rates may update daily; banks and payment providers use their own rates and fees.
            </Text>
            <Text style={[styles.label, { color: colors.foreground }]}>Amount in {state.currencyCode}</Text>
            <TextInput
              value={convertAmount}
              onChangeText={setConvertAmount}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
              accessibilityLabel={`Amount in ${state.currencyCode}`}
            />
            <Text style={[styles.label, { color: colors.foreground }]}>Convert to (3-letter code)</Text>
            <TextInput
              value={quoteCurrency}
              onChangeText={(value) => setQuoteCurrency(value.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase())}
              autoCapitalize="characters"
              maxLength={3}
              placeholder="USD"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]}
              accessibilityLabel="Currency to convert to"
            />
            {ratesQuery.isLoading ? (
              <Text style={[styles.helper, { color: colors.mutedForeground }]}>Loading the latest available rate…</Text>
            ) : ratesQuery.isError ? (
              <View style={{ gap: 8 }}>
                <Text style={[styles.error, { color: colors.destructive }]}>Rates are temporarily unavailable. The calculator will not use an old or guessed rate.</Text>
                <Pressable onPress={() => void ratesQuery.refetch()} accessibilityRole="button">
                  <Text style={[styles.resourceLink, { color: colors.primary }]}>Try again</Text>
                </Pressable>
              </View>
            ) : shownRate !== null && Number.isFinite(convertValue) && convertValue >= 0 ? (
              <View style={[styles.resultBox, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.convertedValue, { color: colors.foreground }]}>
                  {formatCurrency(convertValue * shownRate, normalizedQuote)}
                </Text>
                <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                  1 {state.currencyCode} = {shownRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {normalizedQuote}
                </Text>
              </View>
            ) : (
              <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                {normalizedQuote === state.currencyCode
                  ? 'Choose a different currency.'
                  : /^[A-Z]{3}$/.test(normalizedQuote)
                    ? `No rate is available for ${normalizedQuote}. Check the currency code.`
                    : 'Enter a valid three-letter currency code.'}
              </Text>
            )}
            {ratesQuery.data?.updatedAt ? (
              <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
                {formatUpdatedAt(ratesQuery.data.updatedAt)}
              </Text>
            ) : null}
          </Surface>
        </View>

        <View style={styles.section}>
          <SectionTitle title={`Resources for ${countryName}`} />
          <Surface style={styles.card}>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Your country selection controls which resources and tax rules appear. It does not verify tax eligibility or compliance.
            </Text>
            <Pressable
              onPress={openCountryResource}
              accessibilityRole="link"
              style={styles.resourceRow}
            >
              <View style={[styles.resourceIcon, { backgroundColor: colors.accent }]}>
                <Feather name="external-link" size={16} color={colors.accentForeground} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.ruleName, { color: colors.primary }]}>
                  {state.countryCode === 'ET'
                    ? 'Ethiopian VAT directive'
                    : `Find ${countryName}’s tax authority`}
                </Text>
                <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                  {state.countryCode === 'ET'
                    ? 'Official government document · verify it is current before relying on it'
                    : 'Search result · verify the source is an official government website'}
                </Text>
              </View>
              <Feather name="arrow-up-right" size={16} color={colors.mutedForeground} />
            </Pressable>
            <Pressable
              onPress={() => updateCountry(state.countryCode, null)}
              accessibilityRole="button"
              style={[styles.resourceRow, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}
            >
              <Feather name="map-pin" size={16} color={colors.mutedForeground} />
              <Text style={[styles.helper, { color: colors.mutedForeground, flex: 1 }]}>
                Current country: {countryName} ({state.countryCode}). Change it in Settings.
              </Text>
              <Feather name="settings" size={15} color={colors.mutedForeground} />
            </Pressable>
          </Surface>
        </View>
      </KeyboardAwareScrollViewCompat>
    </AppPage>
  );
}

function ResultRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.resultRow}>
      <Text style={[styles.resultLabel, { color: strong ? colors.foreground : colors.mutedForeground, fontWeight: strong ? '700' : '500' }]}>
        {label}
      </Text>
      <Text style={[styles.resultLabel, { color: colors.foreground, fontWeight: strong ? '700' : '600' }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 110, gap: 24 },
  section: { gap: 12 },
  card: { padding: 16, gap: 11 },
  emptyCard: { alignItems: 'center', padding: 20, gap: 10 },
  helper: { fontSize: 11, lineHeight: 17 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  input: { minHeight: 46, borderRadius: 13, borderWidth: 1, paddingHorizontal: 13, fontSize: 14 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeChoice: { minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 6 },
  error: { fontSize: 11, lineHeight: 16 },
  primaryButton: { minHeight: 45, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  ruleList: { gap: 8 },
  ruleRow: { minHeight: 68, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleName: { fontSize: 13, fontWeight: '700' },
  ruleRate: { fontSize: 14, fontWeight: '700' },
  resultBox: { borderRadius: 14, padding: 13, gap: 9 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  resultLabel: { fontSize: 12 },
  resultDivider: { height: StyleSheet.hairlineWidth },
  convertedValue: { fontSize: 22, lineHeight: 29, fontWeight: '700' },
  timestamp: { fontSize: 10 },
  resourceRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8 },
  resourceIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  resourceLink: { fontSize: 12, fontWeight: '700' },
});
