"use client";

import { useState, useEffect, useMemo } from "react";
import { useSettingsStore, useAuthStore, CURRENCIES, getCurrency, formatCurrency } from "@/lib/store";
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
import { Settings, Coins, Target, Mail, CheckCircle2, ShieldOff, Info, Bell, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMonth?: string;
}

function formatMonthLabel(key: string): string {
  const parts = key.split("-");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return key;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return key;
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function SettingsDialog({ open, onOpenChange, selectedMonth }: SettingsDialogProps) {
  const currencyCode = useSettingsStore((s) => s.currencyCode);
  const monthlyBudgets = useSettingsStore((s) => s.monthlyBudgets);
  const budgetNotifications = useSettingsStore((s) => s.budgetNotifications);
  const saveSettings = useSettingsStore((s) => s.saveSettings);
  const saveBudgetForMonth = useSettingsStore((s) => s.saveBudgetForMonth);
  const saveBudgetNotifications = useSettingsStore((s) => s.saveBudgetNotifications);
  const userEmail = useAuthStore((s) => s.userEmail);

  const [budgetInput, setBudgetInput] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState(currencyCode);
  const [initialized, setInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission | "unsupported">("default");

  const isAllMonths = selectedMonth === "all";
  const monthLabel = !isAllMonths && selectedMonth ? formatMonthLabel(selectedMonth) : "";

  // Reactively get budget for the selected month
  const currentMonthBudget = useMemo(() => {
    if (isAllMonths || !selectedMonth) return 0;
    return monthlyBudgets[selectedMonth] || 0;
  }, [monthlyBudgets, isAllMonths, selectedMonth]);

  // Total budget across all months
  const totalBudget = useMemo(() => {
    return Object.values(monthlyBudgets).reduce((sum, v) => sum + v, 0);
  }, [monthlyBudgets]);

  const budgetCount = Object.keys(monthlyBudgets).length;

  // Sync budget input when month changes or dialog opens
  useEffect(() => {
    if (open) {
      setBudgetInput(currentMonthBudget > 0 ? currentMonthBudget.toString() : "");
      setSelectedCurrency(currencyCode);
    }
  }, [open, currentMonthBudget, currencyCode]);

  // Track initialization + check browser notification permission
  useEffect(() => {
    if (open) {
      setInitialized(true);
      if (typeof window !== "undefined" && "Notification" in window) {
        setBrowserPerm(Notification.permission);
      } else {
        setBrowserPerm("unsupported");
      }
    } else {
      setInitialized(false);
    }
  }, [open]);

  const currency = getCurrency(selectedCurrency);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings(selectedCurrency);

      // Save budget for the specific month
      if (!isAllMonths && selectedMonth) {
        const budget = parseFloat(budgetInput);
        const finalBudget = isNaN(budget) || budget <= 0 ? 0 : parseFloat(budget.toFixed(currency.decimals));
        await saveBudgetForMonth(selectedMonth, finalBudget);
      }

      setInitialized(false);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearBudget = () => {
    setBudgetInput("");
  };

  const handleToggleNotifications = async (checked: boolean) => {
    setNotifSaving(true);
    try {
      await saveBudgetNotifications(checked);
      // Refresh browser permission status after potential requestPermission call
      if (typeof window !== "undefined" && "Notification" in window) {
        setBrowserPerm(Notification.permission);
      }
    } finally {
      setNotifSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" /> Settings
          </DialogTitle>
          <DialogDescription>
            Manage your currency, budget, and account settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recovery Email Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-500" />
              <Label className="font-semibold">Recovery Email</Label>
            </div>
            {userEmail ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{userEmail}</p>
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mt-0.5">
                      Password reset is enabled for this email
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <ShieldOff className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">No recovery email set</p>
                    <p className="text-xs text-amber-600/70 dark:text-amber-500/70 mt-0.5">
                      Add a recovery email from the user menu to enable password reset
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

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

          {/* Budget Notifications Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {budgetNotifications ? (
                  <Bell className="w-4 h-4 text-emerald-500" />
                ) : (
                  <BellOff className="w-4 h-4 text-muted-foreground" />
                )}
                <Label className="font-semibold">Budget Alerts</Label>
              </div>
              <Switch
                checked={budgetNotifications}
                onCheckedChange={handleToggleNotifications}
                disabled={notifSaving}
                className="cursor-pointer"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {budgetNotifications
                ? "You will be alerted at 85%, 100%, and when exceeding your monthly budget."
                : "Enable to receive alerts when spending reaches 85%, 100%, or exceeds your budget."}
            </p>
            {budgetNotifications && browserPerm === "denied" && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Browser notifications are blocked. You will see in-app alerts only. To enable browser notifications, reset the permission in your browser settings for this site.
                </p>
              </div>
            )}
            {budgetNotifications && browserPerm === "granted" && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Browser notifications enabled. Alerts will appear even when the app is in the background.
                </p>
              </div>
            )}
          </div>

          {/* Budget Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              <Label className="font-semibold">
                {isAllMonths ? "Budget Overview" : `Budget for ${monthLabel}`}
              </Label>
            </div>
            {isAllMonths ? (
              <div className="bg-muted/50 border rounded-lg px-4 py-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      {budgetCount > 0
                        ? `${budgetCount} month${budgetCount !== 1 ? "s" : ""} with budgets set
                                                       Total: ${formatCurrency(totalBudget, selectedCurrency)}`
                        : "No budgets set for any month"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select a specific month to set or change its budget.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
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
                    ? `Budget set to ${formatCurrency(parseFloat(budgetInput), selectedCurrency)} for ${monthLabel}`
                    : `No budget set for ${monthLabel}`}
                </p>
              </>
            )}
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
            disabled={isSaving}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Settings"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
