"use client";

import { useState, useMemo, useCallback } from "react";
import { useAuthStore, useExpenseStore, useSettingsStore, formatCurrency, getCurrency, type Expense } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Lock,
  LogOut,
  Download,
  Moon,
  Sun,
  Wallet,
  BarChart3,
  List,
  User,
  Settings,
} from "lucide-react";
import { useTheme } from "next-themes";
import { ExpenseForm } from "./expense-form";
import { ExpenseList } from "./expense-list";
import { ExpenseChart } from "./expense-chart";
import { SummaryCards } from "./summary-cards";
import { SettingsDialog } from "./settings-dialog";

export function Dashboard() {
  const { theme, setTheme } = useTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const lock = useAuthStore((s) => s.lock);
  const logout = useAuthStore((s) => s.logout);
  const expenses = useExpenseStore((s) => s.expenses);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const currencyCode = useSettingsStore((s) => s.currencyCode);
  const currency = getCurrency(currencyCode);

  const [formOpen, setFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

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

  // Monthly bar chart data
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const d = new Date(e.date + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + e.amount;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6);
  }, [expenses]);

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
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium capitalize">{currentUser}</p>
                  <p className="text-xs text-muted-foreground">Personal Account</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={lock} className="cursor-pointer">
                  <Lock className="w-4 h-4 mr-2" /> Lock
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportCSV} className="cursor-pointer">
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
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
        {/* Summary Cards + Budget */}
        <SummaryCards expenses={expenses} />

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h2 className="text-lg font-semibold">Expenses</h2>
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
            />
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    Spending by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ExpenseChart expenses={expenses} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    Monthly Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MonthlyBarChart data={monthlyData} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t py-4 text-center text-xs text-muted-foreground">
        <p>Expense Tracker &middot; Your data is stored locally on this device</p>
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
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

function MonthlyBarChart({ data }: { data: [string, number][] }) {
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
        <Bar dataKey="amount" fill="var(--color-amount)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
