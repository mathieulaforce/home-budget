import { NextResponse } from "next/server";
import { getTransactionById } from "@/lib/queries/transactions";
import { updateTransaction, deleteTransaction } from "@/lib/actions/transactions";
import { updateTransactionSchema } from "@/lib/validators/transactions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const txId = Number(id);
    if (isNaN(txId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const data = await getTransactionById(txId);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const txId = Number(id);
    if (isNaN(txId)) {
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

    const parsed = updateTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await updateTransaction(txId, parsed.data);
    if (!result.success) {
      const status = result.error === "Not found" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const txId = Number(id);
    if (isNaN(txId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await deleteTransaction(txId);
    if (!result.success) {
      const status = result.error === "Not found" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ data: null });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
