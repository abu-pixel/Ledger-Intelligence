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

type FinanceContextValue = {
  state: FinanceState;
  isReady: boolean;
  storageError: string | null;
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
  resetSampleWorkspace: () => void;
};

const STORAGE_KEY = 'ledgerly.finance.v1';
const FinanceContext = createContext<FinanceContextValue | null>(null);

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

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(createInitialState);
  const [isReady, setIsReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const suppressPersistRef = useRef(false);

  useEffect(() => {
    let active = true;
    setIsReady(false);
    setState(createInitialState());

    async function load() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && active) {
          const parsed = parseStoredWorkspace(saved);
          suppressPersistRef.current = true;
          setState(parsed.state);
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
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (suppressPersistRef.current) {
      suppressPersistRef.current = false;
      return;
    }
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, updatedAt: Date.now(), state }),
    ).then(
      () => setStorageError(null),
      () => setStorageError('Changes could not be saved on this device.'),
    );
  }, [isReady, state]);

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
      resetSampleWorkspace,
    }),
    [
      state,
      isReady,
      storageError,
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
