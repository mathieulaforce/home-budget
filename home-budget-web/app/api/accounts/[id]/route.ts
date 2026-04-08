import { NextResponse } from "next/server";
import { getAccountById, getTransactionTotal } from "@/lib/queries/accounts";
import { updateAccountSchema } from "@/lib/validators/accounts";
import { updateAccount, toggleAccountActive } from "@/lib/actions/accounts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accountId = Number(id);
    if (isNaN(accountId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const account = await getAccountById(accountId);
    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const txTotal = await getTransactionTotal(accountId);
    const balance = account.initialBalance + txTotal;
    return NextResponse.json({ data: { ...account, balance } });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// NOTE: This PUT handler accepts partial updates (semantically PATCH behavior).
// The updateAccountSchema uses .partial(), so all fields are optional.
// This is intentional to keep the client simple — a single PUT endpoint
// that accepts any subset of account fields.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accountId = Number(id);
    if (isNaN(accountId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = updateAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await updateAccount(accountId, parsed.data);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accountId = Number(id);
    if (isNaN(accountId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await toggleAccountActive(accountId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
