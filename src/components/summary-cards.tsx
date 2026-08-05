"use client";

import { useMemo } from "react";
import type { Expense } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  CalendarDays,
  Hash,
} from "lucide-react";

interface SummaryCardsProps {
  expenses: Expense[];
}

export function SummaryCards({ expenses }: SummaryCardsProps) {
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
    const daysInMonth = now.getDate(); // days elapsed so far
    const avgDaily = daysInMonth > 0 ? monthTotal / daysInMonth : 0;

    return {
      total,
      monthTotal,
      weekTotal,
      avgDaily,
      count: expenses.length,
      monthCount: monthExpenses.length,
    };
  }, [expenses]);

  const cards = [
    {
      title: "Total Spent",
      value: `$${stats.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      description: `${stats.count} expense${stats.count !== 1 ? "s" : ""} total`,
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
      title: "This Month",
      value: `$${stats.monthTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      description: `${stats.monthCount} expense${stats.monthCount !== 1 ? "s" : ""} this month`,
      icon: CalendarDays,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      title: "This Week",
      value: `$${stats.weekTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      description: "Last 7 days",
      icon: TrendingUp,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/50",
    },
    {
      title: "Daily Average",
      value: `$${stats.avgDaily.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      description: "Average per day this month",
      icon: Hash,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/50",
    },
  ];

  return (
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
  );
}
