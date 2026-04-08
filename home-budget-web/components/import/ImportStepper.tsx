"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ImportPreview } from "@/components/import/ImportPreview";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import {
  processImportFile,
  confirmImport,
} from "@/lib/actions/import";
import type {
  SerializedImportPreviewResult,
  SerializedPreviewRow,
} from "@/lib/actions/import";

type Step = "upload" | "preview" | "done";

export function ImportStepper() {
  const [step, setStep] = useState<Step>("upload");
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SerializedImportPreviewResult | null>(null);
  const [previewRows, setPreviewRows] = useState<SerializedPreviewRow[]>([]);
  const [insertedCount, setInsertedCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: categories } = useCategories();

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.toLowerCase().split(".").pop();
    if (!["csv", "xlsx", "xls"].includes(ext ?? "")) {
      toast.error("Ongeldig bestandstype. Gebruik CSV, XLSX of XLS.");
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleUpload = useCallback(() => {
    if (!selectedFile || selectedAccountId === undefined) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", selectedFile);
      formData.set("accountId", String(selectedAccountId));

      const result = await processImportFile(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setPreview(result.data);
      setPreviewRows(result.data.rows);
      setStep("preview");
    });
  }, [selectedFile, selectedAccountId]);

  const handleToggleRow = useCallback((rowKey: string) => {
    setPreviewRows((prev) =>
      prev.map((r) =>
        r.rowKey === rowKey ? { ...r, included: !r.included } : r
      )
    );
  }, []);

  const handleToggleAll = useCallback((included: boolean) => {
    setPreviewRows((prev) =>
      prev.map((r) => (r.isDuplicate ? r : { ...r, included }))
    );
  }, []);

  const handleCategoryChange = useCallback(
    (rowKey: string, categoryId: number | null) => {
      setPreviewRows((prev) =>
        prev.map((r) => (r.rowKey === rowKey ? { ...r, categoryId } : r))
      );
    },
    []
  );

  const handleConfirm = useCallback(() => {
    if (selectedAccountId === undefined) return;

    const included = previewRows.filter(
      (r) => r.included && !r.isDuplicate
    );
    if (included.length === 0) {
      toast.error("Geen transacties geselecteerd om te importeren.");
      return;
    }

    startTransition(async () => {
      const result = await confirmImport({
        accountId: selectedAccountId,
        rows: included.map((r) => ({
          date: r.date,
          description: r.description,
          amount: r.amount,
          importHash: r.importHash,
          categoryId: r.categoryId,
        })),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setInsertedCount(result.data.inserted);
      setStep("done");
    });
  }, [selectedAccountId, previewRows]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setSelectedFile(null);
    setPreview(null);
    setPreviewRows([]);
    setInsertedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const selectedAccountName = accounts?.find(
    (a) => a.id === selectedAccountId
  )?.name;

  const includedCount = previewRows.filter(
    (r) => r.included && !r.isDuplicate
  ).length;

  return (
    <div className="space-y-6">
      <StepIndicator current={step} />

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Bestand uploaden</CardTitle>
            <CardDescription>
              Selecteer een rekening en upload een CSV- of Excel-bestand van je
              bank.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rekening</label>
              <Select
                value={selectedAccountId}
                onValueChange={(val: number | null) => setSelectedAccountId(val ?? undefined)}
                disabled={accountsLoading}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Selecteer een rekening">
                    {selectedAccountName ?? "Selecteer een rekening"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bestand</label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
              >
                {selectedFile ? (
                  <>
                    <FileSpreadsheet className="size-8 text-emerald-600" />
                    <span className="text-sm font-medium">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="size-8 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Sleep een bestand hierheen of klik om te selecteren
                    </span>
                    <span className="text-xs text-muted-foreground">
                      CSV, XLSX of XLS
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
            </div>

            <Button
              onClick={handleUpload}
              disabled={
                !selectedFile ||
                selectedAccountId === undefined ||
                isPending
              }
            >
              {isPending && <Loader2 className="animate-spin" />}
              Bestand verwerken
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "preview" && preview && categories && (
        <div className="space-y-4">
          <Card size="sm">
            <CardContent className="flex flex-wrap items-center gap-4">
              <StatBadge label="Totaal geparsed" value={preview.stats.totalParsed} />
              <StatBadge label="Geldig" value={preview.stats.valid} variant="success" />
              <StatBadge label="Duplicaten" value={preview.stats.duplicates} variant="warning" />
              <StatBadge label="Fouten" value={preview.stats.errors} variant="error" />
              <div className="ml-auto flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  Geselecteerd:{" "}
                  <strong className="text-foreground">{includedCount}</strong>
                </span>
                {preview.format && (
                  <Badge variant="outline">{preview.format.name}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {preview.errors.length > 0 && (
            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="size-4" />
                  {preview.errors.length} rij(en) met fouten
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="max-h-32 space-y-1 overflow-auto text-xs text-muted-foreground">
                  {preview.errors.slice(0, 20).map((err, i) => (
                    <li key={i}>
                      Rij {err.rowIndex}: {err.message}
                    </li>
                  ))}
                  {preview.errors.length > 20 && (
                    <li>... en {preview.errors.length - 20} meer</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}

          <ImportPreview
            rows={previewRows}
            categories={categories}
            onToggleRow={handleToggleRow}
            onToggleAll={handleToggleAll}
            onCategoryChange={handleCategoryChange}
          />

          <div className="flex gap-2">
            <Button
              onClick={handleConfirm}
              disabled={isPending || includedCount === 0}
            >
              {isPending && <Loader2 className="animate-spin" />}
              {includedCount} transacties importeren
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={isPending}>
              Annuleren
            </Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="size-12 text-emerald-600" />
            <h2 className="text-xl font-semibold">Import geslaagd!</h2>
            <p className="text-muted-foreground">
              {insertedCount} transactie{insertedCount !== 1 ? "s" : ""}{" "}
              geïmporteerd naar{" "}
              <strong>{selectedAccountName}</strong>.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                Nog een bestand importeren
              </Button>
              <Button
                render={<a href="/transactions" />}
              >
                Bekijk transacties
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "preview", label: "Voorbeeld" },
    { key: "done", label: "Klaar" },
  ];

  const currentIdx = steps.findIndex((s) => s.key === current);

  return (
    <nav className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          {i > 0 && (
            <div
              className={`h-px w-8 ${i <= currentIdx ? "bg-primary" : "bg-border"}`}
            />
          )}
          <div
            className={`flex size-7 items-center justify-center rounded-full text-xs font-medium ${
              i < currentIdx
                ? "bg-primary text-primary-foreground"
                : i === currentIdx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {i < currentIdx ? (
              <CheckCircle className="size-4" />
            ) : (
              i + 1
            )}
          </div>
          <span
            className={`text-sm ${i === currentIdx ? "font-medium" : "text-muted-foreground"}`}
          >
            {s.label}
          </span>
        </div>
      ))}
    </nav>
  );
}

function StatBadge({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number;
  variant?: "default" | "success" | "warning" | "error";
}) {
  const colors = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    error: "text-red-600 dark:text-red-400",
  };

  return (
    <div className="flex items-baseline gap-1.5 text-sm">
      <span className={`text-lg font-semibold tabular-nums ${colors[variant]}`}>
        {value}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
