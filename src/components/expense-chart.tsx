"use client";

import { useMemo } from "react";
import { CATEGORY_COLORS, type Expense } from "@/lib/store";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

interface ExpenseChartProps {
  expenses: Expense[];
}

export function ExpenseChart({ expenses }: ExpenseChartProps) {
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2)),
        fill: CATEGORY_COLORS[name] || "hsl(215, 20%, 55%)",
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    categoryData.forEach((item) => {
      config[item.name] = {
        label: item.name,
        color: item.fill,
      };
    });
    return config;
  }, [categoryData]);

  if (expenses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Add some expenses to see the chart
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-72 w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={categoryData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          strokeWidth={2}
          stroke="var(--background)"
        >
          {categoryData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  );
}
