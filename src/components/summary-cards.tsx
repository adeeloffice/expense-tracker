"use client";

import { useMemo } from "react";
import { useSettingsStore, formatCurrency, type Expense } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  TrendingUp,
  CalendarDays,
  Hash,
  Target,
  AlertTriangle,
} from "lucide-react";

interface SummaryCardsProps {
  expenses: Expense[];
}

export function SummaryCards({ expenses }: SummaryCardsProps) {
  const currencyCode = useSettingsStore((s) => s.currencyCode);
  const monthlyBudget = useSettingsStore((s) => s.monthlyBudget);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const monthExpenses = expenses.filter((e) => {
      const d = new Date(e.date + "T00:00:00");
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    // Weekly: last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekExpenses = expenses.filter((e) => {
      const d = new Date(e.date + "T00:00:00");
      return d >= weekAgo;
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const weekTotal = weekExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Average daily for this month
    const daysInMonth = now.getDate();
    const avgDaily = daysInMonth > 0 ? monthTotal / daysInMonth : 0;

    // Budget calculations
    const budgetUsed = monthlyBudget > 0 ? (monthTotal / monthlyBudget) * 100 : 0;
    const budgetRemaining = monthlyBudget > 0 ? monthlyBudget - monthTotal : 0;
    const overBudget = monthlyBudget > 0 && monthTotal > monthlyBudget;

    return {
      total,
      monthTotal,
      weekTotal,
      avgDaily,
      count: expenses.length,
      monthCount: monthExpenses.length,
      budgetUsed: Math.min(budgetUsed, 100),
      budgetRemaining,
      overBudget,
    };
  }, [expenses, monthlyBudget]);

  const fmt = (amount: number) => formatCurrency(amount, currencyCode);

  const cards = [
    {
      title: "Total Spent",
      value: fmt(stats.total),
      description: `${stats.count} expense${stats.count !== 1 ? "s" : ""} total`,
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
      title: "This Month",
      value: fmt(stats.monthTotal),
      description: `${stats.monthCount} expense${stats.monthCount !== 1 ? "s" : ""} this month`,
      icon: CalendarDays,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      title: "This Week",
      value: fmt(stats.weekTotal),
      description: "Last 7 days",
      icon: TrendingUp,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/50",
    },
    {
      title: "Daily Average",
      value: fmt(stats.avgDaily),
      description: "Average per day this month",
      icon: Hash,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/50",
    },
  ];

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <Card key={card.title} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {card.title}
                </p>
                <div className={`${card.bg} p-2 rounded-lg`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold tabular-nums">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
