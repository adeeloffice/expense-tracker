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
  query,
  where,
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
  forgotPassword: (username: string) => Promise<{ success: boolean; error?: string; email?: string }>;
  updateUserEmail: (newEmail: string) => Promise<{ success: boolean; error?: string }>;
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

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || "";
        const username = firebaseUser.displayName || email.split("@")[0];

        // Load recovery email from Firestore (separate from auth email)
        let recoveryEmail: string | null = null;
        if (db) {
          try {
            const usernameDoc = await getDoc(doc(db, "usernames", username));
            if (usernameDoc.exists()) {
              const data = usernameDoc.data();
              // Read from recoveryEmail field (new), fall back to email field (old)
              const stored = data.recoveryEmail || data.email;
              if (stored && !stored.endsWith("@et.app")) {
                recoveryEmail = stored;
              }
            }
          } catch { /* ignore */ }
        }

        set({
          currentUser: username,
          uid: firebaseUser.uid,
          userEmail: recoveryEmail,
          isAuthenticated: true,
          isInitializing: false,
          isLocked: false,
          needsEmailUpdate: !recoveryEmail,
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
      // Check if username is already taken
      const usernameDoc = await getDoc(doc(db, "usernames", normalized));
      if (usernameDoc.exists()) {
        return { success: false, error: "Username is already taken. Choose a different username." };
      }

      // Use real email if provided, otherwise fall back to @et.app
      const fbAuthEmail = trimmedEmail || usernameToEmail(normalized);

      // Try creating the Firebase Auth user FIRST
      // This handles the case where a user was deleted from Firebase Console
      // but the usernames doc still exists in Firestore
      const cred = await createUserWithEmailAndPassword(auth, fbAuthEmail, password);
      await updateProfile(cred.user, { displayName: normalized });

      // Create default settings in Firestore
      await setDoc(doc(db, "users", cred.user.uid, "settings", "config"), {
        currencyCode: "BHD",
        monthlyBudget: 0,
      });

      // Create/update username → UID mapping
      // authEmail = email used in Firebase Auth (for login)
      // recoveryEmail = email for password reset (optional, NEVER used for login)
      await setDoc(doc(db, "usernames", normalized), {
        uid: cred.user.uid,
        authEmail: fbAuthEmail,
        recoveryEmail: trimmedEmail || null,
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
      // Look up the username doc to check if user exists
      const usernameDoc = await getDoc(doc(db, "usernames", normalized));
      if (!usernameDoc.exists()) {
        return { success: false, error: "User not found. Please sign up first." };
      }

      // Use authEmail for login (the email used during Firebase Auth signup)
      // NEVER use recoveryEmail for login — it’s only for password reset
      const data = usernameDoc.data();
      let loginEmail = data.authEmail || usernameToEmail(normalized);

      // Auto-migrate old docs: if authEmail field doesn’t exist, set it now
      if (!data.authEmail) {
        const correctAuthEmail = usernameToEmail(normalized);
        updateDoc(doc(db, "usernames", normalized), { authEmail: correctAuthEmail }).catch(() => {});
        loginEmail = correctAuthEmail;
      }

      await signInWithEmailAndPassword(auth, loginEmail, password);
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      // Username exists (we checked above), so it must be wrong password
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        return { success: false, error: "Incorrect password" };
      }
      if (code === "auth/user-not-found") {
        // Orphaned Firestore doc — clean up
        await deleteDoc(doc(db, "usernames", normalized)).catch(() => {});
        return { success: false, error: "User not found. Please sign up first." };
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
      // Look up the user’s recovery email from Firestore
      const usernameDoc = await getDoc(doc(db, "usernames", normalized));
      if (!usernameDoc.exists()) {
        return { success: false, error: "Username not found" };
      }
      const data = usernameDoc.data();
      // Use recoveryEmail field (new), fall back to email field (old docs)
      const recoveryEmail = data.recoveryEmail || data.email;

      // Check if the user has a real recovery email
      if (!recoveryEmail || recoveryEmail.endsWith("@et.app")) {
        return {
          success: false,
          error: "This account was created without a recovery email. Please create a new account with your email to enable password reset.",
        };
      }

      // Send Firebase password reset email
      await sendPasswordResetEmail(auth, recoveryEmail, {
        url: "https://expense-tracker-five-alpha-69.vercel.app/",
      });
      return { success: true, email: recoveryEmail };
    } catch {
      return { success: false, error: "Failed to send reset email. Please try again." };
    }
  },

  updateUserEmail: async (newEmail) => {
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

    // Check if this email is already used by another account
    try {
      const q = query(
        collection(db, "usernames"),
        where("recoveryEmail", "==", trimmedEmail)
      );
      const snapshot = await getDocs(q);
      for (const d of snapshot.docs) {
        if (d.id !== currentUser) {
          return { success: false, error: "This email is already used by another account" };
        }
      }
      // Also check old field name for backward compat
      const q2 = query(
        collection(db, "usernames"),
        where("email", "==", trimmedEmail)
      );
      const snapshot2 = await getDocs(q2);
      for (const d of snapshot2.docs) {
        if (d.id !== currentUser) {
          // Only flag if this doc doesn't already have recoveryEmail set
          if (!d.data().recoveryEmail) {
            return { success: false, error: "This email is already used by another account" };
          }
        }
      }
    } catch {
      // If query fails (e.g., missing index), continue anyway
    }

    // Save recovery email to Firestore — ONLY update recoveryEmail field
    // NEVER touch authEmail — that’s used for login
    try {
      await updateDoc(doc(db, "usernames", currentUser), {
        recoveryEmail: trimmedEmail,
      });
    } catch {
      return { success: false, error: "Failed to save email. Please try again." };
    }

    // Update local state
    set({ userEmail: trimmedEmail, needsEmailUpdate: false });
    return { success: true };
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
