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
};

type NewTransaction = Omit<Transaction, 'id' | 'date'> & { date?: string };
type NewInvoice = Omit<Invoice, 'id' | 'status'>;

type FinanceContextValue = {
  state: FinanceState;
  isReady: boolean;
  storageError: string | null;
  addTransaction: (transaction: NewTransaction) => void;
  addInvoice: (invoice: NewInvoice) => void;
  markInvoicePaid: (invoiceId: string) => void;
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
        const parsed = JSON.parse(saved) as FinanceState;
        if (
          typeof parsed.openingCash === 'number' &&
          Array.isArray(parsed.transactions) &&
          Array.isArray(parsed.invoices)
        ) {
          if (active) setState(parsed);
        } else {
          throw new Error('Saved workspace data is incomplete.');
        }
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
      transactions: [newTransaction, ...current.transactions],
    }));
  }, []);

  const addInvoice = useCallback((invoice: NewInvoice) => {
    setState((current) => ({
      ...current,
      invoices: [{ ...invoice, id: createId('inv'), status: 'unpaid' }, ...current.invoices],
    }));
  }, []);

  const markInvoicePaid = useCallback((invoiceId: string) => {
    setState((current) => {
      const invoice = current.invoices.find((item) => item.id === invoiceId);
      if (!invoice || invoice.status === 'paid') return current;
      return {
        ...current,
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

  const resetSampleWorkspace = useCallback(() => {
    setState(createSampleState());
  }, []);

  const value = useMemo(
    () => ({
      state,
      isReady,
      storageError,
      addTransaction,
      addInvoice,
      markInvoicePaid,
      resetSampleWorkspace,
    }),
    [state, isReady, storageError, addTransaction, addInvoice, markInvoicePaid, resetSampleWorkspace],
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
