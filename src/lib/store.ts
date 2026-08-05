"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// --- Types ---
export interface Expense {
  id: string;
  username: string; // owner of this expense
  title: string;
  amount: number;
  category: string;
  date: string; // ISO date string
  note: string;
  createdAt: string;
}

export interface User {
  username: string; // always stored lowercase
  passwordHash: string;
}

// --- Currency System ---
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  { code: "BHD", symbol: "BD", name: "Bahraini Dinar", decimals: 3 },
  { code: "USD", symbol: "$", name: "US Dollar", decimals: 2 },
  { code: "EUR", symbol: "\u20AC", name: "Euro", decimals: 2 },
  { code: "GBP", symbol: "\u00A3", name: "British Pound", decimals: 2 },
  { code: "SAR", symbol: "SR", name: "Saudi Riyal", decimals: 2 },
  { code: "AED", symbol: "AED", name: "UAE Dirham", decimals: 2 },
  { code: "KWD", symbol: "KD", name: "Kuwaiti Dinar", decimals: 3 },
  { code: "QAR", symbol: "QR", name: "Qatari Riyal", decimals: 2 },
  { code: "OMR", symbol: "OMR", name: "Omani Rial", decimals: 3 },
  { code: "INR", symbol: "\u20B9", name: "Indian Rupee", decimals: 2 },
  { code: "PKR", symbol: "Rs", name: "Pakistani Rupee", decimals: 2 },
  { code: "BDT", symbol: "\u09F3", name: "Bangladeshi Taka", decimals: 2 },
  { code: "JPY", symbol: "\u00A5", name: "Japanese Yen", decimals: 0 },
  { code: "CNY", symbol: "\u00A5", name: "Chinese Yuan", decimals: 2 },
  { code: "PHP", symbol: "\u20B1", name: "Philippine Peso", decimals: 2 },
];

export function getCurrency(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  });
  return `${currency.symbol} ${formatted}`;
}

export const CATEGORIES = [
  "Food & Drinks",
  "Transport",
  "Shopping",
  "Bills & Utilities",
  "Entertainment",
  "Health",
  "Education",
  "Travel",
  "Groceries",
  "Other",
] as const;

export const CATEGORY_ICONS: Record<string, string> = {
  "Food & Drinks": "UtensilsCrossed",
  Transport: "Car",
  Shopping: "ShoppingBag",
  "Bills & Utilities": "Receipt",
  Entertainment: "Gamepad2",
  Health: "Heart",
  Education: "GraduationCap",
  Travel: "Plane",
  Groceries: "ShoppingCart",
  Other: "MoreHorizontal",
};

export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Drinks": "hsl(0, 72%, 56%)",
  Transport: "hsl(25, 95%, 53%)",
  Shopping: "hsl(45, 93%, 47%)",
  "Bills & Utilities": "hsl(142, 71%, 45%)",
  Entertainment: "hsl(173, 58%, 39%)",
  Health: "hsl(199, 89%, 48%)",
  Education: "hsl(262, 83%, 58%)",
  Travel: "hsl(292, 64%, 51%)",
  Groceries: "hsl(330, 81%, 52%)",
  Other: "hsl(215, 20%, 55%)",
};

// Simple hash function for password (NOT cryptographically secure - for demo only)
async function simpleHash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str + "expense-tracker-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- Auth Store ---
interface AuthState {
  users: User[];
  currentUser: string | null;
  isLocked: boolean;
  isAuthenticated: boolean;
  signup: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  lock: () => void;
  unlock: (password: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUser: null,
      isLocked: false,
      isAuthenticated: false,

      signup: async (username, password) => {
        const { users } = get();
        const normalized = username.trim().toLowerCase();
        if (users.find((u) => u.username === normalized)) {
          return { success: false, error: "Username already exists" };
        }
        if (normalized.length < 2) {
          return { success: false, error: "Username must be at least 2 characters" };
        }
        if (password.length < 4) {
          return { success: false, error: "Password must be at least 4 characters" };
        }
        const passwordHash = await simpleHash(password);
        const newUser = { username: normalized, passwordHash };
        set({
          users: [...users, newUser],
          currentUser: normalized,
          isAuthenticated: true,
          isLocked: false,
        });
        return { success: true };
      },

      login: async (username, password) => {
        const { users } = get();
        const normalized = username.trim().toLowerCase();
        const user = users.find((u) => u.username === normalized);
        if (!user) {
          return { success: false, error: "User not found. Please sign up first." };
        }
        const passwordHash = await simpleHash(password);
        if (user.passwordHash !== passwordHash) {
          return { success: false, error: "Incorrect password" };
        }
        set({
          currentUser: normalized,
          isAuthenticated: true,
          isLocked: false,
        });
        return { success: true };
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false, isLocked: false });
      },

      lock: () => {
        set({ isLocked: true });
      },

      unlock: async (password) => {
        const { users, currentUser } = get();
        if (!currentUser) return false;
        const user = users.find((u) => u.username === currentUser);
        if (!user) return false;
        const passwordHash = await simpleHash(password);
        if (user.passwordHash !== passwordHash) return false;
        set({ isLocked: false });
        return true;
      },
    }),
    {
      name: "expense-auth",
    }
  )
);

// --- Settings Store (currency + budget) ---
interface SettingsState {
  currencyCode: string;
  monthlyBudget: number;
  setCurrency: (code: string) => void;
  setMonthlyBudget: (amount: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currencyCode: "BHD", // Default BHD
      monthlyBudget: 0, // 0 means no budget set
      setCurrency: (code) => set({ currencyCode: code }),
      setMonthlyBudget: (amount) => set({ monthlyBudget: amount }),
    }),
    {
      name: "expense-settings",
    }
  )
);

// --- Expense Store ---
interface ExpenseState {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  updateExpense: (id: string, username: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string, username: string) => void;
  getExpensesForUser: (username: string) => Expense[];
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      expenses: [],

      addExpense: (expense) => {
        const newExpense: Expense = {
          ...expense,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ expenses: [...state.expenses, newExpense] }));
      },

      updateExpense: (id, username, updates) => {
        set((state) => ({
          expenses: state.expenses.map((e) =>
            e.id === id && e.username === username ? { ...e, ...updates } : e
          ),
        }));
      },

      deleteExpense: (id, username) => {
        set((state) => ({
          expenses: state.expenses.filter((e) => !(e.id === id && e.username === username)),
        }));
      },

      getExpensesForUser: (username) => {
        return get().expenses.filter((e) => e.username === username);
      },
    }),
    {
      name: "expense-data",
    }
  )
);
