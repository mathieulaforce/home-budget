import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Manage your bank accounts here.
        </p>
      </CardContent>
    </Card>
  );
}
