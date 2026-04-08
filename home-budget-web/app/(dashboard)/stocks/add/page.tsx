import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { HoldingForm } from "@/components/forms/HoldingForm";

export default function AddHoldingPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        href="/stocks"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Portfolio
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Add Holding</CardTitle>
          <CardDescription>
            Add a stock or ETF holding to your portfolio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HoldingForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
