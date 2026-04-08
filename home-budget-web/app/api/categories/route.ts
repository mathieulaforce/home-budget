import { NextResponse } from "next/server";
import { getCategories } from "@/lib/queries/categories";

export async function GET() {
  try {
    const data = await getCategories();
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
