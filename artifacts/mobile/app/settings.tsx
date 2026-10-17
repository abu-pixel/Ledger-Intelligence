import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useClerk, useUser } from '@clerk/expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppPage, BrandHeader, PageHeading, SectionTitle, Surface } from '@/components/FinanceUI';
import { useFinance } from '@/contexts/FinanceContext';
import { themePalettes, type ThemeId } from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import {
  AVAILABLE_CURRENCIES,
  COUNTRIES,
  COUNTRY_BY_CODE,
  getCurrencySymbol,
  getDefaultCurrencyCode,
  getCountryName,
  parseLocalizedAmount,
  type CountryOption,
  type CurrencyOption,
} from '@/lib/localization';

function SearchModal({
  visible,
  title,
  query,
  onChangeQuery,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  query: string;
  onChangeQuery: (value: string) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalPage, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          style={styles.modalContent}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close country and currency picker"
              style={[styles.modalClose, { backgroundColor: colors.secondary }]}
            >
              <Feather name="arrow-left" size={19} color={colors.secondaryForeground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
          </View>
          <View style={[styles.searchInputRow, { backgroundColor: colors.card, borderColor: colors.input }]}>
            <Feather name="search" size={17} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={onChangeQuery}
              placeholder="Search"
              placeholderTextColor={colors.mutedForeground}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.foreground }]}
              accessibilityLabel={`Search ${title.toLowerCase()}`}
            />
            {query ? (
              <Pressable onPress={() => onChangeQuery('')} accessibilityLabel="Clear search">
                <Feather name="x-circle" size={17} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
          {children}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const {
    state,
    updateCountry,
    updateCurrency,
    updateTheme,
    updateVatRate,
    setAiConsentAccepted,
    syncStatus,
    syncError,
    retrySync,
    restoreCloudWorkspace,
    overwriteCloudWorkspace,
    legacyImportAvailable,
    importLegacyWorkspace,
    dismissLegacyImport,
  } = useFinance();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [currencySearch, setCurrencySearch] = useState('');
  const [vatInput, setVatInput] = useState(
    state.vatRatePercent === null ? '' : String(state.vatRatePercent),
  );
  const [vatError, setVatError] = useState('');

  useEffect(() => {
    setVatInput(state.vatRatePercent === null ? '' : String(state.vatRatePercent));
  }, [state.vatRatePercent]);

  const country = COUNTRY_BY_CODE.get(state.countryCode);
  const currency = AVAILABLE_CURRENCIES.find((item) => item.code === state.currencyCode);
  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLocaleLowerCase();
    if (!query) return COUNTRIES;
    return COUNTRIES.filter((item) =>
      `${item.name} ${item.code} ${item.region} ${item.currencies
        .map((itemCurrency) => `${itemCurrency.code} ${itemCurrency.name}`)
        .join(' ')}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [countrySearch]);
  const filteredCurrencies = useMemo(() => {
    const query = currencySearch.trim().toLocaleLowerCase();
    if (!query) return AVAILABLE_CURRENCIES;
    return AVAILABLE_CURRENCIES.filter((item) =>
      `${item.code} ${item.name}`.toLocaleLowerCase().includes(query),
    );
  }, [currencySearch]);

  function chooseCountry(selected: CountryOption) {
    updateCountry(selected.code, getDefaultCurrencyCode(selected.code));
    setCountryPickerOpen(false);
    setCountrySearch('');
    setVatError('');
    setVatInput(selected.code === 'ET' ? '15' : '');
  }

  function chooseCurrency(selected: CurrencyOption) {
    updateCurrency(selected.code);
    setCurrencyPickerOpen(false);
    setCurrencySearch('');
  }

  function saveVatRate() {
    const parsedRate = parseLocalizedAmount(vatInput, state.countryCode);
    if (vatInput.trim() === '' || !Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      setVatError('Enter a rate from 0 to 100, or clear the rate to leave it unset.');
      return;
    }
    updateVatRate(parsedRate);
    setVatError('');
  }

  function openOfficialTaxSource() {
    void Linking.openURL('https://justice.gov.et/en?jet_download=90bc83fd30006baae50de5f0d366cdaeb5c816d4').catch(() => {
      Alert.alert('Could not open the source', 'Check your internet connection and try again.');
    });
  }

  function explainSyncStatus() {
    if (syncStatus === 'syncing') return 'Syncing your private workspace…';
    if (syncStatus === 'synced') return 'Saved on this device and synced to your account.';
    if (syncStatus === 'offline') return 'Saved on this device. Cloud sync will retry when you reconnect.';
    if (syncStatus === 'conflict') return 'A newer version exists on another device. Choose which copy to keep.';
    if (syncStatus === 'loading') return 'Checking your account workspace…';
    return 'Sign in to sync your workspace across devices.';
  }

  function confirmRestoreCloud() {
    Alert.alert(
      'Use the cloud copy?',
      'This replaces the ledger on this device with the latest cloud version. Your local changes that are not in the cloud will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore cloud copy',
          onPress: () => void restoreCloudWorkspace().catch(() =>
            Alert.alert('Could not restore', 'The cloud copy could not be loaded. Your local data is unchanged.'),
          ),
        },
      ],
    );
  }

  function confirmKeepThisDevice() {
    Alert.alert(
      'Keep this device’s copy?',
      'This replaces the cloud workspace with the version on this device, including its transactions and settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use this device',
          style: 'destructive',
          onPress: () => void overwriteCloudWorkspace().catch(() =>
            Alert.alert('Could not sync', 'The cloud copy changed again. Your local data is still safe on this device.'),
          ),
        },
      ],
    );
  }

  return (
    <AppPage>
      <BrandHeader
        eyebrow="PREFERENCES"
        trailing={
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={[styles.selectorIcon, { backgroundColor: colors.secondary }]}
          >
            <Feather name="arrow-left" size={17} color={colors.secondaryForeground} />
          </Pressable>
        }
      />
      <PageHeading title="Settings" subtitle="Choose the country, books currency, and look for this device." />

      <View style={styles.section}>
        <SectionTitle title="Account & sync" />
        <Surface style={styles.preferenceCard}>
          <Text style={[styles.selectorTitle, { color: colors.foreground }]}>Private account</Text>
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            {user?.primaryEmailAddress?.emailAddress ?? 'Signed-in account'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Feather
              name={syncStatus === 'synced' ? 'check-circle' : syncStatus === 'offline' || syncStatus === 'conflict' ? 'alert-circle' : 'cloud'}
              size={16}
              color={syncStatus === 'synced' ? colors.primary : syncStatus === 'conflict' ? colors.destructive : colors.mutedForeground}
            />
            <Text style={[styles.helperText, { color: colors.foreground, flex: 1 }]}>
              {explainSyncStatus()}
            </Text>
          </View>
          {syncError ? (
            <Text style={[styles.helperText, { color: colors.destructive }]}>{syncError}</Text>
          ) : null}
          {syncStatus === 'offline' ? (
            <Pressable
              onPress={retrySync}
              accessibilityRole="button"
              style={[styles.assistantButton, { backgroundColor: colors.secondary }]}
            >
              <Feather name="refresh-cw" size={15} color={colors.secondaryForeground} />
              <Text style={[styles.primaryButtonText, { color: colors.secondaryForeground }]}>Retry sync</Text>
            </Pressable>
          ) : null}
          {syncStatus === 'conflict' ? (
            <View style={{ gap: 9 }}>
              <Pressable
                onPress={confirmRestoreCloud}
                accessibilityRole="button"
                style={[styles.assistantButton, { backgroundColor: colors.secondary }]}
              >
                <Feather name="download-cloud" size={15} color={colors.secondaryForeground} />
                <Text style={[styles.primaryButtonText, { color: colors.secondaryForeground }]}>Use cloud copy</Text>
              </Pressable>
              <Pressable
                onPress={confirmKeepThisDevice}
                accessibilityRole="button"
                style={[styles.assistantButton, { backgroundColor: colors.primary }]}
              >
                <Feather name="upload-cloud" size={15} color={colors.primaryForeground} />
                <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Keep this device’s copy</Text>
              </Pressable>
            </View>
          ) : null}
          {legacyImportAvailable ? (
            <View style={{ gap: 7, marginTop: 6 }}>
              <Text style={[styles.selectorTitle, { color: colors.foreground }]}>Older ledger on this device</Text>
              <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                Import it only if you want this existing device data linked to your signed-in account.
              </Text>
              <Pressable
                onPress={() => Alert.alert(
                  'Import this ledger?',
                  'Its transactions and settings will be saved under your account and synced to your other signed-in devices.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Import to account',
                      onPress: () => void importLegacyWorkspace().catch(() =>
                        Alert.alert('Could not import', 'The older ledger remains unchanged on this device.'),
                      ),
                    },
                  ],
                )}
                accessibilityRole="button"
                style={[styles.assistantButton, { backgroundColor: colors.primary }]}
              >
                <Feather name="download" size={15} color={colors.primaryForeground} />
                <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Import to account</Text>
              </Pressable>
              <Pressable
                onPress={() => void dismissLegacyImport().catch(() =>
                  Alert.alert('Could not update', 'The older ledger remains on this device.'),
                )}
                accessibilityRole="button"
                style={styles.notNowButton}
              >
                <Text style={[styles.helperText, { color: colors.mutedForeground }]}>Leave it on this device</Text>
              </Pressable>
            </View>
          ) : null}
          <Pressable
            onPress={() => void signOut().catch(() =>
              Alert.alert('Could not sign out', 'Check your connection and try again.'),
            )}
            accessibilityRole="button"
            style={[styles.assistantButton, { backgroundColor: colors.secondary }]}
          >
            <Feather name="log-out" size={15} color={colors.secondaryForeground} />
            <Text style={[styles.primaryButtonText, { color: colors.secondaryForeground }]}>Sign out</Text>
          </Pressable>
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionTitle title="Country & currency" />
        <Surface style={styles.preferenceCard}>
          <Text style={[styles.preferenceLabel, { color: colors.mutedForeground }]}>Accounting country</Text>
          <Pressable
            onPress={() => setCountryPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Choose accounting country"
            style={[styles.selectorButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.selectorIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="globe" size={17} color={colors.primary} />
            </View>
            <View style={styles.selectorCopy}>
              <Text style={[styles.selectorTitle, { color: colors.foreground }]}>
                {country?.name ?? getCountryName(state.countryCode)}
              </Text>
              <Text style={[styles.selectorNote, { color: colors.mutedForeground }]}>
                {country?.region || 'Country'} · {state.countryCode}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>

          <Text style={[styles.preferenceLabel, { color: colors.mutedForeground, marginTop: 10 }]}>
            Books currency
          </Text>
          <Pressable
            onPress={() => setCurrencyPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Choose books currency"
            style={[styles.selectorButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.selectorIcon, { backgroundColor: colors.accent }]}>
              <Text style={[styles.currencyMark, { color: colors.accentForeground }]}>
                {getCurrencySymbol(state.currencyCode, state.countryCode)}
              </Text>
            </View>
            <View style={styles.selectorCopy}>
              <Text style={[styles.selectorTitle, { color: colors.foreground }]}>{state.currencyCode}</Text>
              <Text style={[styles.selectorNote, { color: colors.mutedForeground }]}>
                {currency?.name ?? 'Custom or unavailable currency'}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            {state.sampleOnly
              ? 'The sample ledger follows the country’s listed currency. Choose another books currency if needed.'
              : 'Changing country keeps your books currency. Changing books currency only changes labels—no exchange conversion is applied.'}
          </Text>
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionTitle title="VAT profile" />
        <Surface style={styles.preferenceCard}>
          <View style={styles.rateTitleRow}>
            <View style={[styles.selectorIcon, { backgroundColor: colors.accent }]}>
              <Feather name="percent" size={17} color={colors.accentForeground} />
            </View>
            <View style={styles.selectorCopy}>
              <Text style={[styles.selectorTitle, { color: colors.foreground }]}>
                {state.vatRatePercent === null ? 'No rate configured' : `${state.vatRatePercent}% reference rate`}
              </Text>
              <Text style={[styles.selectorNote, { color: colors.mutedForeground }]}>
                {state.countryCode === 'ET' ? 'Ethiopia · editable profile reference' : `${getCountryName(state.countryCode)} · editable by you`}
              </Text>
            </View>
          </View>
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            {state.countryCode === 'ET'
              ? 'Ethiopia’s regular VAT reference rate is 15% (Ministry of Justice VAT Refund Directive No. 1132/2026). Exemptions, zero-rating, eligibility, and later rules can change what applies to a business.'
              : 'No verified default is supplied for this country. Enter a rate only after confirming it for your business and tax status.'}
          </Text>
          <Text style={[styles.preferenceLabel, { color: colors.foreground }]}>Configured rate (%)</Text>
          <TextInput
            value={vatInput}
            onChangeText={setVatInput}
            keyboardType="decimal-pad"
            placeholder="e.g. 15"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]}
            accessibilityLabel="Configured VAT rate in percent"
          />
          {vatError ? <Text style={[styles.errorText, { color: colors.destructive }]}>{vatError}</Text> : null}
          <View style={styles.rateActions}>
            <Pressable
              onPress={() => {
                updateVatRate(null);
                setVatInput('');
                setVatError('');
              }}
              accessibilityRole="button"
              style={[styles.secondaryButton, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.secondaryForeground }]}>Clear rate</Text>
            </Pressable>
            <Pressable
              onPress={saveVatRate}
              accessibilityRole="button"
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Save rate</Text>
            </Pressable>
          </View>
          {state.countryCode === 'ET' ? (
            <Pressable onPress={openOfficialTaxSource} accessibilityRole="link" style={styles.sourceLink}>
              <Feather name="external-link" size={13} color={colors.primary} />
              <Text style={[styles.sourceLinkText, { color: colors.primary }]}>Open official VAT rate directive</Text>
            </Pressable>
          ) : null}
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            This profile does not calculate invoice taxes, income tax, or filings. Confirm obligations with a qualified local professional.
          </Text>
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionTitle title="Appearance" />
        <View style={styles.themeGrid}>
          {(Object.keys(themePalettes) as ThemeId[]).map((themeId) => {
            const theme = themePalettes[themeId];
            const selected = state.themeId === themeId;
            return (
              <Pressable
                key={themeId}
                onPress={() => updateTheme(themeId)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Select ${theme.name} theme`}
                style={[
                  styles.themeChoice,
                  {
                    backgroundColor: colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                    borderWidth: selected ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.swatchRow}>
                  {theme.swatches.map((swatch, index) => (
                    <View key={`${themeId}-${index}`} style={[styles.swatch, { backgroundColor: swatch }]} />
                  ))}
                </View>
                <View style={styles.themeLabelRow}>
                  <Text style={[styles.themeLabel, { color: colors.foreground }]}>{theme.name}</Text>
                  {selected ? <Feather name="check-circle" size={15} color={colors.primary} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
          The other themes follow your device’s light or dark setting. Midnight always uses dark surfaces.
        </Text>
      </View>

      <View style={styles.section}>
        <SectionTitle title="Data Export" />
        <Surface style={styles.preferenceCard}>
          <Text style={[styles.selectorTitle, { color: colors.foreground }]}>Export Transaction Ledger</Text>
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            Export your entire income and expense transaction history as CSV data for tax preparation or backup.
          </Text>
          <Pressable
            onPress={() => {
              const header = 'ID,Date,Kind,Category,Title,Amount\n';
              const rows = state.transactions
                .map(
                  (t) =>
                    `"${t.id}","${t.date}","${t.kind}","${t.category}","${t.title.replace(/"/g, '""')}",${t.amount}`,
                )
                .join('\n');
              const csv = header + rows;
              Alert.alert(
                'Ledger CSV Export',
                `Exported ${state.transactions.length} transactions:\n\n${csv.slice(0, 250)}${csv.length > 250 ? '...' : ''}`,
                [{ text: 'Close', style: 'cancel' }],
              );
            }}
            accessibilityRole="button"
            style={[styles.assistantButton, { backgroundColor: colors.secondary }]}
          >
            <Feather name="download" size={16} color={colors.secondaryForeground} />
            <Text style={[styles.primaryButtonText, { color: colors.secondaryForeground }]}>Export CSV</Text>
          </Pressable>
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionTitle title="AI data sharing" />
        <Surface style={styles.preferenceCard}>
          <Text style={[styles.selectorTitle, { color: colors.foreground }]}>Accounting assistant privacy</Text>
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            If enabled, your question, country/currency, and aggregate cash-flow and invoice totals are sent to OpenAI through the app server. The app does not send receipt photos, client names, or transaction descriptions, and it does not save chat history. OpenAI processing remains subject to its service terms.
          </Text>
          <Pressable
            onPress={() => setAiConsentAccepted(!state.aiConsentAccepted)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: state.aiConsentAccepted }}
            style={[
              styles.consentButton,
              {
                backgroundColor: state.aiConsentAccepted ? colors.successSurface : colors.secondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Feather
              name={state.aiConsentAccepted ? 'check-square' : 'square'}
              size={20}
              color={state.aiConsentAccepted ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.consentText, { color: colors.foreground }]}>
              {state.aiConsentAccepted ? 'AI sharing is enabled' : 'Allow the assistant to send this limited summary'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/assistant')}
            accessibilityRole="button"
            style={[styles.assistantButton, { backgroundColor: colors.primary }]}
          >
            <Feather name="message-circle" size={16} color={colors.primaryForeground} />
            <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Open assistant</Text>
          </Pressable>
        </Surface>
      </View>

      <SearchModal
        visible={countryPickerOpen}
        title="Choose country"
        query={countrySearch}
        onChangeQuery={setCountrySearch}
        onClose={() => {
          setCountryPickerOpen(false);
          setCountrySearch('');
        }}
      >
        <FlatList
          data={filteredCountries}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.optionList}
          renderItem={({ item }) => {
            const selected = item.code === state.countryCode;
            const defaultCurrency = item.currencies[0];
            return (
              <Pressable
                onPress={() => chooseCountry(item)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.optionRow,
                  { borderBottomColor: colors.border, backgroundColor: pressed ? colors.muted : 'transparent' },
                ]}
              >
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionTitle, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.optionNote, { color: colors.mutedForeground }]}>
                    {item.region || 'Other'} · {defaultCurrency?.code ?? 'Currency not listed'}
                  </Text>
                </View>
                {selected ? <Feather name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.emptyList, { color: colors.mutedForeground }]}>No countries match that search.</Text>
          }
        />
      </SearchModal>

      <SearchModal
        visible={currencyPickerOpen}
        title="Choose books currency"
        query={currencySearch}
        onChangeQuery={setCurrencySearch}
        onClose={() => {
          setCurrencyPickerOpen(false);
          setCurrencySearch('');
        }}
      >
        <FlatList
          data={filteredCurrencies}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.optionList}
          renderItem={({ item }) => {
            const selected = item.code === state.currencyCode;
            return (
              <Pressable
                onPress={() => chooseCurrency(item)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.optionRow,
                  { borderBottomColor: colors.border, backgroundColor: pressed ? colors.muted : 'transparent' },
                ]}
              >
                <View style={[styles.currencyOptionMark, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.currencyMark, { color: colors.secondaryForeground }]}>
                    {getCurrencySymbol(item.code, state.countryCode)}
                  </Text>
                </View>
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionTitle, { color: colors.foreground }]}>{item.code}</Text>
                  <Text style={[styles.optionNote, { color: colors.mutedForeground }]}>{item.name}</Text>
                </View>
                {selected ? <Feather name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.emptyList, { color: colors.mutedForeground }]}>No currencies match that search.</Text>
          }
        />
      </SearchModal>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  section: { gap: 11 },
  preferenceCard: { gap: 11, padding: 16 },
  preferenceLabel: { fontSize: 12, fontWeight: '700' },
  selectorButton: {
    minHeight: 65,
    padding: 10,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  selectorIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  selectorCopy: { flex: 1, gap: 3 },
  selectorTitle: { fontSize: 14, fontWeight: '700' },
  selectorNote: { fontSize: 11, lineHeight: 15 },
  helperText: { fontSize: 11, lineHeight: 16 },
  currencyMark: { fontSize: 16, fontWeight: '700' },
  rateTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  textInput: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, fontSize: 15 },
  rateActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  secondaryButton: { minHeight: 42, paddingHorizontal: 13, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 12, fontWeight: '700' },
  primaryButton: { minHeight: 42, paddingHorizontal: 15, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 12, fontWeight: '700' },
  errorText: { fontSize: 11, fontWeight: '600' },
  sourceLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  sourceLinkText: { fontSize: 11, fontWeight: '700' },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeChoice: { width: '48%', minHeight: 77, padding: 11, borderRadius: 17 },
  swatchRow: { flexDirection: 'row', gap: 5, marginBottom: 10 },
  swatch: { width: 19, height: 19, borderRadius: 7 },
  themeLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  themeLabel: { fontSize: 12, fontWeight: '700' },
  consentButton: { borderWidth: 1, minHeight: 54, paddingHorizontal: 11, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  consentText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  assistantButton: { minHeight: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  modalPage: { flex: 1 },
  modalContent: { flex: 1, paddingHorizontal: 18, paddingTop: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16 },
  modalClose: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  searchInputRow: { minHeight: 48, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, minHeight: 44, fontSize: 14 },
  optionList: { paddingBottom: 20 },
  optionRow: { minHeight: 60, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 11 },
  optionCopy: { flex: 1, gap: 3 },
  optionTitle: { fontSize: 13, fontWeight: '700' },
  optionNote: { fontSize: 11 },
  currencyOptionMark: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  emptyList: { padding: 24, textAlign: 'center', fontSize: 13 },
});
