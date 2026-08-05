"use client";

import { useState, useCallback } from "react";
import { useExpenseStore, useSettingsStore, useAuthStore, getCurrency, CATEGORIES, type Expense } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil } from "lucide-react";

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingExpense?: Expense | null;
}

export function ExpenseForm({ open, onOpenChange, editingExpense }: ExpenseFormProps) {
  const addExpense = useExpenseStore((s) => s.addExpense);
  const updateExpense = useExpenseStore((s) => s.updateExpense);
  const currentUser = useAuthStore((s) => s.currentUser);
  const currencyCode = useSettingsStore((s) => s.currencyCode);
  const currency = getCurrency(currencyCode);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  // Sync from props when dialog opens (avoid useEffect pattern)
  if (open && !initialized) {
    setInitialized(true);
    if (editingExpense) {
      setTitle(editingExpense.title);
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setDate(editingExpense.date);
      setNote(editingExpense.note);
    } else {
      setTitle("");
      setAmount("");
      setCategory("");
      setDate(new Date().toISOString().split("T")[0]);
      setNote("");
    }
    setErrors({});
  }
  if (!open && initialized) {
    setInitialized(false);
  }

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = "Enter a valid amount";
    if (!category) newErrors.category = "Select a category";
    if (!date) newErrors.date = "Date is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const expenseData = {
      username: currentUser || "",
      title: title.trim(),
      amount: parseFloat(parseFloat(amount).toFixed(currency.decimals)),
      category,
      date,
      note: note.trim(),
    };

    if (editingExpense) {
      updateExpense(editingExpense.id, currentUser || "", expenseData);
    } else {
      addExpense(expenseData);
    }

    setInitialized(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingExpense ? (
              <><Pencil className="w-5 h-5" /> Edit Expense</>
            ) : (
              <><Plus className="w-5 h-5" /> Add Expense</>
            )}
          </DialogTitle>
          <DialogDescription>
            {editingExpense
              ? "Update your expense details below"
              : "Fill in the details to add a new expense"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Lunch at cafe"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({currency.symbol})</Label>
              <Input
                id="amount"
                type="number"
                step={currency.decimals === 0 ? "1" : currency.decimals === 3 ? "0.001" : "0.01"}
                min="0"
                placeholder={currency.decimals === 0 ? "0" : currency.decimals === 3 ? "0.000" : "0.00"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11"
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11"
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Any additional notes..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="resize-none"
            />
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
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
            >
              {editingExpense ? "Update" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}