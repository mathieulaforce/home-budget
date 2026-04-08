import { ImportStepper } from "@/components/import/ImportStepper";

export const metadata = {
  title: "Transacties importeren | Home Budget",
};

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Transacties importeren
        </h1>
        <p className="text-muted-foreground">
          Upload een CSV- of Excel-bestand van je bank om transacties te
          importeren.
        </p>
      </div>
      <ImportStepper />
    </div>
  );
}
