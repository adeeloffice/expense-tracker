"use client";

import { useState } from "react";
import { useAuthStore, useExpenseStore } from "@/lib/store";
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
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const deleteUser = useAuthStore((s) => s.deleteUser);
  const deleteExpensesForUser = useExpenseStore((s) => s.deleteExpensesForUser);

  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!currentUser) return;
    setError("");
    setIsLoading(true);
    try {
      const result = await deleteUser(currentUser, password);
      if (!result.success) {
        setError(result.error || "Failed to delete account");
        return;
      }
      // Also delete all expenses for this user
      deleteExpensesForUser(currentUser);
      onOpenChange(false);
      setPassword("");
      setConfirmText("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setPassword("");
      setConfirmText("");
      setError("");
    }
    onOpenChange(isOpen);
  };

  const canDelete =
    password.trim().length > 0 &&
    confirmText === "DELETE";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> Delete Account
          </DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone. All your expenses will be deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
            <p className="text-sm font-medium text-destructive">
              Warning: You are about to delete the account
            </p>
            <p className="text-sm font-semibold capitalize">&quot;{currentUser}&quot;</p>
            <p className="text-xs text-muted-foreground">
              All expenses associated with this account will be permanently removed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-password">Confirm Password</Label>
            <Input
              id="delete-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              Type <span className="font-bold text-destructive">DELETE</span> to confirm
            </Label>
            <Input
              id="delete-confirm"
              type="text"
              placeholder='Type "DELETE" here'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="h-11"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || isLoading}
            className="cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete Account
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
