import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getHouseholdComparison } from "@/lib/queries/benchmarks";

const querySchema = z.object({
  region: z.enum(["belgium", "flanders", "wallonia", "brussels"]),
  householdSize: z.enum([
    "single",
    "couple",
    "couple_1child",
    "couple_2children",
    "couple_3plus",
    "single_parent",
  ]),
  months: z.coerce.number().int().min(1).max(24),
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

    const { region, householdSize, months, year, month } = parsed.data;
    const data = await getHouseholdComparison(region, householdSize, months, year, month);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
