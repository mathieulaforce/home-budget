"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { parseFile } from "@/lib/import/parser";
import { detectFormat } from "@/lib/import/formats";
import { buildCategoryRules } from "@/lib/import/categorize";
import { buildImportPreview } from "@/lib/domain/import/service";
import type { ImportPreviewResult, PreviewRow } from "@/lib/domain/import/types";

function serializePreviewResult(
  result: ImportPreviewResult
): SerializedImportPreviewResult {
  return {
    ...result,
    rows: result.rows.map((row) => ({
      ...row,
      date: row.date.toISOString(),
    })),
  };
}

export interface SerializedPreviewRow extends Omit<PreviewRow, "date"> {
  date: string;
}

export interface SerializedImportPreviewResult
  extends Omit<ImportPreviewResult, "rows"> {
  rows: SerializedPreviewRow[];
}

export async function processImportFile(formData: FormData): Promise<
  | { success: true; data: SerializedImportPreviewResult }
  | { success: false; error: string }
> {
  try {
    const file = formData.get("file") as File | null;
    const accountIdStr = formData.get("accountId") as string | null;

    if (!file) return { success: false, error: "No file provided" };
    if (!accountIdStr)
      return { success: false, error: "No account selected" };

    const accountId = parseInt(accountIdStr, 10);
    if (isNaN(accountId))
      return { success: false, error: "Invalid account ID" };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = parseFile(buffer, file.name);

    const detected = detectFormat(parsed.headers);
    if (!detected) {
      return {
        success: false,
        error: `Unrecognized file format. Found columns: ${parsed.headers.join(", ")}`,
      };
    }

    const { format, headerMap } = detected;

    const existingRows = await db
      .select({ hash: transactions.importHash })
      .from(transactions)
      .where(eq(transactions.accountId, accountId));

    const existingHashes = new Set(
      existingRows
        .map((r) => r.hash)
        .filter((h): h is string => h !== null)
    );

    const allCategories = await db.query.categories.findMany();
    const categoryRules = buildCategoryRules(allCategories);

    const preview = buildImportPreview({
      parsed,
      format,
      accountId,
      existingHashes,
      categoryRules,
      headerMap,
    });

    return { success: true, data: serializePreviewResult(preview) };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to process file";
    return { success: false, error: message };
  }
}

const confirmRowSchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  amount: z.number().int(),
  importHash: z.string().length(64),
  categoryId: z.number().int().nullable(),
});

const confirmImportSchema = z.object({
  accountId: z.number().int().positive(),
  rows: z.array(confirmRowSchema).min(1),
});

export async function confirmImport(input: unknown): Promise<
  | { success: true; data: { inserted: number } }
  | { success: false; error: string }
> {
  try {
    const parsed = confirmImportSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid import data" };
    }

    const { accountId, rows } = parsed.data;

    const existingRows = await db
      .select({ hash: transactions.importHash })
      .from(transactions)
      .where(eq(transactions.accountId, accountId));

    const existingHashes = new Set(
      existingRows.map((r) => r.hash).filter((h): h is string => h !== null)
    );

    const toInsert = rows.filter((r) => !existingHashes.has(r.importHash));

    if (toInsert.length === 0) {
      return {
        success: false,
        error: "All transactions are duplicates. Nothing to import.",
      };
    }

    const BATCH_SIZE = 100;
    await db.transaction(async (tx) => {
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        await tx.insert(transactions).values(
          batch.map((row) => ({
            accountId,
            categoryId: row.categoryId,
            date: new Date(row.date),
            description: row.description,
            amount: row.amount,
            importHash: row.importHash,
          }))
        );
      }
    });

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/overview");

    return { success: true, data: { inserted: toInsert.length } };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to import transactions";
    return { success: false, error: message };
  }
}
