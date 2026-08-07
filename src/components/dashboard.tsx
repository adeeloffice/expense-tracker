"use client";

import { useState, useMemo, useCallback } from "react";
import { useAuthStore, useExpenseStore, useSettingsStore, formatCurrency, getCurrency, type Expense } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  LogOut,
  Download,
  Moon,
  Sun,
  Wallet,
  BarChart3,
  List,
  User,
  Settings,
  Trash2,
  Cloud,
  Mail,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { useTheme } from "next-themes";
import { ExpenseForm } from "./expense-form";
import { ExpenseList } from "./expense-list";
import { ExpenseChart } from "./expense-chart";
import { SummaryCards } from "./summary-cards";
import { SettingsDialog } from "./settings-dialog";
import { DeleteAccountDialog } from "./delete-account-dialog";

// Helper to get month key "YYYY-MM"
function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Format month key to display label (safe - handles "all")
function formatMonthLabel(key: string): string {
  if (key === "all") return "All Months";
  const parts = key.split("-");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return key;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return key;
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Check if a string is a valid month key
function isValidMonthKey(key: string): boolean {
  if (key === "all") return true;
  const parts = key.split("-");
  if (parts.length !== 2) return false;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  return !isNaN(year) && !isNaN(month) && month >= 1 && month <= 12;
}

export function Dashboard() {
  const { theme, setTheme } = useTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const expenses = useExpenseStore((s) => s.expenses);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const currencyCode = useSettingsStore((s) => s.currencyCode);
  const currency = getCurrency(currencyCode);

  const [formOpen, setFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Month selector state
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthKey(new Date()));

  // Add/Update recovery email
  const userEmail = useAuthStore((s) => s.userEmail);
  const updateUserEmail = useAuthStore((s) => s.updateUserEmail);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [migrationEmail, setMigrationEmail] = useState("");
  const [migrationPassword, setMigrationPassword] = useState("");
  const [migrationError, setMigrationError] = useState("");
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const openEmailDialog = () => {
    setMigrationEmail(userEmail || "");
    setMigrationPassword("");
    setMigrationError("");
    setVerificationSent(false);
    setPendingEmail("");
    setEmailDialogOpen(true);
  };

  const handleSaveEmail = async () => {
    setMigrationError("");
    setVerificationSent(false);
    setMigrationLoading(true);
    try {
      if (!migrationEmail.trim().includes("@") || !migrationEmail.trim().includes(".")) {
        setMigrationError("Please enter a valid email address");
        return;
      }
      if (!migrationPassword) {
        setMigrationError("Please enter your password to confirm");
        return;
      }
      const result = await updateUserEmail(migrationEmail.trim(), migrationPassword);
      if (!result.success) {
        setMigrationError(result.error || "Failed to save email");
        return;
      }
      if (result.verificationSent) {
        setVerificationSent(true);
        setPendingEmail(migrationEmail.trim());
      } else {
        setEmailDialogOpen(false);
      }
    } finally {
      setMigrationLoading(false);
    }
  };

  const handleEdit = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deleteExpense(id);
    },
    [deleteExpense]
  );

  const exportCSV = useCallback(() => {
    if (expenses.length === 0) return;
    const headers = ["Title", `Amount (${currencyCode})`, "Category", "Date", "Note"];
    const rows = expenses.map((e) => [
      `"${e.title}"`,
      e.amount.toFixed(currency.decimals),
      `"${e.category}"`,
      e.date,
      e.note ? `"${e.note.replace(/"/g, '""')}"` : "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [expenses, currencyCode, currency.decimals]);

  // Build list of available months from ALL expenses
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    expenses.forEach((e) => {
      const d = new Date(e.date + "T00:00:00");
      monthSet.add(getMonthKey(d));
    });
    return Array.from(monthSet).sort().reverse();
  }, [expenses]);

  // Filter expenses for selected month ("all" shows everything)
  const monthExpenses = useMemo(() => {
    if (selectedMonth === "all") return expenses;
    return expenses.filter((e) => {
      const d = new Date(e.date + "T00:00:00");
      return getMonthKey(d) === selectedMonth;
    });
  }, [expenses, selectedMonth]);

  // Month navigation
  const goToPrevMonth = () => {
    if (selectedMonth === "all") {
      // Jump to the most recent month with expenses
      if (availableMonths.length > 0) {
        setSelectedMonth(availableMonths[0]);
      }
      return;
    }
    const [year, month] = selectedMonth.split("-").map(Number);
    const d = new Date(year, month - 2, 1);
    setSelectedMonth(getMonthKey(d));
  };

  const goToNextMonth = () => {
    if (selectedMonth === "all") return;
    const [year, month] = selectedMonth.split("-").map(Number);
    const d = new Date(year, month, 1);
    setSelectedMonth(getMonthKey(d));
  };

  const isCurrentMonth = selectedMonth === getMonthKey(new Date());
  const isAllMonths = selectedMonth === "all";

  // Monthly bar chart data — respects selected month filter
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const d = new Date(e.date + "T00:00:00");
      const key = getMonthKey(d);
      map[key] = (map[key] || 0) + e.amount;
    });
    const sorted = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    if (selectedMonth === "all") {
      // All months: show last 6
      return sorted.slice(-6);
    }
    // Specific month: find its index and show 5 months before + this month (6 total)
    const idx = sorted.findIndex(([key]) => key === selectedMonth);
    if (idx === -1) return sorted.slice(-6);
    const start = Math.max(0, idx - 5);
    return sorted.slice(start, idx + 1);
  }, [expenses, selectedMonth]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold leading-tight">Expense Tracker</h1>
              <p className="text-xs text-muted-foreground">
                Hi, <span className="capitalize">{currentUser}</span> &middot; {currency.symbol} {currency.code}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 cursor-pointer"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 cursor-pointer"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
                  <User className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium capitalize">{currentUser}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Cloud className="w-3 h-3" /> Cloud Synced
                  </p>
                  {userEmail && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                      <Mail className="w-3 h-3" /> {userEmail}
                    </p>
                  )}
                </div>
                <DropdownMenuItem onClick={exportCSV} className="cursor-pointer">
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </DropdownMenuItem>
                {userEmail && (
                <DropdownMenuItem onClick={openEmailDialog} className="cursor-pointer">
                  <Mail className="w-4 h-4 mr-2" /> Change Email
                </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteAccountOpen(true)}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Month Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 cursor-pointer"
              onClick={goToPrevMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2 min-w-[180px] justify-center">
              <CalendarDays className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold text-sm sm:text-base">{isAllMonths ? "All Months" : formatMonthLabel(selectedMonth)}</span>
              {!isAllMonths && isCurrentMonth && (
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                  Current
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 cursor-pointer"
              onClick={goToNextMonth}
              disabled={isAllMonths}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button
            onClick={() => {
              setEditingExpense(null);
              setFormOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Expense
          </Button>
        </div>

        {/* Summary Cards + Budget — filtered by selected month */}
        <SummaryCards expenses={monthExpenses} selectedMonth={selectedMonth} />

        {/* Tabs: List & Charts */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-xs">
            <TabsTrigger value="list" className="cursor-pointer">
              <List className="w-4 h-4 mr-1.5" /> List
            </TabsTrigger>
            <TabsTrigger value="charts" className="cursor-pointer">
              <BarChart3 className="w-4 h-4 mr-1.5" /> Charts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <ExpenseList
              expenses={expenses}
              onEdit={handleEdit}
              onDelete={handleDelete}
              initialMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    Spending by Category
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{isAllMonths ? "All time" : formatMonthLabel(selectedMonth)}</p>
                </CardHeader>
                <CardContent>
                  <ExpenseChart expenses={monthExpenses} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    Monthly Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MonthlyBarChart data={monthlyData} highlightMonth={selectedMonth} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t py-4 text-center text-xs text-muted-foreground">
        <p className="flex items-center justify-center gap-1">
          <Cloud className="w-3 h-3" /> Expense Tracker &middot; Data synced to cloud &middot; Works on all devices
        </p>
      </footer>

      {/* Dialogs */}
      <ExpenseForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingExpense(null);
        }}
        editingExpense={editingExpense}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} selectedMonth={selectedMonth} />
      <DeleteAccountDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen} />

      {/* Add/Update Recovery Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {verificationSent ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-emerald-500" /> Verification Email Sent
                </DialogTitle>
                <DialogDescription>
                  Check your inbox and click the verification link to confirm.
                </DialogDescription>
              </DialogHeader>
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-4">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  A verification link has been sent to:
                </p>
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-1">{pendingEmail}</p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mt-2">
                  Click the link in the email to complete the update.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => setEmailDialogOpen(false)} className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-emerald-500" /> Change Email
                </DialogTitle>
                <DialogDescription>
                  Change your email address. A verification link will be sent to the email address.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {userEmail && (
                  <div className="bg-muted/50 border rounded-md px-3 py-2">
                    <p className="text-xs text-muted-foreground">Current email</p>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{userEmail}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="migration-email">Email Address</Label>
                  <Input
                    id="migration-email"
                    type="email"
                    placeholder="your@email.com"
                    value={migrationEmail}
                    onChange={(e) => { setMigrationEmail(e.target.value); setMigrationError(""); }}
                    className="h-11"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="migration-password">Password</Label>
                  <Input
                    id="migration-password"
                    type="password"
                    placeholder="Enter your password"
                    value={migrationPassword}
                    onChange={(e) => { setMigrationPassword(e.target.value); setMigrationError(""); }}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">Required to verify your identity</p>
                </div>
                {migrationError && (
                  <p className="text-sm text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-md">{migrationError}</p>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setEmailDialogOpen(false)} className="cursor-pointer">
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEmail}
                  disabled={migrationLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                >
                  {migrationLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Save Email
                    </span>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Monthly Bar Chart (inline to keep it simple)
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";

function MonthlyBarChart({ data, highlightMonth }: { data: [string, number][]; highlightMonth?: string }) {
  const currencyCode = useSettingsStore((s) => s.currencyCode);
  const currency = getCurrency(currencyCode);

  const chartConfig: ChartConfig = {
    amount: {
      label: "Spending",
      color: "hsl(160, 60%, 45%)",
    },
  };

  const chartData = data.map(([month, amount]) => ({
    month: new Date(month + "-01").toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    }),
    amount: parseFloat(amount.toFixed(currency.decimals)),
    isHighlighted: month === highlightMonth,
    rawMonth: month,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Add some expenses to see the monthly chart
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-72 w-full">
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${currency.symbol}${v}`}
          width={55}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.isHighlighted ? "hsl(160, 60%, 45%)" : "hsl(160, 30%, 70%)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
