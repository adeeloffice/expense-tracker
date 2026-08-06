"use client";

import { create } from "zustand";
import { toast } from "sonner";
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
  firebaseUpdateEmail,
  firebaseVerifyBeforeUpdateEmail,
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
  firebaseDeleteField,
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
  updateUserEmail: (newEmail: string, password: string) => Promise<{ success: boolean; error?: string; verificationSent?: boolean }>;
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
        let storedAuthEmail: string | null = null;
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
              storedAuthEmail = data.authEmail || null;

              // Sync authEmail in Firestore if Firebase Auth email changed
              // (happens after user clicks verifyBeforeUpdateEmail link)
              if (email && email !== storedAuthEmail && !email.endsWith("@et.app")) {
                updateDoc(doc(db, "usernames", username), { authEmail: email }).catch(() => {});
              }
            }
          } catch { /* Firestore read failed, use fallback below */ }
        }

        // Fallback: if Firestore didn't have a recovery email, use the Firebase Auth email
        // (when user signed up with a real email, it's stored in both places)
        if (!recoveryEmail && email && !email.endsWith("@et.app")) {
          recoveryEmail = email;
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
      // Double-check username wasn't taken while we were creating the auth user
      const recheck = await getDoc(doc(db, "usernames", normalized));
      if (recheck.exists()) {
        // Username was taken — clean up the Firebase user we just created
        await cred.user.delete().catch(() => {});
        return { success: false, error: "Username is already taken. Choose a different username." };
      }
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

      const data = usernameDoc.data();
      const fallbackEmail = usernameToEmail(normalized);
      const loginEmail = data.authEmail || fallbackEmail;

      // Auto-migrate old docs: if authEmail field doesn't exist, set it now
      if (!data.authEmail) {
        updateDoc(doc(db, "usernames", normalized), { authEmail: fallbackEmail }).catch(() => {});
      }

      // If authEmail is not the @et.app email, try it first.
      // If it fails, fall back to @et.app (Firebase Auth might still have the old email
      // if the user hasn't clicked the verification link yet).
      // NOTE: Firebase email enumeration protection returns auth/invalid-credential
      // for BOTH "wrong password" and "user not found", so we must try both.
      if (loginEmail !== fallbackEmail) {
        try {
          await signInWithEmailAndPassword(auth, loginEmail, password);
          return { success: true };
        } catch {
          // authEmail did not work - fall through to try @et.app email
        }
      }

      // Try @et.app email (original signup email or fallback)
      try {
        await signInWithEmailAndPassword(auth, fallbackEmail, password);
        // If authEmail in Firestore was different, sync it to the working email
        if (loginEmail !== fallbackEmail) {
          updateDoc(doc(db, "usernames", normalized), { authEmail: fallbackEmail }).catch(() => {});
        }
        return { success: true };
      } catch (err2: unknown) {
        const code = (err2 as { code?: string })?.code || "";
        if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
          return { success: false, error: "Incorrect password" };
        }
        return { success: false, error: "Login failed. Please try again." };
      }
    } catch {
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
    if (!password || password.length < 6) {
      return { success: false, error: "Please enter your password to confirm" };
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
    } catch (err) {
      // If query fails, try fallback: fetch all docs and check manually
      try {
        const allDocs = await getDocs(collection(db, "usernames"));
        for (const d of allDocs.docs) {
          if (d.id === currentUser) continue;
          const data = d.data();
          const em = data.recoveryEmail || data.email;
          if (em && em.toLowerCase() === trimmedEmail) {
            return { success: false, error: "This email is already used by another account" };
          }
        }
      } catch {
        // If even the fallback fails, allow the save (security rules may block reads)
      }
    }

    // Step 1: Re-authenticate, then send verification email to the new address
    try {
      // Capture the current user reference before re-auth (it may change after re-auth)
      const userBefore = auth.currentUser!;
      const currentAuthEmail = userBefore.email!;
      const credential = EmailAuthProvider.credential(currentAuthEmail, password);
      const result = await reauthenticateWithCredential(userBefore, credential);
      // Use the refreshed user reference from re-auth result
      const refreshedUser = result.user;
      if (refreshedUser.email !== trimmedEmail) {
        // Firebase project requires email verification before changing — use verifyBeforeUpdateEmail
        // This sends a verification link to the new email; the email changes only after the user clicks it
        await firebaseVerifyBeforeUpdateEmail(refreshedUser, trimmedEmail);
      }
    } catch (authErr: unknown) {
      const code = (authErr as { code?: string })?.code || "";
      const message = (authErr as { message?: string })?.message || "";
      console.error("Firebase Auth email verification failed:", code, message);
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        return { success: false, error: "Incorrect password. Please try again." };
      }
      if (code === "auth/email-already-in-use") {
        return { success: false, error: "This email is already used by another Firebase account" };
      }
      if (code === "auth/too-many-requests") {
        return { success: false, error: "Too many attempts. Please wait a moment and try again." };
      }
      if (code === "auth/invalid-email") {
        return { success: false, error: "Invalid email format. Please check and try again." };
      }
      return { success: false, error: `Failed to send verification: ${message || "Unknown error"}` };
    }

    // Step 2: Save recovery email to Firestore immediately (so UI shows it)
    try {
      await updateDoc(doc(db, "usernames", currentUser), {
        recoveryEmail: trimmedEmail,
        email: trimmedEmail,
        authEmail: trimmedEmail,
      });
    } catch {
      // Firestore update failed but verification email was sent — acceptable
    }

    // Update local state
    set({ userEmail: trimmedEmail, needsEmailUpdate: false });
    return { success: true, verificationSent: true };
  },
}));

// Helper: calculate total spending for a month and trigger budget alert if needed
function _checkBudgetAlert(monthKey: string) {
  // Use setTimeout so onSnapshot has time to update the expenses array first
  setTimeout(() => {
    const expenses = useExpenseStore.getState().expenses;
    const totalSpent = expenses
      .filter((e) => e.date && e.date.slice(0, 7) === monthKey)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    useSettingsStore.getState().triggerBudgetAlert(monthKey, totalSpent);
  }, 1500);
}

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
    // Check budget alert after adding
    const monthKey = expense.date.slice(0, 7);
    _checkBudgetAlert(monthKey);
  },

  updateExpense: async (id, updates) => {
    const { uid } = useAuthStore.getState();
    if (!db || !uid) return;
    const docRef = doc(db, "users", uid, "expenses", id);
    await updateDoc(docRef, updates);
    // Check budget alert after updating (use updated date if provided)
    const dateStr = updates.date;
    if (dateStr) {
      const monthKey = dateStr.slice(0, 7);
      _checkBudgetAlert(monthKey);
    }
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

// Track which alerts have already fired this session to prevent repeats
const _firedAlerts: Set<string> = new Set();

interface SettingsState {
  currencyCode: string;
  monthlyBudget: number; // legacy single budget (kept for migration)
  monthlyBudgets: Record<string, number>; // per-month budgets: "YYYY-MM" -> amount
  budgetNotifications: boolean; // user preference for budget alerts
  isLoading: boolean;
  _unsubscribe: Unsubscribe | null;

  subscribeToSettings: (uid: string) => void;
  unsubscribeFromSettings: () => void;
  saveSettings: (currencyCode: string) => Promise<void>;
  saveBudgetForMonth: (monthKey: string, amount: number) => Promise<void>;
  getBudgetForMonth: (monthKey: string) => number;
  saveBudgetNotifications: (enabled: boolean) => Promise<void>;
  triggerBudgetAlert: (monthKey: string, totalSpent: number) => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  currencyCode: "BHD",
  monthlyBudget: 0,
  monthlyBudgets: {},
  budgetNotifications: false,
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
          const budgets = data.monthlyBudgets || {};
          const legacyBudget = data.monthlyBudget || 0;

          // Migrate old single monthlyBudget to current month if no per-month budgets exist
          if (legacyBudget > 0 && Object.keys(budgets).length === 0) {
            const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
            budgets[currentMonth] = legacyBudget;
            // Write migrated data back to Firestore
            setDoc(docRef, { monthlyBudgets: budgets, monthlyBudget: 0 }, { merge: true }).catch(() => {});
          }

          set({
            currencyCode: data.currencyCode || "BHD",
            monthlyBudget: legacyBudget,
            monthlyBudgets: budgets,
            budgetNotifications: data.budgetNotifications === true,
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

  saveSettings: async (currencyCode) => {
    const { uid } = useAuthStore.getState();
    if (!db || !uid) return;
    const docRef = doc(db, "users", uid, "settings", "config");
    await setDoc(docRef, { currencyCode }, { merge: true });
  },

  saveBudgetForMonth: async (monthKey, amount) => {
    const { uid } = useAuthStore.getState();
    if (!db || !uid) return;
    const docRef = doc(db, "users", uid, "settings", "config");

    // Optimistic update — update the store immediately so UI reflects instantly
    const currentBudgets = get().monthlyBudgets;
    const optimistic = { ...currentBudgets };
    if (amount > 0) {
      optimistic[monthKey] = amount;
    } else {
      delete optimistic[monthKey];
    }
    set({ monthlyBudgets: optimistic });

    // Persist to Firestore using dot notation (only updates the specific month key)
    try {
      if (amount > 0) {
        await updateDoc(docRef, { ["monthlyBudgets." + monthKey]: amount });
      } else {
        await updateDoc(docRef, { ["monthlyBudgets." + monthKey]: firebaseDeleteField() });
      }
    } catch {
      // onSnapshot will correct the store if the write fails
    }
  },

  getBudgetForMonth: (monthKey) => {
    const { monthlyBudgets } = get();
    return monthlyBudgets[monthKey] || 0;
  },

  saveBudgetNotifications: async (enabled) => {
    const { uid } = useAuthStore.getState();
    if (!db || !uid) return;
    const docRef = doc(db, "users", uid, "settings", "config");
    set({ budgetNotifications: enabled });
    try {
      await updateDoc(docRef, { budgetNotifications: enabled });
    } catch {
      // onSnapshot will correct the store if the write fails
    }
    // If user just enabled, request browser notification permission
    if (enabled && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    }
  },

  triggerBudgetAlert: (monthKey, totalSpent) => {
    const { budgetNotifications, monthlyBudgets } = get();
    if (!budgetNotifications) return;
    const budget = monthlyBudgets[monthKey];
    if (!budget || budget <= 0) return;

    const percent = (totalSpent / budget) * 100;
    const currencyCode = get().currencyCode;
    const currency = getCurrency(currencyCode);
    const monthLabel = new Date(monthKey + "-01").toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // 85% alert — green/success
    if (percent >= 85 && percent < 100 && !_firedAlerts.has(monthKey + "-85")) {
      _firedAlerts.add(monthKey + "-85");
      const msg = `Budget Alert: You have spent ${percent.toFixed(0)}% (${currency.symbol} ${totalSpent.toFixed(currency.decimals)}) of your ${monthLabel} budget (${currency.symbol} ${budget.toFixed(currency.decimals)}).`;
      toast.success(msg, { duration: 6000 });
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try { new Notification("Budget Alert - 85%", { body: msg, icon: "/logo.svg" }); } catch { /* */ }
      }
      _sendBudgetAlertEmail(monthKey, `Budget Alert - ${percent.toFixed(0)}% Spent`, msg, "warning");
    }

    // 100% alert — red/error
    if (percent >= 100 && percent < 101 && !_firedAlerts.has(monthKey + "-100")) {
      _firedAlerts.add(monthKey + "-100");
      const msg = `Budget Reached: You have spent 100% of your ${monthLabel} budget (${currency.symbol} ${budget.toFixed(currency.decimals)}). Any further spending exceeds your limit!`;
      toast.error(msg, { duration: 8000 });
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try { new Notification("Budget Reached - 100%", { body: msg, icon: "/logo.svg" }); } catch { /* */ }
      }
      _sendBudgetAlertEmail(monthKey, `Budget Reached - 100%`, msg, "danger");
    }

    // Exceeds 100% alert — red/error
    if (percent > 101 && !_firedAlerts.has(monthKey + "-over")) {
      _firedAlerts.add(monthKey + "-over");
      const overAmount = totalSpent - budget;
      const msg = `Budget Exceeded: You are ${currency.symbol} ${overAmount.toFixed(currency.decimals)} over your ${monthLabel} budget! Total spent: ${currency.symbol} ${totalSpent.toFixed(currency.decimals)} out of ${currency.symbol} ${budget.toFixed(currency.decimals)}.`;
      toast.error(msg, { duration: 8000 });
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try { new Notification("Budget Exceeded", { body: msg, icon: "/logo.svg" }); } catch { /* */ }
      }
      _sendBudgetAlertEmail(monthKey, `Budget Exceeded - ${monthLabel}`, msg, "danger");
    }
  },
}));

// Send budget alert email via API route (fire-and-forget, non-blocking)
async function _sendBudgetAlertEmail(monthKey: string, subject: string, message: string, level: string) {
  try {
    const email = useAuthStore.getState().userEmail;
    if (!email || typeof window === "undefined") return;
    await fetch("/api/budget-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email, subject, message, level }),
    });
  } catch {
    // Email send failed silently — in-app alert still worked
  }
}
