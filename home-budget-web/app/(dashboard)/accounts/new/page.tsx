import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AccountForm } from "@/components/forms/AccountForm";

export default function NewAccountPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Accounts
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Account</CardTitle>
          <CardDescription>
            Add a new bank or investment account to track.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
