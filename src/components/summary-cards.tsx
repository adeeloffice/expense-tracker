"use client";

import { useMemo } from "react";
import { useSettingsStore, formatCurrency, type Expense } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  Target,
  AlertTriangle,
  Receipt,
} from "lucide-react";

interface SummaryCardsProps {
  expenses: Expense[];
  selectedMonth?: string;
}

export function SummaryCards({ expenses, selectedMonth }: SummaryCardsProps) {
  const currencyCode = useSettingsStore((s) => s.currencyCode);
  // Use monthlyBudgets as a reactive selector so the component re-renders on budget changes
  const monthlyBudgets = useSettingsStore((s) => s.monthlyBudgets);

  const isAllMonths = selectedMonth === "all";

  // Compute budget reactively from the monthlyBudgets map
  const budget = useMemo(() => {
    if (isAllMonths) {
      // Sum all month budgets for "All Months" view
      return Object.values(monthlyBudgets).reduce((sum, v) => sum + v, 0);
    }
    if (!selectedMonth) return 0;
    return monthlyBudgets[selectedMonth] || 0;
  }, [monthlyBudgets, isAllMonths, selectedMonth]);

  const stats = useMemo(() => {
    const monthTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

    const budgetUsed = budget > 0 ? (monthTotal / budget) * 100 : 0;
    const budgetRemaining = budget > 0 ? budget - monthTotal : 0;
    const overBudget = budget > 0 && monthTotal > budget;

    return {
      monthTotal,
      count: expenses.length,
      budgetUsed: Math.min(budgetUsed, 100),
      budgetRemaining,
      overBudget,
    };
  }, [expenses, budget]);

  const fmt = (amount: number) => formatCurrency(amount, currencyCode);

  const budgetLabel = isAllMonths ? "Total Budget (All Months)" : "Monthly Budget";
  const noBudgetText = isAllMonths
    ? "No budgets set — tap Settings to set budgets per month"
    : "No budget set — tap Settings to set one";

  return (
    <div className="space-y-4">
      {/* Budget Progress Card */}
      <Card className={`border-2 ${stats.overBudget ? "border-red-300 dark:border-red-800" : budget > 0 ? "border-emerald-200 dark:border-emerald-900" : "border-dashed"} overflow-hidden`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={"p-2 rounded-lg " + (stats.overBudget ? "bg-red-100 dark:bg-red-950/50" : "bg-emerald-100 dark:bg-emerald-950/50")}>
                {stats.overBudget ? (
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                ) : (
                  <Target className={`w-4 h-4 ${budget > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{budgetLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {budget > 0
                    ? `Limit: ${fmt(budget)}`
                    : noBudgetText}
                </p>
              </div>
            </div>
            {budget > 0 && (
              <div className="text-right">
                <p className={`text-lg font-bold tabular-nums ${stats.overBudget ? "text-red-600 dark:text-red-400" : ""}`}>
                  {fmt(stats.monthTotal)}
                </p>
                <p className={`text-xs font-medium ${stats.overBudget ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {stats.overBudget
                    ? `Over by ${fmt(Math.abs(stats.budgetRemaining))}`
                    : `${fmt(stats.budgetRemaining)} remaining`}
                </p>
              </div>
            )}
          </div>
          {budget > 0 && (
            <div className="space-y-1.5">
              <Progress
                value={stats.overBudget ? 100 : stats.budgetUsed}
                className={`h-3 ${stats.overBudget ? "[&>div]:bg-red-500" : "[&>div]:bg-emerald-500"}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stats.budgetUsed.toFixed(1)}% used</span>
                <span>
                  {stats.overBudget
                    ? `Exceeded by ${((stats.monthTotal / budget) * 100 - 100).toFixed(1)}%`
                    : `${(100 - stats.budgetUsed).toFixed(1)}% left`}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Spent
              </p>
              <div className="bg-emerald-50 dark:bg-emerald-950/50 p-2 rounded-lg">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold tabular-nums">{fmt(stats.monthTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isAllMonths
                ? `${stats.count} expense${stats.count !== 1 ? "s" : ""} total`
                : `${stats.count} expense${stats.count !== 1 ? "s" : ""} this month`}
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Transactions
              </p>
              <div className="bg-blue-50 dark:bg-blue-950/50 p-2 rounded-lg">
                <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold tabular-nums">{stats.count}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.count === 0
                ? "No expenses yet"
                : `${stats.count} transaction${stats.count !== 1 ? "s" : ""} recorded`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
