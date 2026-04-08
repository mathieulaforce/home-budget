import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPeriodComparison } from "@/lib/queries/comparisons";

const querySchema = z.object({
  type: z.enum(["mom", "yoy"]),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = querySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { type, year, month } = parsed.data;
    const data = await getPeriodComparison(type, year, month);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
