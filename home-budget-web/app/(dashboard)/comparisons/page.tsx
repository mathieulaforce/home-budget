import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ComparisonsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparisons</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Compare your spending against benchmarks here.
        </p>
      </CardContent>
    </Card>
  );
}
