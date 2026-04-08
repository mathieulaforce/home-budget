import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { BudgetForm } from "@/components/forms/BudgetForm";

export default function NewBudgetPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/budgets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Budgets
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Budget</CardTitle>
          <CardDescription>
            Set planned spending per category for a month or full year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
