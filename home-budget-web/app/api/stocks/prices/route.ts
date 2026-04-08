import { NextResponse } from "next/server";
import { refreshPrices } from "@/lib/actions/stocks";
import { getPortfolioHistory } from "@/lib/queries/stocks";

export async function POST() {
  try {
    const result = await refreshPrices();
    if (!result.success) {
      return NextResponse.json({ error: result.data }, { status: 500 });
    }
    return NextResponse.json({ data: result.data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const months = Number(searchParams.get("months") || "12");

    const data = await getPortfolioHistory(months);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
