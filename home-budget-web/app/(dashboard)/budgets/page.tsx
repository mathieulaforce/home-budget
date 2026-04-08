import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BudgetsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budgets</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Plan and track your budgets here.
        </p>
      </CardContent>
    </Card>
  );
}
