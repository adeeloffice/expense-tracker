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
  verifyBeforeUpdateEmail,
  sendPasswordResetEmail,
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

// ============================================================
// AUTH STORE — backed by Firebase Authentication
// ============================================================

interface AuthState {
  currentUser: string | null;
  uid: string | null;
  userEmail: string | null;
  isLocked: boolean;
  isAuthenticated: boolean;
  isInitializing: boolean;
  needsEmailUpdate: boolean;

  initAuth: () => () => void;
  signup: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  lock: () => void;
  unlock: (password: string) => Promise<boolean>;
  deleteAccount: (password: string) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (username: string) => Promise<{ success: boolean; error?: string }>;
  updateUserEmail: (newEmail: string, password?: string) => Promise<{ success: boolean; error?: string; warning?: string; verificationSent?: boolean }>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  currentUser: null,
  uid: null,
  userEmail: null,
  isLocked: false,
  isAuthenticated: false,
  isInitializing: true,
  needsEmailUpdate: false,

  initAuth: () => {
    if (!auth) {
      set({ isInitializing: false });
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || "";
        const needsEmail = email.endsWith("@et.app");
        set({
          currentUser: firebaseUser.displayName || email.split("@")[0],
          uid: firebaseUser.uid,
          userEmail: needsEmail ? null : email,
          isAuthenticated: true,
          isInitializing: false,
          isLocked: false,
          needsEmailUpdate: needsEmail,
        });
      } else {
        set({
          currentUser: null,
          uid: null,
          userEmail: null,
          isAuthenticated: false,
          isInitializing: false,
          isLocked: false,
          needsEmailUpdate: false,
        });
      }
    });

    return () => unsubscribe();
  },

  signup: async (username, email, password) => {
    if (!auth || !db) {
      return { success: false, error: "Firebase is not configured. See .env.local" };
    }
    const normalized = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();
    if (normalized.length < 2) {
      return { success: false, error: "Username must be at least 2 characters" };
    }
    // Email is optional — validate only if provided
    if (trimmedEmail && (!trimmedEmail.includes("@") || !trimmedEmail.includes("."))) {
      return { success: false, error: "Please enter a valid email address" };
    }
    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }
    try {
      // Use real email if provided, otherwise fall back to @et.app
      const authEmail = trimmedEmail || usernameToEmail(normalized);

      // Try creating the Firebase Auth user FIRST
      // This handles the case where a user was deleted from Firebase Console
      // but the usernames doc still exists in Firestore
      const cred = await createUserWithEmailAndPassword(auth, authEmail, password);
      await updateProfile(cred.user, { displayName: normalized });

      // Create default settings in Firestore
      await setDoc(doc(db, "users", cred.user.uid, "settings", "config"), {
        currencyCode: "BHD",
        monthlyBudget: 0,
      });

      // Create/update username → UID + email mapping
      // (setDoc overwrites any orphaned doc from a deleted user)
      await setDoc(doc(db, "usernames", normalized), {
        uid: cred.user.uid,
        email: trimmedEmail || null,
      });

      set({
        currentUser: normalized,
        uid: cred.user.uid,
        userEmail: trimmedEmail || null,
        isAuthenticated: true,
        isLocked: false,
        needsEmailUpdate: !trimmedEmail,
      });
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      if (code === "auth/email-already-in-use") {
        return { success: false, error: "This email or username is already registered" };
      }
      if (code === "auth/weak-password") {
        return { success: false, error: "Password is too weak (min 6 chars)" };
      }
      if (code === "auth/invalid-email") {
        return { success: false, error: "Invalid email address" };
      }
      return { success: false, error: "Signup failed. Please try again." };
    }
  },

  login: async (username, password) => {
    if (!auth || !db) {
      return { success: false, error: "Firebase is not configured. See .env.local" };
    }
    const normalized = username.trim().toLowerCase();
    try {
      // Look up the user's email from Firestore
      let email: string | null = null;
      const usernameDoc = await getDoc(doc(db, "usernames", normalized));
      if (usernameDoc.exists()) {
        email = usernameDoc.data().email || null;
      }
      // Fall back to fake email for users without real email
      if (!email) {
        email = usernameToEmail(normalized);
      }

      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        // Clean up orphaned Firestore doc if Firebase user was deleted externally
        try {
          const doc2 = await getDoc(doc(db!, "usernames", normalized));
          if (doc2.exists()) await deleteDoc(doc(db!, "usernames", normalized));
        } catch { /* ignore */ }
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
    if (!auth || !auth.currentUser) return false;
    try {
      // Use the actual email from Firebase Auth (works for both old and new users)
      const email = auth.currentUser.email!;
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
      // Re-authenticate (use actual email from Firebase Auth)
      const email = auth.currentUser.email!;
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

  forgotPassword: async (username) => {
    if (!auth || !db) {
      return { success: false, error: "Firebase not configured" };
    }
    const normalized = username.trim().toLowerCase();
    try {
      // Look up the user’s email from Firestore
      const usernameDoc = await getDoc(doc(db, "usernames", normalized));
      if (!usernameDoc.exists()) {
        return { success: false, error: "Username not found" };
      }
      const data = usernameDoc.data();
      const email = data.email;

      // Check if the user has a real recovery email
      if (!email || email.endsWith("@et.app")) {
        return {
          success: false,
          error: "This account was created without a recovery email. Please create a new account with your email to enable password reset.",
        };
      }

      // Send Firebase password reset email
      await sendPasswordResetEmail(auth, email, {
        url: "https://expense-tracker-five-alpha-69.vercel.app/",
      });
      return { success: true, email };
    } catch {
      return { success: false, error: "Failed to send reset email. Please try again." };
    }
  },

  updateUserEmail: async (newEmail, password) => {
    if (!auth?.currentUser) {
      return { success: false, error: "Not authenticated" };
    }
    const { currentUser } = get();
    if (!currentUser || !db) {
      return { success: false, error: "Not authenticated" };
    }
    const trimmedEmail = newEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      return { success: false, error: "Please enter a valid email address" };
    }

    // Step 1: Always save recovery email to Firestore first (this always works)
    try {
      await updateDoc(doc(db, "usernames", currentUser), { email: trimmedEmail });
    } catch {
      return { success: false, error: "Failed to save email. Please try again." };
    }

    // Update the local state immediately
    set({ userEmail: trimmedEmail, needsEmailUpdate: false });

    // Step 2: Try to send verification email (best effort, for password reset to work)
    // Uses verifyBeforeUpdateEmail which sends a confirmation link to the new email
    if (!password) {
      return { success: true, verificationSent: false, warning: "Email saved. To enable password reset, enter your password below and save again." };
    }

    try {
      const currentEmail = auth.currentUser.email!;
      const credential = EmailAuthProvider.credential(currentEmail, password);
      const result = await reauthenticateWithCredential(auth.currentUser, credential);
      // Send verification email instead of directly updating
      const actionCodeSettings = {
        url: "https://expense-tracker-five-alpha-69.vercel.app/",
      };
      await verifyBeforeUpdateEmail(result.user, trimmedEmail, actionCodeSettings);
      return { success: true, verificationSent: true };
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string; message?: string };
      const code = firebaseErr.code || "";
      if (code === "auth/email-already-in-use") {
        return { success: true, verificationSent: false, warning: "Email saved, but password reset may not work because this email is already used by another account." };
      }
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        return { success: true, verificationSent: false, warning: "Email saved, but verification failed. Please check your password and try again." };
      }
      if (code === "auth/too-many-requests") {
        return { success: true, verificationSent: false, warning: "Email saved. Too many attempts for verification. Please try again later." };
      }
      // Email is still saved in Firestore for any other error
      return { success: true, verificationSent: false, warning: "Email saved in your profile." };
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
  },

  updateExpense: async (id, updates) => {
    const { uid } = useAuthStore.getState();
    if (!db || !uid) return;
    const docRef = doc(db, "users", uid, "expenses", id);
    await updateDoc(docRef, updates);
  },

  deleteExpense: async (id) => {
    const { uid } = useAuthStore.getState();
    if (!db || !uid) return;
    const docRef = doc(db, "users", uid, "expenses", id);
    await deleteDoc(docRef);
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
  },
}));
