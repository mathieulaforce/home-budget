# Known Bank CSV Formats

Reference profiles for Belgian and common European bank exports. Add new formats here as they are discovered.

## ING Belgium

```typescript
{
  id: "ing-be",
  name: "ING Belgium",
  dateColumn: "Datum",
  dateFormat: "DD/MM/YYYY",
  descriptionColumns: ["Naam / Omschrijving", "Mededelingen"],
  amountColumn: "Bedrag (EUR)",
  delimiter: ";",
  encoding: "utf-8",
}
```

Notes:
- Amounts use comma as decimal separator (e.g. `-12,50`). Parse with `parseFloat(val.replace(",", "."))`.
- Multiply by 100 and round to get cents.

## KBC Belgium

```typescript
{
  id: "kbc-be",
  name: "KBC Belgium",
  dateColumn: "Datum",
  dateFormat: "DD/MM/YYYY",
  descriptionColumns: ["Omschrijving", "Mededeling"],
  amountColumn: "Bedrag",
  delimiter: ";",
  encoding: "utf-8",
}
```

## Belfius Belgium

```typescript
{
  id: "belfius-be",
  name: "Belfius Belgium",
  dateColumn: "Datum",
  dateFormat: "DD/MM/YYYY",
  descriptionColumns: ["Beschrijving"],
  amountColumn: "Bedrag",
  delimiter: ";",
  encoding: "utf-8",
}
```

## Argenta Belgium

```typescript
{
  id: "argenta-be",
  name: "Argenta Belgium",
  dateColumn: "Boekingsdatum",
  dateFormat: "DD-MM-YYYY",
  descriptionColumns: ["Beschrijving"],
  debitColumn: "Debet",
  creditColumn: "Credit",
  delimiter: ";",
  encoding: "utf-8",
}
```

Notes:
- Uses separate debit/credit columns instead of a single signed amount.
- Both columns contain positive values. Convert debit to negative.

## Adding a New Format

1. Export a sample CSV from the bank
2. Identify: date column, description column(s), amount column(s), delimiter, date format
3. Add a profile object to `src/lib/import/formats.ts`
4. Document it here with any quirks (encoding, decimal separators, skipped rows)
5. Test with a real export file
