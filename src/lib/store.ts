"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// --- Types ---
export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string; // ISO date string
  note: string;
  createdAt: string;
}

export interface User {
  username: string;
  passwordHash: string;
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
        if (users.find((u) => u.username === username)) {
          return { success: false, error: "Username already exists" };
        }
        if (password.length < 4) {
          return { success: false, error: "Password must be at least 4 characters" };
        }
        const passwordHash = await simpleHash(password);
        const newUser = { username, passwordHash };
        set({
          users: [...users, newUser],
          currentUser: username,
          isAuthenticated: true,
          isLocked: false,
        });
        return { success: true };
      },

      login: async (username, password) => {
        const { users } = get();
        const user = users.find((u) => u.username === username);
        if (!user) {
          return { success: false, error: "User not found. Please sign up first." };
        }
        const passwordHash = await simpleHash(password);
        if (user.passwordHash !== passwordHash) {
          return { success: false, error: "Incorrect password" };
        }
        set({
          currentUser: username,
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

// --- Expense Store ---
interface ExpenseState {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  getExpensesByUser: (username: string) => Expense[];
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

      updateExpense: (id, updates) => {
        set((state) => ({
          expenses: state.expenses.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        }));
      },

      deleteExpense: (id) => {
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        }));
      },

      getExpensesByUser: (username) => {
        return get().expenses;
        // All expenses are shared per-browser (single user per device approach)
        // In a real app, each expense would have a userId field
      },
    }),
    {
      name: "expense-data",
    }
  )
);
