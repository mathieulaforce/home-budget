import { NextResponse } from "next/server";
import { getBudgetWithItems, getBudgetVsActual } from "@/lib/queries/budgets";
import { updateBudgetItemSchema } from "@/lib/validators/budgets";
import {
  updateBudgetItem,
  deleteBudget,
  duplicateBudget,
} from "@/lib/actions/budgets";
import { duplicateBudgetSchema } from "@/lib/validators/budgets";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const budgetId = Number(id);
    if (isNaN(budgetId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const url = new URL(request.url);
    const compare = url.searchParams.get("compare") === "true";

    if (compare) {
      const data = await getBudgetVsActual(budgetId);
      if (!data) {
        return NextResponse.json(
          { error: "Budget not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ data });
    }

    const data = await getBudgetWithItems(budgetId);
    if (!data) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const budgetId = Number(id);
    if (isNaN(budgetId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const url = new URL(request.url);
    if (url.searchParams.get("action") !== "duplicate") {
      return NextResponse.json(
        { error: "Unknown action" },
        { status: 400 }
      );
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

    const parsed = duplicateBudgetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await duplicateBudget(budgetId, parsed.data);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
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
    const budgetId = Number(id);
    if (isNaN(budgetId)) {
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

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 }
      );
    }

    const { itemId, ...rest } = body as Record<string, unknown>;
    const itemIdNum = Number(itemId);
    if (isNaN(itemIdNum)) {
      return NextResponse.json(
        { error: "Invalid item ID" },
        { status: 400 }
      );
    }

    const parsed = updateBudgetItemSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await updateBudgetItem(budgetId, itemIdNum, parsed.data);
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const budgetId = Number(id);
    if (isNaN(budgetId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await deleteBudget(budgetId);
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
