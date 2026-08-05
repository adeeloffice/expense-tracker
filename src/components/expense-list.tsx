"use client";

import { useState, useMemo, useEffect } from "react";
import { useExpenseStore, useSettingsStore, formatCurrency, CATEGORIES, CATEGORY_COLORS, type Expense } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Pencil, Trash2, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  initialMonth?: string;
  onMonthChange?: (month: string) => void;
}

const ITEMS_PER_PAGE = 8;

export function ExpenseList({ expenses, onEdit, onDelete, initialMonth, onMonthChange }: ExpenseListProps) {
  const currencyCode = useSettingsStore((s) => s.currencyCode);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSort, setFilterSort] = useState<string>("date-desc");
  const [filterMonth, setFilterMonth] = useState<string>(initialMonth || "all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [mobileDetail, setMobileDetail] = useState<Expense | null>(null);

  // Sync with dashboard month selector
  useEffect(() => {
    if (initialMonth) {
      setFilterMonth(initialMonth);
      setPage(1);
    }
  }, [initialMonth]);

  const fmt = (amount: number) => formatCurrency(amount, currencyCode);

  // Build list of available months from expenses
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    expenses.forEach((e) => {
      const d = new Date(e.date + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthSet.add(key);
    });
    return Array.from(monthSet).sort().reverse();
  }, [expenses]);

  const formatMonthLabel = (key: string) => {
    const [year, month] = key.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Filter and sort
  const filtered = expenses
    .filter((e) => {
      const matchSearch =
        !search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.note.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        filterCategory === "all" || e.category === filterCategory;
      const matchMonth =
        filterMonth === "all" || (() => {
          const d = new Date(e.date + "T00:00:00");
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          return key === filterMonth;
        })();
      return matchSearch && matchCategory && matchMonth;
    })
    .sort((a, b) => {
      switch (filterSort) {
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "amount-asc":
          return a.amount - b.amount;
        case "amount-desc":
          return b.amount - a.amount;
        default:
          return 0;
      }
    });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Reset page when filters change
  const handleMonthChange = (v: string) => {
    setFilterMonth(v);
    setPage(1);
    onMonthChange?.(v);
  };
  const handleCategoryChange = (v: string) => { setFilterCategory(v); setPage(1); };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {availableMonths.length > 0 && (
            <Select value={filterMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[150px] h-10">
                <SelectValue placeholder="All Months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {availableMonths.map((m) => (
                  <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={filterCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[140px] h-10">
              <Filter className="w-4 h-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSort} onValueChange={setFilterSort}>
            <SelectTrigger className="w-[130px] h-10 hidden sm:flex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest first</SelectItem>
              <SelectItem value="date-asc">Oldest first</SelectItem>
              <SelectItem value="amount-desc">Highest {currencyCode}</SelectItem>
              <SelectItem value="amount-asc">Lowest {currencyCode}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  {expenses.length === 0
                    ? "No expenses yet. Add your first expense!"
                    : "No expenses match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((expense) => (
                <TableRow
                  key={expense.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onEdit(expense)}
                >
                  <TableCell className="font-medium">{expense.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="font-normal"
                      style={{
                        backgroundColor: CATEGORY_COLORS[expense.category] + "20",
                        color: CATEGORY_COLORS[expense.category],
                      }}
                    >
                      {expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(expense.date)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {fmt(expense.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(expense.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginated.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {expenses.length === 0
              ? "No expenses yet. Add your first expense!"
              : "No expenses match your filters."}
          </div>
        ) : (
          paginated.map((expense) => (
            <div
              key={expense.id}
              className="bg-card border rounded-xl p-4 cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => setMobileDetail(expense)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{expense.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatDate(expense.date)}
                  </p>
                </div>
                <p className="font-bold tabular-nums ml-3">{fmt(expense.amount)}</p>
              </div>
              <Badge
                variant="secondary"
                className="font-normal mt-2"
                style={{
                  backgroundColor: CATEGORY_COLORS[expense.category] + "20",
                  color: CATEGORY_COLORS[expense.category],
                }}
              >
                {expense.category}
              </Badge>
            </div>
          ))
        )}
      </div>

      {/* Mobile Detail Drawer */}
      <Drawer open={!!mobileDetail} onOpenChange={() => setMobileDetail(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{mobileDetail?.title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-2xl font-bold">{mobileDetail ? fmt(mobileDetail.amount) : ""}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Category</span>
              <Badge
                variant="secondary"
                style={{
                  backgroundColor: CATEGORY_COLORS[mobileDetail?.category || ""] + "20",
                  color: CATEGORY_COLORS[mobileDetail?.category || ""],
                }}
              >
                {mobileDetail?.category}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Date</span>
              <span>{mobileDetail && formatDate(mobileDetail.date)}</span>
            </div>
            {mobileDetail?.note && (
              <div>
                <span className="text-muted-foreground text-sm">Note</span>
                <p className="mt-1">{mobileDetail.note}</p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                onClick={() => { if (mobileDetail) onEdit(mobileDetail); setMobileDetail(null); }}
              >
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button
                variant="destructive"
                className="flex-1 cursor-pointer"
                onClick={() => { if (mobileDetail) { setDeleteId(mobileDetail.id); setMobileDetail(null); } }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline" size="icon" className="h-8 w-8 cursor-pointer"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {safePage} of {totalPages}</span>
          <Button
            variant="outline" size="icon" className="h-8 w-8 cursor-pointer"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) onDelete(deleteId); setDeleteId(null); }}
              className="bg-destructive hover:bg-destructive/90 cursor-pointer"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
