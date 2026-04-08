import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBudgets } from "@/lib/queries/budgets";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const MONTH_NAMES: Record<number, string> = {
  1: "Januari",
  2: "Februari",
  3: "Maart",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Augustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "December",
};

function periodLabel(year: number, month: number | null): string {
  if (month != null) return `${MONTH_NAMES[month]} ${year}`;
  return `${year} (yearly)`;
}

export default async function BudgetsPage() {
  const budgets = await getBudgets();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
        <Link href="/budgets/new">
          <Button>
            <Plus data-icon="inline-start" />
            New Budget
          </Button>
        </Link>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No budgets yet. Create your first budget to start tracking
              spending.
            </p>
            <Link href="/budgets/new">
              <Button>
                <Plus data-icon="inline-start" />
                Create Budget
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <Link
              key={budget.id}
              href={`/budgets/${budget.id}`}
              aria-label={`View ${budget.name}`}
            >
              <Card className="transition-colors hover:bg-muted/50 h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-medium">
                    {budget.name}
                  </CardTitle>
                  <Badge variant="secondary">
                    {budget.month != null ? "Monthly" : "Yearly"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatCurrency(budget.totalPlanned)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {periodLabel(budget.year, budget.month)}
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
