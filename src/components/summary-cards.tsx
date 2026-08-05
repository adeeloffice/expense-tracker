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
  const monthlyBudget = useSettingsStore((s) => s.monthlyBudget);

  const isAllMonths = selectedMonth === "all";

  const stats = useMemo(() => {
    const monthTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Budget only applies when viewing a single month
    const budgetUsed = (!isAllMonths && monthlyBudget > 0) ? (monthTotal / monthlyBudget) * 100 : 0;
    const budgetRemaining = (!isAllMonths && monthlyBudget > 0) ? monthlyBudget - monthTotal : 0;
    const overBudget = (!isAllMonths && monthlyBudget > 0) && monthTotal > monthlyBudget;

    return {
      monthTotal,
      count: expenses.length,
      budgetUsed: Math.min(budgetUsed, 100),
      budgetRemaining,
      overBudget,
    };
  }, [expenses, monthlyBudget]);

  const fmt = (amount: number) => formatCurrency(amount, currencyCode);

  return (
    <div className="space-y-4">
      {/* Budget Progress Card */}
      <Card className={`border-2 ${stats.overBudget ? "border-red-300 dark:border-red-800" : "border-emerald-200 dark:border-emerald-900"} overflow-hidden`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`${stats.overBudget ? "bg-red-100 dark:bg-red-950/50" : "bg-emerald-100 dark:bg-emerald-950/50"} p-2 rounded-lg`}>
                {stats.overBudget ? (
                  <AlertTriangle className={`w-4 h-4 ${stats.overBudget ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`} />
                ) : (
                  <Target className={`w-4 h-4 ${stats.overBudget ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`} />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">Monthly Budget</p>
                <p className="text-xs text-muted-foreground">
                  {monthlyBudget > 0
                    ? `Limit: ${fmt(monthlyBudget)}`
                    : "No budget set — tap to set one"}
                </p>
              </div>
            </div>
            <div className="text-right">
              {monthlyBudget > 0 && (
                <>
                  <p className={`text-lg font-bold tabular-nums ${stats.overBudget ? "text-red-600 dark:text-red-400" : ""}`}>
                    {fmt(stats.monthTotal)}
                  </p>
                  <p className={`text-xs font-medium ${stats.overBudget ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {stats.overBudget
                      ? `Over by ${fmt(Math.abs(stats.budgetRemaining))}`
                      : `${fmt(stats.budgetRemaining)} remaining`}
                  </p>
                </>
              )}
            </div>
          </div>
          {monthlyBudget > 0 && (
            <div className="space-y-1.5">
              <Progress
                value={stats.overBudget ? 100 : stats.budgetUsed}
                className={`h-3 ${stats.overBudget ? "[&>div]:bg-red-500" : "[&>div]:bg-emerald-500"}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stats.budgetUsed.toFixed(1)}% used</span>
                <span>
                  {stats.overBudget
                    ? `Exceeded by ${((stats.monthTotal / monthlyBudget) * 100 - 100).toFixed(1)}%`
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
                : `Avg ${fmt(stats.count > 0 ? stats.monthTotal / stats.count : 0)} per expense`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
