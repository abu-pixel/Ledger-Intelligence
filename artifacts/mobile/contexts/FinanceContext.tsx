import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ThemeId } from '@/constants/colors';
import { getFinanceWorkspace, saveFinanceWorkspace } from '@workspace/api-client-react';

export type TransactionKind = 'income' | 'expense';

export type Transaction = {
  id: string;
  title: string;
  category: string;
  date: string;
  amount: number;
  kind: TransactionKind;
  receiptUri?: string;
};

export type Invoice = {
  id: string;
  client: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'unpaid';
};

export type TaxRuleMode = 'exclusive' | 'inclusive';
export type TaxRule = {
  id: string;
  name: string;
  countryCode: string;
  ratePercent: number;
  mode: TaxRuleMode;
};

type FinanceState = {
  userName: string;
  businessName: string;
  onboardingCompleted: boolean;
  openingCash: number;
  transactions: Transaction[];
  invoices: Invoice[];
  countryCode: string;
  currencyCode: string;
  themeId: ThemeId;
  vatRatePercent: number | null;
  aiConsentAccepted: boolean;
  sampleOnly: boolean;
  taxRules: TaxRule[];
};

type NewTransaction = Omit<Transaction, 'id' | 'date'> & { date?: string };
type NewInvoice = Omit<Invoice, 'id' | 'status'>;
type NewTaxRule = Omit<TaxRule, 'id'>;
type UpdateCountry = (countryCode: string, suggestedCurrencyCode: string | null) => void;
export type SyncStatus = 'local' | 'loading' | 'synced' | 'syncing' | 'offline' | 'conflict';

type FinanceContextValue = {
  state: FinanceState;
  isReady: boolean;
  storageError: string | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  legacyImportAvailable: boolean;
  addTransaction: (transaction: NewTransaction) => void;
  addInvoice: (invoice: NewInvoice) => void;
  markInvoicePaid: (invoiceId: string) => void;
  deleteTransaction: (transactionId: string) => void;
  deleteInvoice: (invoiceId: string) => void;
  updateCountry: UpdateCountry;
  updateCurrency: (currencyCode: string) => void;
  updateTheme: (themeId: ThemeId) => void;
  updateVatRate: (rate: number | null) => void;
  setAiConsentAccepted: (accepted: boolean) => void;
  setOnboardingProfile: (userName: string, businessName: string) => void;
  addTaxRule: (rule: NewTaxRule) => void;
  deleteTaxRule: (ruleId: string) => void;
  retrySync: () => void;
  restoreCloudWorkspace: () => Promise<void>;
  overwriteCloudWorkspace: () => Promise<void>;
  importLegacyWorkspace: () => Promise<void>;
  dismissLegacyImport: () => Promise<void>;
  resetSampleWorkspace: () => void;
};

const STORAGE_KEY = 'ledgerly.finance.v1';
const ACCOUNT_STORAGE_PREFIX = 'ledgerly.finance.account.v2.';
const LEGACY_DISMISSED_PREFIX = 'ledgerly.finance.legacy-dismissed.';
const FinanceContext = createContext<FinanceContextValue | null>(null);

function dateAtMonthOffset(monthsAgo: number, day = 12) {
  const date = new Date();
  date.setDate(day);
  date.setMonth(date.getMonth() - monthsAgo);
  return date.toISOString();
}

function dateWithOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createInitialState(): FinanceState {
  return {
    userName: '',
    businessName: '',
    onboardingCompleted: false,
    openingCash: 0,
    countryCode: 'US',
    currencyCode: 'USD',
    themeId: 'forest',
    vatRatePercent: null,
    aiConsentAccepted: false,
    sampleOnly: false,
    taxRules: [],
    transactions: [],
    invoices: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.category === 'string' &&
    typeof value.date === 'string' &&
    Number.isFinite(new Date(value.date).getTime()) &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    value.amount >= 0 &&
    (value.kind === 'income' || value.kind === 'expense') &&
    (value.receiptUri === undefined || typeof value.receiptUri === 'string')
  );
}

function isInvoice(value: unknown): value is Invoice {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.client === 'string' &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    value.amount >= 0 &&
    typeof value.dueDate === 'string' &&
    Number.isFinite(new Date(value.dueDate).getTime()) &&
    (value.status === 'paid' || value.status === 'unpaid')
  );
}

function isTaxRule(value: unknown): value is TaxRule {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    value.name.length <= 80 &&
    typeof value.countryCode === 'string' &&
    /^[A-Z]{2}$/.test(value.countryCode) &&
    typeof value.ratePercent === 'number' &&
    Number.isFinite(value.ratePercent) &&
    value.ratePercent >= 0 &&
    value.ratePercent <= 100 &&
    (value.mode === 'inclusive' || value.mode === 'exclusive')
  );
}

function defaultVatRate(countryCode: string) {
  return countryCode === 'ET' ? 15 : null;
}

function migrateSavedState(value: unknown): FinanceState {
  if (!isRecord(value)) throw new Error('Saved workspace data is incomplete.');
  if (
    typeof value.openingCash !== 'number' ||
    !Number.isFinite(value.openingCash) ||
    !Array.isArray(value.transactions) ||
    !value.transactions.every(isTransaction) ||
    !Array.isArray(value.invoices) ||
    !value.invoices.every(isInvoice)
  ) {
    throw new Error('Saved workspace data is incomplete.');
  }

  const countryCode =
    typeof value.countryCode === 'string' && /^[A-Z]{2}$/.test(value.countryCode)
      ? value.countryCode
      : 'US';
  const currencyCode =
    typeof value.currencyCode === 'string' && /^[A-Z]{3}$/.test(value.currencyCode)
      ? value.currencyCode
      : 'USD';
  const themeId = ['forest', 'ocean', 'plum', 'sunset', 'midnight'].includes(
    String(value.themeId),
  )
    ? (value.themeId as ThemeId)
    : 'forest';
  const vatRatePercent =
    value.vatRatePercent === null ||
    (typeof value.vatRatePercent === 'number' &&
      Number.isFinite(value.vatRatePercent) &&
      value.vatRatePercent >= 0 &&
      value.vatRatePercent <= 100)
      ? value.vatRatePercent
      : defaultVatRate(countryCode);
  const userName = typeof value.userName === 'string' ? value.userName : '';
  const businessName = typeof value.businessName === 'string' ? value.businessName : '';
  const onboardingCompleted =
    typeof value.onboardingCompleted === 'boolean'
      ? value.onboardingCompleted
      : Boolean(userName && businessName);

  return {
    userName,
    businessName,
    onboardingCompleted,
    openingCash: typeof value.openingCash === 'number' && Number.isFinite(value.openingCash) ? value.openingCash : 0,
    transactions: value.transactions,
    invoices: value.invoices,
    countryCode,
    currencyCode,
    themeId,
    vatRatePercent,
    aiConsentAccepted: value.aiConsentAccepted === true,
    sampleOnly: false,
    taxRules:
      Array.isArray(value.taxRules) && value.taxRules.every(isTaxRule)
        ? value.taxRules
        : [],
  };
}

function parseStoredWorkspace(raw: string) {
  const parsed: unknown = JSON.parse(raw);
  if (
    isRecord(parsed) &&
    parsed.version === 2 &&
    isRecord(parsed.state) &&
    typeof parsed.updatedAt === 'number' &&
    Number.isFinite(parsed.updatedAt)
  ) {
    return {
      state: migrateSavedState(parsed.state),
      updatedAt: parsed.updatedAt,
    };
  }
  return { state: migrateSavedState(parsed), updatedAt: 0 };
}

function cloudSafeState(state: FinanceState): FinanceState {
  return {
    ...state,
    transactions: state.transactions.map(({ receiptUri: _receiptUri, ...transaction }) => transaction),
  };
}

function withLocalReceipts(remote: FinanceState, local: FinanceState): FinanceState {
  const receiptsById = new Map(
    local.transactions
      .filter((transaction) => transaction.receiptUri)
      .map((transaction) => [transaction.id, transaction.receiptUri as string]),
  );
  return {
    ...remote,
    transactions: remote.transactions.map((transaction) => ({
      ...transaction,
      ...(receiptsById.has(transaction.id)
        ? { receiptUri: receiptsById.get(transaction.id) }
        : {}),
    })),
  };
}

function getHttpStatus(error: unknown) {
  if (!isRecord(error)) return undefined;
  if (typeof error.status === 'number') return error.status;
  if (isRecord(error.response) && typeof error.response.status === 'number') {
    return error.response.status;
  }
  return undefined;
}

export function FinanceProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string | null;
}) {
  const [state, setState] = useState<FinanceState>(createInitialState);
  const [isReady, setIsReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(userId ? 'loading' : 'local');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [legacyState, setLegacyState] = useState<FinanceState | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const storageKey = userId ? `${ACCOUNT_STORAGE_PREFIX}${userId}` : null;
  const stateRef = useRef(state);
  const localUpdatedAtRef = useRef(0);
  const remoteRevisionRef = useRef(0);
  const remoteReadyRef = useRef(false);
  const suppressPersistRef = useRef(false);
  const lastSyncedHashRef = useRef('');

  useEffect(() => {
    let active = true;
    setIsReady(false);
    setState(createInitialState());
    setLegacyState(null);
    stateRef.current = createInitialState();
    localUpdatedAtRef.current = 0;
    remoteRevisionRef.current = 0;
    remoteReadyRef.current = false;
    lastSyncedHashRef.current = '';
    setSyncStatus(userId ? 'loading' : 'local');
    setSyncError(null);

    async function load() {
      try {
        if (!userId || !storageKey) return;
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          const parsed = parseStoredWorkspace(saved);
          if (active) {
            stateRef.current = parsed.state;
            localUpdatedAtRef.current = parsed.updatedAt;
            suppressPersistRef.current = true;
            setState(parsed.state);
          }
        } else {
          const [legacy, dismissed] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEY),
            AsyncStorage.getItem(`${LEGACY_DISMISSED_PREFIX}${userId}`),
          ]);
          if (legacy && dismissed !== 'true' && active) {
            try {
              setLegacyState(parseStoredWorkspace(legacy).state);
            } catch {
              setStorageError('An older on-device ledger could not be read safely.');
            }
          }
        }
      } catch {
        if (active) {
          setStorageError('Saved data could not be loaded. Your sample workspace is still available.');
        }
      } finally {
        if (active) {
          suppressPersistRef.current = true;
          setIsReady(true);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [storageKey, userId]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!isReady || !storageKey) return;
    if (suppressPersistRef.current) {
      suppressPersistRef.current = false;
      return;
    }
    const updatedAt = Date.now();
    localUpdatedAtRef.current = updatedAt;
    AsyncStorage.setItem(
      storageKey,
      JSON.stringify({ version: 2, updatedAt, state }),
    ).then(
      () => setStorageError(null),
      () => setStorageError('Changes could not be saved on this device.'),
    );
  }, [isReady, state, storageKey]);

  useEffect(() => {
    if (!userId || !isReady) {
      remoteReadyRef.current = false;
      return;
    }
    let active = true;
    setSyncStatus('loading');
    setSyncError(null);

    void getFinanceWorkspace()
      .then((remote) => {
        if (!active) return;
        const local = stateRef.current;
        const remoteTime = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
        remoteRevisionRef.current = remote.revision;
        remoteReadyRef.current = true;

        if (!remote.state) {
          lastSyncedHashRef.current = '';
          setSyncStatus('syncing');
          return;
        }

        const remoteState = migrateSavedState(remote.state);
        const localIsNewer =
          !local.sampleOnly &&
          (!remoteState.sampleOnly || localUpdatedAtRef.current > remoteTime);
        if (localIsNewer) {
          setSyncStatus('syncing');
          return;
        }

        const merged = withLocalReceipts(remoteState, local);
        stateRef.current = merged;
        localUpdatedAtRef.current = remoteTime;
        suppressPersistRef.current = true;
        setState(merged);
        lastSyncedHashRef.current = JSON.stringify(cloudSafeState(merged));
        setSyncStatus('synced');
      })
      .catch(() => {
        if (!active) return;
        remoteReadyRef.current = false;
        setSyncStatus('offline');
        setSyncError('Your workspace is safe on this device, but cloud sync is unavailable.');
      });

    return () => {
      active = false;
    };
  }, [isReady, retryVersion, userId]);

  useEffect(() => {
    if (!isReady || !userId || !remoteReadyRef.current) return;
    const cloudState = cloudSafeState(state);
    const hash = JSON.stringify(cloudState);
    if (hash === lastSyncedHashRef.current) return;

    let active = true;
    const timeout = setTimeout(() => {
      setSyncStatus('syncing');
      setSyncError(null);
      void saveFinanceWorkspace({
        state: cloudState,
        expectedRevision: remoteRevisionRef.current,
      })
        .then((saved) => {
          if (!active) return;
          remoteRevisionRef.current = saved.revision;
          lastSyncedHashRef.current = hash;
          setSyncStatus(
            JSON.stringify(cloudSafeState(stateRef.current)) === hash
              ? 'synced'
              : 'syncing',
          );
        })
        .catch((error: unknown) => {
          if (!active) return;
          if (getHttpStatus(error) === 409) {
            setSyncStatus('conflict');
            setSyncError('Another device has a newer version. Choose which version to keep in Settings.');
          } else {
            setSyncStatus('offline');
            setSyncError('Your latest changes are saved on this device and will sync after a retry.');
          }
        });
    }, 700);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [isReady, state, userId]);

  const addTransaction = useCallback((transaction: NewTransaction) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: createId('tx'),
      date: transaction.date ?? new Date().toISOString(),
    };
    setState((current) => ({
      ...current,
      sampleOnly: false,
      transactions: [newTransaction, ...current.transactions],
    }));
  }, []);

  const addInvoice = useCallback((invoice: NewInvoice) => {
    setState((current) => ({
      ...current,
      sampleOnly: false,
      invoices: [{ ...invoice, id: createId('inv'), status: 'unpaid' }, ...current.invoices],
    }));
  }, []);

  const markInvoicePaid = useCallback((invoiceId: string) => {
    setState((current) => {
      const invoice = current.invoices.find((item) => item.id === invoiceId);
      if (!invoice || invoice.status === 'paid') return current;
      return {
        ...current,
        sampleOnly: false,
        invoices: current.invoices.map((item) =>
          item.id === invoiceId ? { ...item, status: 'paid' } : item,
        ),
        transactions: [
          {
            id: createId('tx'),
            title: `Invoice paid · ${invoice.client}`,
            category: 'Client income',
            amount: invoice.amount,
            kind: 'income',
            date: new Date().toISOString(),
          },
          ...current.transactions,
        ],
      };
    });
  }, []);

  const deleteTransaction = useCallback((transactionId: string) => {
    setState((current) => ({
      ...current,
      sampleOnly: false,
      transactions: current.transactions.filter((item) => item.id !== transactionId),
    }));
  }, []);

  const deleteInvoice = useCallback((invoiceId: string) => {
    setState((current) => ({
      ...current,
      sampleOnly: false,
      invoices: current.invoices.filter((item) => item.id !== invoiceId),
    }));
  }, []);

  const updateCountry = useCallback<UpdateCountry>((countryCode, suggestedCurrencyCode) => {
    if (!/^[A-Z]{2}$/.test(countryCode)) return;
    setState((current) => ({
      ...current,
      countryCode,
      currencyCode:
        current.sampleOnly && suggestedCurrencyCode
          ? suggestedCurrencyCode
          : current.currencyCode,
      vatRatePercent: defaultVatRate(countryCode),
    }));
  }, []);

  const updateCurrency = useCallback((currencyCode: string) => {
    if (!/^[A-Z]{3}$/.test(currencyCode)) return;
    setState((current) => ({ ...current, currencyCode }));
  }, []);

  const updateTheme = useCallback((themeId: ThemeId) => {
    setState((current) => ({ ...current, themeId }));
  }, []);

  const updateVatRate = useCallback((rate: number | null) => {
    if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 100)) return;
    setState((current) => ({ ...current, vatRatePercent: rate }));
  }, []);

  const setAiConsentAccepted = useCallback((accepted: boolean) => {
    setState((current) => ({ ...current, aiConsentAccepted: accepted }));
  }, []);

  const setOnboardingProfile = useCallback((userName: string, businessName: string) => {
    setState((current) => ({
      ...current,
      userName: userName.trim(),
      businessName: businessName.trim(),
      onboardingCompleted: true,
    }));
  }, []);

  const addTaxRule = useCallback((rule: NewTaxRule) => {
    if (
      !rule.name.trim() ||
      rule.name.length > 80 ||
      !/^[A-Z]{2}$/.test(rule.countryCode) ||
      !Number.isFinite(rule.ratePercent) ||
      rule.ratePercent < 0 ||
      rule.ratePercent > 100
    ) return;
    setState((current) => ({
      ...current,
      sampleOnly: false,
      taxRules: [
        { ...rule, id: createId('tax'), name: rule.name.trim() },
        ...current.taxRules,
      ],
    }));
  }, []);

  const deleteTaxRule = useCallback((ruleId: string) => {
    setState((current) => ({
      ...current,
      sampleOnly: false,
      taxRules: current.taxRules.filter((rule) => rule.id !== ruleId),
    }));
  }, []);

  const retrySync = useCallback(() => {
    if (syncStatus === 'conflict') return;
    remoteReadyRef.current = false;
    setRetryVersion((current) => current + 1);
  }, [syncStatus]);

  const restoreCloudWorkspace = useCallback(async () => {
    if (!userId) throw new Error('Sign in before restoring cloud data.');
    const remote = await getFinanceWorkspace();
    if (!remote.state) throw new Error('There is no saved cloud workspace to restore.');
    const restored = migrateSavedState(remote.state);
    remoteRevisionRef.current = remote.revision;
    remoteReadyRef.current = true;
    stateRef.current = restored;
    localUpdatedAtRef.current = remote.updatedAt ? Date.parse(remote.updatedAt) : Date.now();
    lastSyncedHashRef.current = JSON.stringify(cloudSafeState(restored));
    suppressPersistRef.current = true;
    setState(restored);
    setSyncStatus('synced');
    setSyncError(null);
  }, [userId]);

  const overwriteCloudWorkspace = useCallback(async () => {
    if (!userId) throw new Error('Sign in before syncing cloud data.');
    const remote = await getFinanceWorkspace();
    const cloudState = cloudSafeState(stateRef.current);
    const saved = await saveFinanceWorkspace({
      state: cloudState,
      expectedRevision: remote.revision,
    });
    remoteRevisionRef.current = saved.revision;
    lastSyncedHashRef.current = JSON.stringify(cloudState);
    remoteReadyRef.current = true;
    setSyncStatus('synced');
    setSyncError(null);
  }, [userId]);

  const importLegacyWorkspace = useCallback(async () => {
    if (!userId || !storageKey || !legacyState) return;
    const updatedAt = Date.now();
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify({ version: 2, updatedAt, state: legacyState }),
    );
    localUpdatedAtRef.current = updatedAt;
    stateRef.current = legacyState;
    setState(legacyState);
    setLegacyState(null);
    setStorageError(null);
  }, [legacyState, storageKey, userId]);

  const dismissLegacyImport = useCallback(async () => {
    if (!userId) return;
    await AsyncStorage.setItem(`${LEGACY_DISMISSED_PREFIX}${userId}`, 'true');
    setLegacyState(null);
  }, [userId]);

  const resetSampleWorkspace = useCallback(() => {
    setState((current) => ({
      ...createInitialState(),
      countryCode: current.countryCode,
      currencyCode: current.currencyCode,
      themeId: current.themeId,
      vatRatePercent: current.vatRatePercent,
      aiConsentAccepted: current.aiConsentAccepted,
      taxRules: current.taxRules,
      userName: '',
      businessName: '',
      onboardingCompleted: false,
    }));
  }, []);

  const value = useMemo(
    () => ({
      state,
      isReady,
      storageError,
      syncStatus,
      syncError,
      legacyImportAvailable: Boolean(legacyState),
      addTransaction,
      addInvoice,
      markInvoicePaid,
      deleteTransaction,
      deleteInvoice,
      updateCountry,
      updateCurrency,
      updateTheme,
      updateVatRate,
      setAiConsentAccepted,
      setOnboardingProfile,
      addTaxRule,
      deleteTaxRule,
      retrySync,
      restoreCloudWorkspace,
      overwriteCloudWorkspace,
      importLegacyWorkspace,
      dismissLegacyImport,
      resetSampleWorkspace,
    }),
    [
      state,
      isReady,
      storageError,
      syncStatus,
      syncError,
      legacyState,
      addTransaction,
      addInvoice,
      markInvoicePaid,
      deleteTransaction,
      deleteInvoice,
      updateCountry,
      updateCurrency,
      updateTheme,
      updateVatRate,
      setAiConsentAccepted,
      setOnboardingProfile,
      addTaxRule,
      deleteTaxRule,
      retrySync,
      restoreCloudWorkspace,
      overwriteCloudWorkspace,
      importLegacyWorkspace,
      dismissLegacyImport,
      resetSampleWorkspace,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance must be used inside FinanceProvider.');
  return value;
}

export function addDaysToDate(days: number) {
  return dateWithOffset(days);
}
