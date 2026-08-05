"use client";

import { create } from "zustand";
import {
  auth,
  db,
  isFirebaseConfigured,
  usernameToEmail,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  firebaseDeleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  setDoc,
  getDocs,
  writeBatch,
} from "@/lib/firebase";
import type { Unsubscribe } from "firebase/firestore";

// Re-export Firebase config status for page.tsx
export { isFirebaseConfigured };

// --- Types ---
export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  note: string;
  createdAt: string;
}

// --- Currency System (unchanged) ---
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

// ============================================================
// AUTH STORE — backed by Firebase Authentication
// ============================================================

export const SECURITY_QUESTIONS = [
  "What is your pet's name?",
  "What city were you born in?",
  "What is your favorite food?",
  "What school did you attend?",
  "What is your mother's name?",
] as const;

interface AuthState {
  currentUser: string | null; // username (displayName)
  uid: string | null;
  isLocked: boolean;
  isAuthenticated: boolean;
  isInitializing: boolean; // true while Firebase checks auth state

  initAuth: () => () => void; // returns cleanup function
  signup: (username: string, password: string, securityQ: string, securityA: string) => Promise<{ success: boolean; error?: string }>;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  lock: () => void;
  unlock: (password: string) => Promise<boolean>;
  deleteAccount: (password: string) => Promise<{ success: boolean; error?: string }>;
  getSecurityQuestion: (username: string) => Promise<{ success: boolean; question?: string; error?: string }>;
  resetPassword: (username: string, securityAnswer: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  currentUser: null,
  uid: null,
  isLocked: false,
  isAuthenticated: false,
  isInitializing: true,

  initAuth: () => {
    if (!auth) {
      set({ isInitializing: false });
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        set({
          currentUser: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || null,
          uid: firebaseUser.uid,
          isAuthenticated: true,
          isInitializing: false,
          isLocked: false,
        });
      } else {
        set({
          currentUser: null,
          uid: null,
          isAuthenticated: false,
          isInitializing: false,
          isLocked: false,
        });
      }
    });

    return () => unsubscribe();
  },

  signup: async (username, password, securityQ, securityA) => {
    if (!auth || !db) {
      return { success: false, error: "Firebase is not configured. See .env.local" };
    }
    const normalized = username.trim().toLowerCase();
    if (normalized.length < 2) {
      return { success: false, error: "Username must be at least 2 characters" };
    }
    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }
    if (!securityQ || !securityA.trim()) {
      return { success: false, error: "Please select a security question and answer" };
    }
    try {
      const email = usernameToEmail(normalized);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: normalized });
      // Create default settings document in Firestore (includes security data)
      await setDoc(doc(db, "users", cred.user.uid, "settings", "config"), {
        currencyCode: "BHD",
        monthlyBudget: 0,
        securityQuestion: securityQ,
        securityAnswer: securityA.trim().toLowerCase(),
      });
      // Create username → UID mapping for password reset lookup
      await setDoc(doc(db, "usernames", normalized), {
        uid: cred.user.uid,
      });
      set({
        currentUser: normalized,
        uid: cred.user.uid,
        isAuthenticated: true,
        isLocked: false,
      });
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      if (code === "auth/email-already-in-use") {
        return { success: false, error: "Username already exists" };
      }
      if (code === "auth/weak-password") {
        return { success: false, error: "Password is too weak (min 6 chars)" };
      }
      if (code === "auth/invalid-email") {
        return { success: false, error: "Invalid username" };
      }
      return { success: false, error: "Signup failed. Please try again." };
    }
  },

  login: async (username, password) => {
    if (!auth) {
      return { success: false, error: "Firebase is not configured. See .env.local" };
    }
    const normalized = username.trim().toLowerCase();
    try {
      const email = usernameToEmail(normalized);
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting the state
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        return { success: false, error: "User not found. Please sign up first." };
      }
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        return { success: false, error: "Incorrect password" };
      }
      return { success: false, error: "Login failed. Please try again." };
    }
  },

  logout: async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch {
      // ignore sign out errors
    }
  },

  lock: () => {
    set({ isLocked: true });
  },

  unlock: async (password) => {
    if (!auth || !db) return false;
    const { currentUser, uid } = get();
    if (!currentUser || !uid || !auth.currentUser) return false;
    try {
      const email = usernameToEmail(currentUser);
      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      set({ isLocked: false });
      return true;
    } catch {
      return false;
    }
  },

  deleteAccount: async (password) => {
    if (!auth || !db || !auth.currentUser) {
      return { success: false, error: "Not authenticated" };
    }
    const { uid, currentUser } = get();
    if (!uid) return { success: false, error: "Not authenticated" };
    try {
      // Re-authenticate first (required before deleting account)
      const email = usernameToEmail(auth.currentUser.email?.split("@")[0] || "");
      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Delete all expenses from Firestore
      const expensesRef = collection(db, "users", uid, "expenses");
      const snapshot = await getDocs(expensesRef);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      // Delete settings document
      try {
        await deleteDoc(doc(db, "users", uid, "settings", "config"));
      } catch {
        // settings doc might not exist
      }

      // Delete username mapping
      if (currentUser) {
        try {
          await deleteDoc(doc(db, "usernames", currentUser));
        } catch {
          // ignore
        }
      }

      // Delete the Firebase Auth user
      await firebaseDeleteUser(auth.currentUser);
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        return { success: false, error: "Incorrect password" };
      }
      return { success: false, error: "Failed to delete account. Please try again." };
    }
  },

  getSecurityQuestion: async (username) => {
    if (!db) return { success: false, error: "Firebase not configured" };
    const normalized = username.trim().toLowerCase();
    try {
      const usernameDoc = await getDoc(doc(db, "usernames", normalized));
      if (!usernameDoc.exists()) {
        return { success: false, error: "User not found" };
      }
      const { uid } = usernameDoc.data();
      const settingsDoc = await getDoc(doc(db, "users", uid, "settings", "config"));
      if (!settingsDoc.exists()) {
        return { success: false, error: "User data not found" };
      }
      const { securityQuestion } = settingsDoc.data();
      return { success: true, question: securityQuestion };
    } catch {
      return { success: false, error: "Failed to look up user" };
    }
  },

  resetPassword: async (username, securityAnswer, newPassword) => {
    if (!auth || !db) {
      return { success: false, error: "Firebase not configured" };
    }
    const normalized = username.trim().toLowerCase();
    if (newPassword.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }
    try {
      // 1. Look up username → UID
      const usernameDoc = await getDoc(doc(db, "usernames", normalized));
      if (!usernameDoc.exists()) {
        return { success: false, error: "User not found" };
      }
      const uid = usernameDoc.data().uid;

      // 2. Verify security answer
      const settingsDoc = await getDoc(doc(db, "users", uid, "settings", "config"));
      if (!settingsDoc.exists()) {
        return { success: false, error: "User data not found" };
      }
      const { securityAnswer: storedAnswer } = settingsDoc.data();
      if (securityAnswer.trim().toLowerCase() !== storedAnswer) {
        return { success: false, error: "Incorrect security answer" };
      }

      // 3. Delete old auth user and create new one with new password
      // We need to delete the current user from Firebase Auth.
      // Since we can't use Admin SDK, we'll sign in as the user first
      // by temporarily signing in with a known mechanism, then updating.
      // Actually, the cleanest client-side approach: re-authenticate and update.
      // But the user forgot their password... so we use a workaround:
      // Delete the old auth user (requires being signed in) and recreate.
      // Since we can't sign them in, we'll use the API route approach.

      // Client-side workaround: sign in with any password to trigger Firebase,
      // then use the auth error to know the user exists.
      // The actual reset: we'll delete old user & recreate.
      // To delete without being signed in, we use a Next.js API route.

      // Call our API route to handle the reset server-side
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: usernameToEmail(normalized),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        return { success: false, error: data.error || "Failed to reset password" };
      }

      return { success: true };
    } catch {
      return { success: false, error: "Failed to reset password. Please try again." };
    }
  },
}));

// ============================================================
// EXPENSE STORE — backed by Cloud Firestore
// ============================================================

interface ExpenseState {
  expenses: Expense[];
  isLoading: boolean;
  _unsubscribe: Unsubscribe | null;

  subscribeToExpenses: (uid: string) => void;
  unsubscribeFromExpenses: () => void;
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>()((set, get) => ({
  expenses: [],
  isLoading: false,
  _unsubscribe: null,

  subscribeToExpenses: (uid: string) => {
    // Unsubscribe from previous if any
    const prev = get()._unsubscribe;
    if (prev) prev();

    if (!db) return;

    set({ isLoading: true });
    const expensesRef = collection(db, "users", uid, "expenses");
    const unsub = onSnapshot(
      expensesRef,
      (snapshot) => {
        const expenses: Expense[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || "",
            amount: data.amount || 0,
            category: data.category || "",
            date: data.date || "",
            note: data.note || "",
            createdAt: data.createdAt || "",
          };
        });
        set({ expenses, isLoading: false });
      },
      () => {
        set({ isLoading: false });
      }
    );

    set({ _unsubscribe: unsub });
  },

  unsubscribeFromExpenses: () => {
    const prev = get()._unsubscribe;
    if (prev) {
      prev();
      set({ _unsubscribe: null, expenses: [] });
    }
  },

  addExpense: async (expense) => {
    const { uid } = useAuthStore.getState();
    if (!db || !uid) return;
    const expensesRef = collection(db, "users", uid, "expenses");
    await addDoc(expensesRef, {
      ...expense,
      createdAt: new Date().toISOString(),
    });
    // onSnapshot will automatically update the store
  },

  updateExpense: async (id, updates) => {
    const { uid } = useAuthStore.getState();
    if (!db || !uid) return;
    const docRef = doc(db, "users", uid, "expenses", id);
    await updateDoc(docRef, updates);
    // onSnapshot will automatically update the store
  },

  deleteExpense: async (id) => {
    const { uid } = useAuthStore.getState();
    if (!db || !uid) return;
    const docRef = doc(db, "users", uid, "expenses", id);
    await deleteDoc(docRef);
    // onSnapshot will automatically update the store
  },
}));

// ============================================================
// SETTINGS STORE — backed by Cloud Firestore
// ============================================================

interface SettingsState {
  currencyCode: string;
  monthlyBudget: number;
  isLoading: boolean;
  _unsubscribe: Unsubscribe | null;

  subscribeToSettings: (uid: string) => void;
  unsubscribeFromSettings: () => void;
  saveSettings: (currencyCode: string, monthlyBudget: number) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  currencyCode: "BHD",
  monthlyBudget: 0,
  isLoading: false,
  _unsubscribe: null,

  subscribeToSettings: (uid: string) => {
    const prev = get()._unsubscribe;
    if (prev) prev();

    if (!db) return;

    set({ isLoading: true });
    const docRef = doc(db, "users", uid, "settings", "config");
    const unsub = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          set({
            currencyCode: data.currencyCode || "BHD",
            monthlyBudget: data.monthlyBudget || 0,
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }
      },
      () => {
        set({ isLoading: false });
      }
    );

    set({ _unsubscribe: unsub });
  },

  unsubscribeFromSettings: () => {
    const prev = get()._unsubscribe;
    if (prev) {
      prev();
      set({ _unsubscribe: null });
    }
  },

  saveSettings: async (currencyCode, monthlyBudget) => {
    const { uid } = useAuthStore.getState();
    if (!db || !uid) return;
    const docRef = doc(db, "users", uid, "settings", "config");
    await setDoc(docRef, { currencyCode, monthlyBudget }, { merge: true });
    // onSnapshot will automatically update the store
  },
}));
