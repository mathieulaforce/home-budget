import { notFound } from "next/navigation";
import { getBudgetVsActual } from "@/lib/queries/budgets";
import { BudgetDetailClient } from "./BudgetDetailClient";

export default async function BudgetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const budgetId = Number(id);
  if (isNaN(budgetId)) notFound();

  const result = await getBudgetVsActual(budgetId);
  if (!result) notFound();

  return <BudgetDetailClient initialData={result} />;
}
