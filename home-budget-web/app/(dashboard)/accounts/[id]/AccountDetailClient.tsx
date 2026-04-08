"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, MoreVertical, Power } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { AccountForm } from "@/components/forms/AccountForm";
import { useToggleAccountActive } from "@/hooks/useAccounts";
import type { AccountWithBalance } from "@/hooks/useAccounts";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants/accounts";

export function AccountDetailClient({ account }: { account: AccountWithBalance }) {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();
  const toggleActive = useToggleAccountActive(account.id);

  const handleToggleActive = async () => {
    try {
      await toggleActive.mutateAsync();
      toast.success(
        account.isActive ? "Account deactivated" : "Account activated"
      );
      router.push("/accounts");
    } catch {
      toast.error("Failed to update account status");
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Accounts
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{account.name}</CardTitle>
            <Badge variant="secondary">
              {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil data-icon="inline-start" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" />}
              >
                <MoreVertical />
                <span className="sr-only">More actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleToggleActive}>
                  <Power />
                  {account.isActive ? "Deactivate Account" : "Activate Account"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Balance</p>
            <p
              className={`text-3xl font-bold ${
                account.balance >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(account.balance, account.currency)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">
                {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="font-medium">{account.currency}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Initial Balance</p>
              <p className="font-medium">
                {formatCurrency(account.initialBalance, account.currency)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">{formatDate(account.createdAt)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No transactions yet. Transactions will appear here once added in a
            future update.
          </p>
        </CardContent>
      </Card>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Edit Account</SheetTitle>
            <SheetDescription>
              Update your account details below.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <AccountForm
              key={account.id}
              mode="edit"
              accountId={account.id}
              defaultValues={{
                name: account.name,
                type: account.type,
                currency: account.currency,
                initialBalance: account.initialBalance,
              }}
              onSuccess={() => setEditOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
