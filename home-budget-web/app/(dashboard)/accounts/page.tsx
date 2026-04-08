import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAccountsWithBalances } from "@/lib/queries/accounts";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants/accounts";

export default async function AccountsPage() {
  const accounts = await getAccountsWithBalances();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
        <Button render={<Link href="/accounts/new" />}>
          <Plus data-icon="inline-start" />
          New Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No accounts yet. Create your first account to get started.
            </p>
            <Button render={<Link href="/accounts/new" />}>
              <Plus data-icon="inline-start" />
              Create Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Link key={account.id} href={`/accounts/${account.id}`} aria-label={`View ${account.name}`}>
              <Card className="transition-colors hover:bg-muted/50 h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-medium">
                    {account.name}
                  </CardTitle>
                  <Badge variant="secondary">
                    {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p
                    className={`text-2xl font-bold ${
                      account.balance >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatCurrency(account.balance, account.currency)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
