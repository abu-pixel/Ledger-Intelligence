import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

type FinanceState = {
  openingCash: number;
  transactions: Transaction[];
  invoices: Invoice[];
  countryCode: string;
  currencyCode: string;
  themeId: ThemeId;
  vatRatePercent: number | null;
  aiConsentAccepted: boolean;
  sampleOnly: boolean;
};

type NewTransaction = Omit<Transaction, 'id' | 'date'> & { date?: string };
type NewInvoice = Omit<Invoice, 'id' | 'status'>;
type UpdateCountry = (countryCode: string, suggestedCurrencyCode: string | null) => void;

type FinanceContextValue = {
  state: FinanceState;
  isReady: boolean;
  storageError: string | null;
  addTransaction: (transaction: NewTransaction) => void;
  addInvoice: (invoice: NewInvoice) => void;
  markInvoicePaid: (invoiceId: string) => void;
  updateCountry: UpdateCountry;
  updateCurrency: (currencyCode: string) => void;
  updateTheme: (themeId: ThemeId) => void;
  updateVatRate: (rate: number | null) => void;
  setAiConsentAccepted: (accepted: boolean) => void;
  resetSampleWorkspace: () => void;
};

const STORAGE_KEY = 'ledgerly.finance.v1';
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

function createSampleState(): FinanceState {
  return {
    openingCash: 36500,
    countryCode: 'ET',
    currencyCode: 'ETB',
    themeId: 'forest',
    vatRatePercent: 15,
    aiConsentAccepted: false,
    sampleOnly: true,
    transactions: [
      {
        id: 'sample-1',
        title: 'Northstar retainer',
        category: 'Client income',
        amount: 8400,
        kind: 'income',
        date: dateAtMonthOffset(0, 12),
      },
      {
        id: 'sample-2',
        title: 'Online store sales',
        category: 'Sales',
        amount: 5200,
        kind: 'income',
        date: dateAtMonthOffset(0, 10),
      },
      {
        id: 'sample-3',
        title: 'Team payroll',
        category: 'Payroll',
        amount: 4250,
        kind: 'expense',
        date: dateAtMonthOffset(0, 8),
      },
      {
        id: 'sample-4',
        title: 'Studio lease',
        category: 'Rent',
        amount: 1850,
        kind: 'expense',
        date: dateAtMonthOffset(0, 5),
      },
      {
        id: 'sample-5',
        title: 'Cloud tools',
        category: 'Software',
        amount: 329.5,
        kind: 'expense',
        date: dateAtMonthOffset(0, 3),
      },
      {
        id: 'sample-6',
        title: 'Northstar retainer',
        category: 'Client income',
        amount: 5900,
        kind: 'income',
        date: dateAtMonthOffset(1, 12),
      },
      {
        id: 'sample-7',
        title: 'Tax preparation',
        category: 'Professional services',
        amount: 480,
        kind: 'expense',
        date: dateAtMonthOffset(1, 5),
      },
      {
        id: 'sample-8',
        title: 'Wholesale order',
        category: 'Sales',
        amount: 4400,
        kind: 'income',
        date: dateAtMonthOffset(2, 12),
      },
      {
        id: 'sample-9',
        title: 'Shipping supplies',
        category: 'Supplies',
        amount: 780,
        kind: 'expense',
        date: dateAtMonthOffset(2, 4),
      },
    ],
    invoices: [
      {
        id: 'inv-1',
        client: 'Arc & Pine Studio',
        amount: 4300,
        dueDate: dateWithOffset(6),
        status: 'unpaid',
      },
      {
        id: 'inv-2',
        client: 'Cornerstone Market',
        amount: 2100,
        dueDate: dateWithOffset(12),
        status: 'unpaid',
      },
      {
        id: 'inv-3',
        client: 'Levity Goods',
        amount: 3500,
        dueDate: dateWithOffset(-9),
        status: 'paid',
      },
    ],
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
  const inferredSampleOnly =
    value.openingCash === 36500 &&
    value.transactions.every((item) => item.id.startsWith('sample-')) &&
    value.invoices.every((item) => /^inv-\d+$/.test(item.id));

  return {
    openingCash: value.openingCash,
    transactions: value.transactions,
    invoices: value.invoices,
    countryCode,
    currencyCode,
    themeId,
    vatRatePercent,
    aiConsentAccepted: value.aiConsentAccepted === true,
    sampleOnly:
      typeof value.sampleOnly === 'boolean' ? value.sampleOnly : inferredSampleOnly,
  };
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(createSampleState);
  const [isReady, setIsReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        const parsed = migrateSavedState(JSON.parse(saved) as unknown);
        if (active) setState(parsed);
      } catch {
        if (active) {
          setStorageError('Saved data could not be loaded. Your sample workspace is still available.');
        }
      } finally {
        if (active) setIsReady(true);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).then(
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

  const resetSampleWorkspace = useCallback(() => {
    setState((current) => ({
      ...createSampleState(),
      countryCode: current.countryCode,
      currencyCode: current.currencyCode,
      themeId: current.themeId,
      vatRatePercent: current.vatRatePercent,
      aiConsentAccepted: current.aiConsentAccepted,
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
      updateCountry,
      updateCurrency,
      updateTheme,
      updateVatRate,
      setAiConsentAccepted,
      resetSampleWorkspace,
    }),
    [
      state,
      isReady,
      storageError,
      addTransaction,
      addInvoice,
      markInvoicePaid,
      updateCountry,
      updateCurrency,
      updateTheme,
      updateVatRate,
      setAiConsentAccepted,
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
