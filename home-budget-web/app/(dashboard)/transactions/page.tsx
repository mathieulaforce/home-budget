import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TransactionsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          View and manage your transactions here.
        </p>
      </CardContent>
    </Card>
  );
}
