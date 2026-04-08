"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TransactionForm } from "@/components/forms/TransactionForm";

export default function NewTransactionPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>New Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm
            mode="create"
            onSuccess={() => router.push("/transactions")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
