"use client";

import { useSettingsStore, CURRENCIES, getCurrency, formatCurrency } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Coins, Target } from "lucide-react";
import { useState } from "react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const currencyCode = useSettingsStore((s) => s.currencyCode);
  const monthlyBudget = useSettingsStore((s) => s.monthlyBudget);
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const setMonthlyBudget = useSettingsStore((s) => s.setMonthlyBudget);

  // Use local state initialized from store values when dialog opens
  // We use a key pattern: reset state when dialog opens via the key trick
  const [budgetInput, setBudgetInput] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState(currencyCode);
  const [initialized, setInitialized] = useState(false);

  // Initialize on first open
  if (open && !initialized) {
    setInitialized(true);
    setBudgetInput(monthlyBudget > 0 ? monthlyBudget.toString() : "");
    setSelectedCurrency(currencyCode);
  }
  if (!open && initialized) {
    setInitialized(false);
  }

  const currency = getCurrency(selectedCurrency);

  const handleSave = () => {
    setCurrency(selectedCurrency);
    const budget = parseFloat(budgetInput);
    setMonthlyBudget(isNaN(budget) || budget <= 0 ? 0 : parseFloat(budget.toFixed(currency.decimals)));
    setInitialized(false);
    onOpenChange(false);
  };

  const handleClearBudget = () => {
    setBudgetInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" /> Settings
          </DialogTitle>
          <DialogDescription>
            Customize your currency and set a monthly budget limit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Currency Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <Label className="font-semibold">Currency</Label>
            </div>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold w-10">{c.code}</span>
                      <span className="text-muted-foreground">{c.name}</span>
                      <span className="text-muted-foreground">({c.symbol})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All amounts will be displayed in {currency.name} ({currency.symbol}).
              {currency.decimals === 3 && " This currency uses 3 decimal places."}
            </p>
          </div>

          {/* Budget Limit */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              <Label className="font-semibold">Monthly Budget Limit</Label>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                  {currency.symbol}
                </span>
                <Input
                  type="number"
                  step={currency.decimals === 0 ? "1" : currency.decimals === 3 ? "0.001" : "0.01"}
                  min="0"
                  placeholder={currency.decimals === 0 ? "0" : currency.decimals === 3 ? "0.000" : "0.00"}
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
              {budgetInput && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-3 cursor-pointer"
                  onClick={handleClearBudget}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {budgetInput && parseFloat(budgetInput) > 0
                ? `Budget set to ${formatCurrency(parseFloat(budgetInput), selectedCurrency)}/month`
                : "Leave empty for no budget limit"}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setInitialized(false);
              onOpenChange(false);
            }}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
          >
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
