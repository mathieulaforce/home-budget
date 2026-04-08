import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StocksPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stocks</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Track your stock portfolio here.
        </p>
      </CardContent>
    </Card>
  );
}
