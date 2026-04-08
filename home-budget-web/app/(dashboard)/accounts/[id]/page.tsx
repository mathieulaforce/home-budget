import { notFound } from "next/navigation";
import { getAccountById, getTransactionTotal } from "@/lib/queries/accounts";
import { AccountDetailClient } from "./AccountDetailClient";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const accountId = Number(id);
  if (isNaN(accountId)) notFound();

  const account = await getAccountById(accountId);
  if (!account) notFound();

  const txTotal = await getTransactionTotal(accountId);
  const balance = account.initialBalance + txTotal;

  return <AccountDetailClient account={{ ...account, balance }} />;
}
